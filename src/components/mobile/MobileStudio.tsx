import React, { useState, useEffect, useRef, useCallback } from 'react';
import confetti from 'canvas-confetti';
import {
  AnnotationElement,
  DetectedFontInfo,
  PageThumbnail,
  StandardFontFamily,
  TextElement,
} from '../../types/pdf';
import {
  renderPageToCanvas,
  generateThumbnails,
  extractPageTextItems,
} from '../../lib/pdfViewer';
import { applyStudioEditsToPdf, downloadFile } from '../../lib/pdfCore';
import {
  X,
  Edit3,
  Type,
  PenTool,
  Download,
  Layers,
  Search,
  Check,
  Trash2,
  Bold,
  Italic,
  Underline,
  RotateCw,
  Hand,
  FileText,
  Eraser,
  Share2,
  Send,
} from 'lucide-react';

interface MobileStudioProps {
  file: File;
  pdfJsDoc: any;
  numPages: number;
  onClose: () => void;
}

export default function MobileStudio({
  file,
  pdfJsDoc,
  numPages,
  onClose,
}: MobileStudioProps) {
  // Current Page Index (0-based)
  const [currentPageIndex, setCurrentPageIndex] = useState<number>(0);

  // Active Mode: 'view' (Pan, Zoom, Swipe pages) vs 'edit' (Highlight & Tap text to edit)
  const [activeMode, setActiveMode] = useState<'view' | 'edit'>('view');
  const [showSuccessModal, setShowSuccessModal] = useState<boolean>(false);

  // Screen fit scale helper
  const getScreenFitScale = useCallback((viewportWidth: number = 595.28) => {
    if (typeof window !== 'undefined') {
      const screenWidth = window.innerWidth;
      return Math.max(0.35, Math.round(((screenWidth - 20) / viewportWidth) * 100) / 100);
    }
    return 0.6;
  }, []);

  const [baseScale, setBaseScale] = useState<number>(() => getScreenFitScale());
  const [zoomLevel, setZoomLevel] = useState<number>(1.0); // 1.0 = 100%, 1.25 = 125%, 1.5 = 150%, 2.0 = 200%

  const [pageRotations, setPageRotations] = useState<Record<number, number>>({});
  const [thumbnails, setThumbnails] = useState<PageThumbnail[]>([]);
  const [detectedTextItems, setDetectedTextItems] = useState<DetectedFontInfo[]>([]);
  const [annotationsByPage, setAnnotationsByPage] = useState<Record<number, AnnotationElement[]>>({});

  // Synchronized Page Dimensions in Points
  const [pageDimensions, setPageDimensions] = useState<{
    width: number;
    height: number;
    originalWidth: number;
    originalHeight: number;
  }>({
    width: 360,
    height: 500,
    originalWidth: 595.28,
    originalHeight: 841.89,
  });

  // Mobile Drawers
  const [activeDrawer, setActiveDrawer] = useState<'none' | 'text_list' | 'edit_text' | 'sign' | 'pages'>('none');
  const [searchFilter, setSearchFilter] = useState<string>('');
  const [isExporting, setIsExporting] = useState<boolean>(false);

  // Element currently open in bottom editor
  const [editingElement, setEditingElement] = useState<TextElement | null>(null);
  const [originalTextReference, setOriginalTextReference] = useState<string>('');
  const [detectedFontName, setDetectedFontName] = useState<string>('');

  // Signature State
  const [sigPoints, setSigPoints] = useState<{ x: number; y: number }[][]>([]);
  const [isDrawingSig, setIsDrawingSig] = useState<boolean>(false);
  const sigCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Canvas & Container Refs
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Touch Gesture Tracking (Swipe & 2-finger Pinch-to-Zoom)
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const initialPinchDist = useRef<number | null>(null);
  const initialZoomOnPinch = useRef<number>(1.0);

  // Initialize Thumbnails once on load
  useEffect(() => {
    if (!pdfJsDoc) return;
    generateThumbnails(pdfJsDoc, 120)
      .then((thumbs) => setThumbnails(thumbs))
      .catch((e) => console.warn('Thumbnail generation warning:', e));
  }, [pdfJsDoc]);

  // Load and Render Page
  useEffect(() => {
    if (!pdfJsDoc) return;
    let active = true;

    const loadPage = async () => {
      try {
        const page = await pdfJsDoc.getPage(currentPageIndex + 1);
        const unscaledViewport = page.getViewport({ scale: 1.0 });
        const fit = getScreenFitScale(unscaledViewport.width);
        setBaseScale(fit);

        // Extract text items immediately with high accuracy
        const items = await extractPageTextItems(pdfJsDoc, currentPageIndex + 1);
        if (active) {
          setDetectedTextItems(items);
        }

        // Render Canvas
        if (canvasRef.current) {
          const rot = pageRotations[currentPageIndex] || 0;
          const result = await renderPageToCanvas(
            pdfJsDoc,
            currentPageIndex + 1,
            canvasRef.current,
            fit,
            rot
          );

          if (canvasRef.current) {
            canvasRef.current.style.width = '100%';
            canvasRef.current.style.height = '100%';
          }

          if (active) {
            setPageDimensions({
              width: result.width,
              height: result.height,
              originalWidth: result.originalWidth,
              originalHeight: result.originalHeight,
            });
          }
        }
      } catch (err) {
        console.error('Error loading mobile page:', err);
      }
    };

    loadPage();
    return () => {
      active = false;
    };
  }, [pdfJsDoc, currentPageIndex, pageRotations, getScreenFitScale]);

  // Total scale factor for coordinate math
  const totalScale = baseScale * zoomLevel;
  const displayWidth = Math.round(pageDimensions.width * zoomLevel);
  const displayHeight = Math.round(pageDimensions.height * zoomLevel);

  // Open Editor for a detected text item (preserving exact font characteristics)
  const openTextEditorForItem = (item: DetectedFontInfo) => {
    const topY = Math.max(0, pageDimensions.originalHeight - item.y - item.fontSize * 1.08);
    const charWidth = item.fontSize * 0.60;
    const estimatedWidth = Math.max(Math.round(item.width + 10), Math.round(item.text.length * charWidth + 10));

    const newElement: TextElement = {
      id: Math.random().toString(36).substring(7),
      type: 'text',
      pageIndex: currentPageIndex,
      x: Math.round(item.x - 2),
      y: Math.round(topY),
      width: estimatedWidth,
      height: Math.max(Math.round(item.fontSize * 1.35), 20),
      text: item.text,
      fontFamily: item.matchedFamily,
      fontSize: Math.max(8, Math.round(item.fontSize)),
      fontWeight: item.fontWeight,
      fontStyle: item.fontStyle,
      color: item.color || '#000000',
      backgroundColor: '#ffffff',
      backgroundOpacity: 1,
      alignment: 'left',
      isCoveringOldText: true,
    };

    setOriginalTextReference(item.text);
    setDetectedFontName(item.originalFontName || item.matchedFamily);
    setEditingElement(newElement);
    setActiveDrawer('edit_text');
  };

  // Touch / Click handler on the document card (Proximity Detection)
  const handleCardClick = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    if (activeMode !== 'edit') return;
    const card = containerRef.current;
    if (!card) return;

    const rect = card.getBoundingClientRect();
    let clientX = 0;
    let clientY = 0;

    if ('touches' in e && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else if ('changedTouches' in e && e.changedTouches.length > 0) {
      clientX = e.changedTouches[0].clientX;
      clientY = e.changedTouches[0].clientY;
    } else if ('clientX' in e) {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    } else {
      return;
    }

    const clickX = clientX - rect.left;
    const clickY = clientY - rect.top;

    // Convert to PDF point coordinates
    const touchPdfX = clickX / totalScale;
    const touchPdfY = pageDimensions.originalHeight - clickY / totalScale;

    if (detectedTextItems.length === 0) {
      openFreeTextCreator();
      return;
    }

    // Find nearest text line with generous thumb tolerance
    let bestItem: DetectedFontInfo | null = null;
    let minDistance = Infinity;

    for (const item of detectedTextItems) {
      let dx = 0;
      if (touchPdfX < item.x) {
        dx = item.x - touchPdfX;
      } else if (touchPdfX > item.x + item.width) {
        dx = touchPdfX - (item.x + item.width);
      }

      const lineCenterY = item.y + item.height * 0.4;
      const dy = Math.abs(touchPdfY - lineCenterY);
      const distance = Math.hypot(dx, dy * 1.5);

      if (distance < minDistance) {
        minDistance = distance;
        bestItem = item;
      }
    }

    // If within 60 pt radius (~2.5 cm on phone screen)
    if (bestItem && minDistance < 60) {
      openTextEditorForItem(bestItem);
    } else {
      setActiveDrawer('text_list');
    }
  };

  // Open Free Text Creator
  const openFreeTextCreator = () => {
    const newElement: TextElement = {
      id: Math.random().toString(36).substring(7),
      type: 'text',
      pageIndex: currentPageIndex,
      x: 30,
      y: 80,
      width: 220,
      height: 32,
      text: '',
      fontFamily: 'Helvetica',
      fontSize: 14,
      fontWeight: 'normal',
      fontStyle: 'normal',
      color: '#000000',
      backgroundColor: '#ffffff',
      alignment: 'left',
    };
    setOriginalTextReference('');
    setDetectedFontName('Helvetica');
    setEditingElement(newElement);
    setActiveDrawer('edit_text');
  };

  // Save / Update Annotation
  const saveAnnotation = (element: AnnotationElement) => {
    const current = annotationsByPage[currentPageIndex] || [];
    const exists = current.some((el) => el.id === element.id);
    const updated = exists
      ? current.map((el) => (el.id === element.id ? element : el))
      : [...current, element];

    setAnnotationsByPage((prev) => ({
      ...prev,
      [currentPageIndex]: updated,
    }));
  };

  // Delete Annotation
  const deleteAnnotation = (id: string) => {
    const current = annotationsByPage[currentPageIndex] || [];
    setAnnotationsByPage((prev) => ({
      ...prev,
      [currentPageIndex]: current.filter((el) => el.id !== id),
    }));
    setActiveDrawer('none');
    setEditingElement(null);
  };

  // Apply Changes from Bottom Editor Sheet
  const handleApplyChanges = () => {
    if (editingElement && editingElement.text.trim().length > 0) {
      const charWidth = editingElement.fontSize * 0.60;
      const autoWidth = Math.max(editingElement.width, Math.round(editingElement.text.length * charWidth + 10));

      saveAnnotation({
        ...editingElement,
        width: autoWidth,
      });
    }
    setActiveDrawer('none');
    setEditingElement(null);
  };

  // Export and Download PDF
  const handleExportPdf = async () => {
    setIsExporting(true);
    try {
      const newPdfBytes = await applyStudioEditsToPdf(
        file,
        annotationsByPage,
        { enabled: false, text: '', fontFamily: 'Helvetica', fontSize: 30, color: '#000', opacity: 0.2, rotation: 0, tiled: false, pages: 'all' },
        { enabled: false, format: 'page_of_total', position: 'bottom-center', fontSize: 10, color: '#000', fontFamily: 'Helvetica', startNumber: 1, margin: 20 },
        pageRotations
      );
      const baseName = file.name.replace(/\.[^/.]+$/, '');
      downloadFile(newPdfBytes, `${baseName}_editado.pdf`);
      confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 } });
    } catch (err) {
      console.error('Error exporting PDF:', err);
      alert('Error al descargar el PDF.');
    } finally {
      setIsExporting(false);
    }
  };

  // Direct Share via WhatsApp / Android Native Share
  const handleSharePdf = async () => {
    setIsExporting(true);
    try {
      const newPdfBytes = await applyStudioEditsToPdf(
        file,
        annotationsByPage,
        { enabled: false, text: '', fontFamily: 'Helvetica', fontSize: 30, color: '#000', opacity: 0.2, rotation: 0, tiled: false, pages: 'all' },
        { enabled: false, format: 'page_of_total', position: 'bottom-center', fontSize: 10, color: '#000', fontFamily: 'Helvetica', startNumber: 1, margin: 20 },
        pageRotations
      );
      const baseName = file.name.replace(/\.[^/.]+$/, '');
      const fileName = `${baseName}_editado.pdf`;
      const pdfFile = new File([newPdfBytes], fileName, { type: 'application/pdf' });

      if (typeof navigator !== 'undefined' && navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
        await navigator.share({
          files: [pdfFile],
          title: fileName,
          text: 'Documento PDF editado con PDF Studio Pro',
        });
        confetti({ particleCount: 60, spread: 60, origin: { y: 0.6 } });
      } else {
        // Fallback: Download file
        downloadFile(newPdfBytes, fileName);
        confetti({ particleCount: 60, spread: 60, origin: { y: 0.6 } });
        alert('Archivo listo. Se ha descargado a tu teléfono para que puedas adjuntarlo en WhatsApp.');
      }
    } catch (err: any) {
      if (err && err.name !== 'AbortError') {
        console.error('Error sharing PDF:', err);
        alert('No se pudo compartir el archivo.');
      }
    } finally {
      setIsExporting(false);
    }
  };

  // Android / Mobile Browser Back Button Interceptor
  useEffect(() => {
    if (activeDrawer !== 'none' || showMobileTextEditor) {
      if (typeof window !== 'undefined') {
        window.history.pushState({ mobileDrawerOpen: true }, '');
      }
    }
  }, [activeDrawer, showMobileTextEditor]);

  useEffect(() => {
    const handleAndroidBack = (e: PopStateEvent) => {
      if (showMobileTextEditor) {
        setShowMobileTextEditor(false);
      } else if (activeDrawer !== 'none') {
        setActiveDrawer('none');
      } else {
        onClose();
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('popstate', handleAndroidBack);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('popstate', handleAndroidBack);
      }
    };
  }, [activeDrawer, showMobileTextEditor, onClose]);

  // Multi-Touch Pinch-to-Zoom & Swipe Handling
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      initialPinchDist.current = Math.hypot(dx, dy);
      initialZoomOnPinch.current = zoomLevel;
    } else if (activeMode === 'view' && zoomLevel <= 1.05 && e.touches.length === 1) {
      touchStartX.current = e.touches[0].clientX;
      touchStartY.current = e.touches[0].clientY;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && initialPinchDist.current !== null) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const currentDist = Math.hypot(dx, dy);
      const scaleFactor = currentDist / initialPinchDist.current;
      const newZoom = Math.min(3.0, Math.max(0.7, Math.round(initialZoomOnPinch.current * scaleFactor * 20) / 20));
      setZoomLevel(newZoom);
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (e.touches.length < 2) {
      initialPinchDist.current = null;
    }
    if (activeMode === 'view' && zoomLevel <= 1.05 && touchStartX.current !== null && touchStartY.current !== null && e.changedTouches.length === 1) {
      const touchEndX = e.changedTouches[0].clientX;
      const touchEndY = e.changedTouches[0].clientY;
      const diffX = touchStartX.current - touchEndX;
      const diffY = touchStartY.current - touchEndY;

      if (Math.abs(diffX) > 45 && Math.abs(diffX) > Math.abs(diffY) * 1.3) {
        if (diffX > 0 && currentPageIndex < numPages - 1) {
          setCurrentPageIndex((p) => p + 1);
        } else if (diffX < 0 && currentPageIndex > 0) {
          setCurrentPageIndex((p) => p - 1);
        }
      }
    }
    touchStartX.current = null;
    touchStartY.current = null;
  };

  // Filtered detected text items for the text list drawer
  const filteredTextList = detectedTextItems.filter((item) =>
    item.text.toLowerCase().includes(searchFilter.toLowerCase())
  );

  const currentPageAnnotations = annotationsByPage[currentPageIndex] || [];

  return (
    <div className="fixed inset-0 z-50 bg-[#f4efe8] flex flex-col font-sans select-none overflow-hidden">
      {/* 1. TOP NATIVE HEADER */}
      <header className="bg-[#efece6] border-b border-[#e2e0db] px-3 py-2 flex items-center justify-between shadow-2xs z-30 shrink-0">
        {/* Left: Close Button & Document Title */}
        <div className="flex items-center space-x-2 truncate max-w-[130px]">
          <button
            onClick={onClose}
            className="p-1.5 bg-[#e4e1db] rounded-xl text-stone-700 hover:text-red-600 transition-colors"
            title="Cerrar documento"
          >
            <X size={17} />
          </button>
          <span className="text-xs font-black text-[#18181b] truncate">
            {file.name}
          </span>
        </div>

        {/* Center: Mode Pill Selector (Navegar vs Editar Texto) */}
        <div className="flex items-center bg-[#e4e1db] p-0.5 rounded-2xl border border-[#d8d4ce]">
          <button
            onClick={() => setActiveMode('view')}
            className={`px-3 py-1.5 rounded-xl text-[11px] font-black flex items-center gap-1.5 transition-all ${
              activeMode === 'view'
                ? 'bg-[#18181b] text-white shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <Hand size={12} />
            <span>Navegar</span>
          </button>

          <button
            onClick={() => setActiveMode('edit')}
            className={`px-3 py-1.5 rounded-xl text-[11px] font-black flex items-center gap-1.5 transition-all ${
              activeMode === 'edit'
                ? 'bg-[#18181b] text-white shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <Edit3 size={12} />
            <span>Editar Texto</span>
          </button>
        </div>

        {/* Right: Share & Download Buttons */}
        <div className="flex items-center space-x-1.5">
          <button
            onClick={handleSharePdf}
            disabled={isExporting}
            className="px-2.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-black shadow-xs flex items-center gap-1 active:scale-95 transition-transform"
            title="Compartir directo por WhatsApp"
          >
            <Share2 size={13} />
            <span className="hidden xs:inline">WhatsApp</span>
          </button>

          <button
            onClick={handleExportPdf}
            disabled={isExporting}
            className="px-3 py-1.5 bg-[#18181b] text-white rounded-xl text-xs font-black shadow-xs flex items-center gap-1.5 disabled:opacity-50 active:scale-95 transition-transform"
          >
            {isExporting ? (
              <div className="w-3.5 h-3.5 border-2 border-stone-200 border-t-transparent rounded-full animate-spin" />
            ) : (
              <Download size={13} />
            )}
            <span>Guardar</span>
          </button>
        </div>
      </header>

      {/* 2. SUB-HEADER: CENTERED CRISP ZOOM CONTROLS */}
      <div className="bg-[#e4e1db]/80 px-3 py-1.5 flex items-center justify-center border-b border-[#d8d4ce] shrink-0">
        <div className="flex items-center space-x-1.5 bg-[#f9f8f6] px-3 py-1 rounded-xl border border-[#e2e0db] shadow-2xs">
          <button
            onClick={() => setZoomLevel((z) => Math.max(0.7, Math.round((z - 0.2) * 10) / 10))}
            className="text-stone-700 px-2 py-0.5 hover:text-black font-black text-sm active:scale-95 transition-transform"
            title="Reducir"
          >
            -
          </button>
          <span className="text-[11px] font-black text-[#18181b] min-w-[38px] text-center">
            {Math.round(zoomLevel * 100)}%
          </span>
          <button
            onClick={() => setZoomLevel((z) => Math.min(3.0, Math.round((z + 0.2) * 10) / 10))}
            className="text-stone-700 px-2 py-0.5 hover:text-black font-black text-sm active:scale-95 transition-transform"
            title="Aumentar"
          >
            +
          </button>
          {zoomLevel !== 1.0 && (
            <button
              onClick={() => setZoomLevel(1.0)}
              className="text-[10px] bg-[#e4e1db] hover:bg-stone-300 px-2 py-0.5 rounded-lg text-stone-800 font-bold ml-1 transition-colors"
            >
              Ajustar
            </button>
          )}
        </div>
      </div>

      {/* 3. MAIN CLEAN VIEWPORT (Multi-Touch Pinch Zoom & 2D Pan, Clean WYSIWYG Document View) */}
      <main
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="flex-1 overflow-auto p-3 flex flex-col items-center justify-start bg-studio-desk pb-24 touch-pan-x touch-pan-y"
      >
        {/* PDF Page Canvas Card */}
        <div
          ref={containerRef}
          onClick={handleCardClick}
          className={`relative bg-white shadow-xl rounded-xs ring-1 ring-stone-300 mx-auto my-1 ${
            activeMode === 'edit' ? 'cursor-pointer' : ''
          }`}
          style={{
            width: `${displayWidth}px`,
            height: `${displayHeight}px`,
            minWidth: `${displayWidth}px`,
            minHeight: `${displayHeight}px`,
          }}
        >
          {/* 1. Underlying High-DPI PDF.js Canvas */}
          <canvas
            ref={canvasRef}
            className="absolute inset-0 block pointer-events-none"
            style={{ width: '100%', height: '100%' }}
          />

          {/* 2. PURELY VISUAL CELESTE PASTEL HIGHLIGHTS (pointer-events-none, delicate & ultra-transparent) */}
          {activeMode === 'edit' && (
            <div className="absolute inset-0 z-30 pointer-events-none">
              {detectedTextItems.map((item, idx) => {
                const screenX = (item.x - 2) * totalScale;
                const screenY = (pageDimensions.originalHeight - item.y - item.fontSize * 1.08) * totalScale;
                const screenW = (item.width + 6) * totalScale;
                const screenH = Math.max(item.fontSize * 1.35 * totalScale, 18);

                return (
                  <div
                    key={idx}
                    className="absolute bg-sky-400/12 border-b border-sky-400/35 rounded-xs pointer-events-none transition-opacity duration-200"
                    style={{
                      left: `${screenX}px`,
                      top: `${screenY}px`,
                      width: `${screenW}px`,
                      height: `${screenH}px`,
                    }}
                  />
                );
              })}
            </div>
          )}

          {/* 3. Render Applied User Modifications on Top (100% True-to-PDF WYSIWYG preview, seamless white background) */}
          <div className="absolute inset-0 z-40 pointer-events-auto">
            {currentPageAnnotations.map((el) => {
              const screenX = el.x * totalScale;
              const screenY = el.y * totalScale;
              const screenWidth = el.width * totalScale;
              const screenHeight = el.height * totalScale;

              if (el.type === 'text') {
                const textEl = el as TextElement;
                return (
                  <div
                    key={el.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      setOriginalTextReference('');
                      setEditingElement(textEl);
                      setActiveDrawer('edit_text');
                    }}
                    className="absolute cursor-pointer flex items-center px-0.5 select-none"
                    style={{
                      left: `${screenX}px`,
                      top: `${screenY}px`,
                      width: `${screenWidth}px`,
                      height: `${screenHeight}px`,
                      backgroundColor: textEl.backgroundColor || '#ffffff',
                    }}
                  >
                    <span
                      className="whitespace-nowrap overflow-visible select-none"
                      style={{
                        fontFamily:
                          textEl.fontFamily === 'Times-Roman'
                            ? 'Times New Roman, Georgia, serif'
                            : textEl.fontFamily === 'Courier'
                            ? 'Courier New, monospace'
                            : 'Arial, Helvetica, sans-serif',
                        fontSize: `${textEl.fontSize * totalScale}px`,
                        fontWeight: textEl.fontWeight,
                        fontStyle: textEl.fontStyle,
                        textDecoration: textEl.underline ? 'underline' : 'none',
                        color: textEl.color || '#000000',
                        lineHeight: 1.15,
                      }}
                    >
                      {textEl.text}
                    </span>
                  </div>
                );
              }

              if (el.type === 'signature' || el.type === 'image') {
                return (
                  <img
                    key={el.id}
                    src={(el as any).imageDataUrl}
                    alt="Firma"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteAnnotation(el.id);
                    }}
                    className="absolute object-contain pointer-events-auto border border-stone-700 rounded"
                    style={{
                      left: `${screenX}px`,
                      top: `${screenY}px`,
                      width: `${screenWidth}px`,
                      height: `${screenHeight}px`,
                    }}
                  />
                );
              }

              return null;
            })}
          </div>
        </div>
      </main>

      {/* 4. MODERN FLOATING THUMB ACTION BAR (Ergonomic for Android, with Hojas centrally placed) */}
      <footer className="fixed bottom-3 left-3 right-3 z-40 bg-[#efece6]/95 backdrop-blur-md border border-[#e2e0db] rounded-2xl shadow-xl px-2 py-1.5 flex items-center justify-around">
        {/* Action 1: Tocar para Editar */}
        <button
          onClick={() => {
            if (activeMode === 'view') {
              setActiveMode('edit');
            } else {
              setActiveDrawer('text_list');
            }
          }}
          className={`flex flex-col items-center py-1 px-2.5 rounded-xl transition-all ${
            activeMode === 'edit'
              ? 'bg-stone-900 text-white shadow-xs'
              : 'text-stone-800 hover:bg-stone-200'
          }`}
        >
          <Edit3 size={17} />
          <span className="text-[10px] font-black mt-0.5">
            {activeMode === 'edit' ? 'Tocar Texto' : 'Editar'}
          </span>
        </button>

        {/* Action 2: Explorar Frases */}
        <button
          onClick={() => setActiveDrawer('text_list')}
          className="flex flex-col items-center py-1 px-2.5 rounded-xl text-stone-800 hover:bg-stone-200 transition-all"
        >
          <div className="relative">
            <FileText size={17} className="text-stone-800" />
            {detectedTextItems.length > 0 && (
              <span className="absolute -top-1 -right-2 bg-stone-700 text-white rounded-full text-[9px] font-black w-3.5 h-3.5 flex items-center justify-center">
                {detectedTextItems.length}
              </span>
            )}
          </div>
          <span className="text-[10px] font-black mt-0.5">Explorar</span>
        </button>

        {/* Action 3: HOJAS (Centrally Placed & Thumb-Friendly) */}
        <button
          onClick={() => setActiveDrawer('pages')}
          className="flex flex-col items-center py-1 px-3 rounded-xl bg-stone-200/80 hover:bg-stone-300 text-stone-900 font-black shadow-2xs border border-stone-300/80 active:scale-95 transition-all"
        >
          <div className="flex items-center gap-1">
            <Layers size={16} className="text-stone-900" />
            <span className="text-[11px] font-black">{currentPageIndex + 1}/{numPages}</span>
          </div>
          <span className="text-[9px] font-bold mt-0.5 text-stone-700">Hojas</span>
        </button>

        {/* Action 4: + Texto Libre */}
        <button
          onClick={openFreeTextCreator}
          className="flex flex-col items-center py-1 px-2.5 rounded-xl text-stone-800 hover:bg-stone-200 transition-all"
        >
          <Type size={17} className="text-stone-800" />
          <span className="text-[10px] font-black mt-0.5">+ Texto</span>
        </button>

        {/* Action 5: Firmar */}
        <button
          onClick={() => setActiveDrawer('sign')}
          className="flex flex-col items-center py-1 px-2.5 rounded-xl text-stone-800 hover:bg-stone-200 transition-all"
        >
          <PenTool size={17} className="text-stone-800" />
          <span className="text-[10px] font-black mt-0.5">Firmar</span>
        </button>

        {/* Action 6: Compartir directo */}
        <button
          onClick={handleSharePdf}
          disabled={isExporting}
          className="flex flex-col items-center py-1 px-2 rounded-xl text-emerald-800 hover:bg-emerald-100/70 active:scale-95 transition-all"
          title="Compartir directo por WhatsApp"
        >
          <Share2 size={17} className="text-emerald-800" />
          <span className="text-[10px] font-black mt-0.5">Enviar</span>
        </button>

        {/* Action 7: Rotar */}
        <button
          onClick={() => {
            const current = pageRotations[currentPageIndex] || 0;
            const next = (current + 90) % 360;
            setPageRotations((prev) => ({ ...prev, [currentPageIndex]: next }));
          }}
          className="flex flex-col items-center py-1 px-2 rounded-xl text-stone-800 hover:bg-stone-200 transition-all"
          title="Rotar 90°"
        >
          <RotateCw size={17} className="text-stone-800" />
          <span className="text-[10px] font-black mt-0.5">Rotar</span>
        </button>
      </footer>

      {/* ======================= ANDROID NATIVE BOTTOM SHEETS ======================= */}

      {/* BOTTOM SHEET 1: ERGONOMIC TEXT MODIFIER */}
      {activeDrawer === 'edit_text' && editingElement && (
        <div
          className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs flex flex-col justify-end"
          style={{ zIndex: 60 }}
        >
          <div className="bg-[#f7f5f0] rounded-t-3xl border-t border-[#ded7cc] p-4 max-h-[90vh] flex flex-col space-y-3.5 shadow-2xl animate-in slide-in-from-bottom duration-200">
            {/* Header */}
            <div className="flex items-center justify-between pb-2 border-b border-[#ded7cc]">
              <div className="flex items-center space-x-2">
                <span className="p-1.5 bg-stone-200 text-stone-900 rounded-xl">
                  <Edit3 size={16} />
                </span>
                <div>
                  <h3 className="font-black text-stone-900 text-sm">Modificar Texto</h3>
                  <p className="text-[10px] text-stone-500">
                    {detectedFontName ? `Fuente detectada: ${detectedFontName}` : 'Reemplaza el texto en su posición exacta'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveDrawer('none')}
                className="p-1.5 bg-[#eae4d9] text-stone-700 rounded-xl"
              >
                <X size={16} />
              </button>
            </div>

            {/* Original Text Reference (if replacing existing text) */}
            {originalTextReference && (
              <div className="p-2.5 bg-[#eae4d9]/70 rounded-xl border border-[#ded7cc] text-[11px] text-stone-700">
                <span className="text-[9px] font-black uppercase text-stone-500 block mb-0.5">
                  Texto original:
                </span>
                <p className="font-bold text-stone-800 italic line-through opacity-75 truncate">
                  "{originalTextReference}"
                </p>
              </div>
            )}

            {/* New Text Input */}
            <div>
              <label className="block text-[10px] font-black uppercase text-stone-600 mb-1">
                Escribe el Nuevo Texto:
              </label>
              <textarea
                autoFocus
                value={editingElement.text}
                onChange={(e) => setEditingElement({ ...editingElement, text: e.target.value })}
                rows={3}
                className="w-full p-3 bg-white border border-stone-300 focus:border-stone-800 rounded-2xl text-sm font-bold text-stone-900 outline-none shadow-inner"
                placeholder="Escribe aquí el texto de reemplazo..."
              />
            </div>

            {/* Typography Pill Selector */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[10px] font-black uppercase text-stone-600">
                  Tipografía:
                </label>
                {detectedFontName && (
                  <span className="text-[9px] text-stone-500 font-bold">
                    Detectada: {editingElement.fontFamily}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'Helvetica', label: 'Helvetica / Arial', style: 'Sans-Serif' },
                  { id: 'Times-Roman', label: 'Times New Roman', style: 'Serif' },
                  { id: 'Courier', label: 'Courier', style: 'Mono' },
                ].map((font) => (
                  <button
                    key={font.id}
                    onClick={() =>
                      setEditingElement({
                        ...editingElement,
                        fontFamily: font.id as StandardFontFamily,
                      })
                    }
                    className={`p-2 rounded-xl text-center border transition-all ${
                      editingElement.fontFamily === font.id
                        ? 'bg-stone-900 text-white border-stone-900 shadow-xs font-black'
                        : 'bg-white text-stone-700 border-[#ded7cc] hover:bg-stone-50'
                    }`}
                  >
                    <span className="block text-xs font-bold truncate">{font.label}</span>
                    <span className="block text-[9px] opacity-70">{font.style}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Size & Format Row */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              {/* Size Stepper */}
              <div>
                <label className="block text-[10px] font-black uppercase text-stone-600 mb-1">
                  Tamaño ({Math.round(editingElement.fontSize)} pt)
                </label>
                <div className="flex items-center bg-white border border-[#ded7cc] rounded-xl p-1 justify-between">
                  <button
                    onClick={() =>
                      setEditingElement({
                        ...editingElement,
                        fontSize: Math.max(6, editingElement.fontSize - 1),
                      })
                    }
                    className="px-3 py-1.5 bg-[#eae4d9] rounded-lg font-black text-xs"
                  >
                    -
                  </button>
                  <span className="text-xs font-black text-stone-900">
                    {Math.round(editingElement.fontSize)} pt
                  </span>
                  <button
                    onClick={() =>
                      setEditingElement({
                        ...editingElement,
                        fontSize: Math.min(72, editingElement.fontSize + 1),
                      })
                    }
                    className="px-3 py-1.5 bg-[#eae4d9] rounded-lg font-black text-xs"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Bold / Italic & Color */}
              <div>
                <label className="block text-[10px] font-black uppercase text-stone-600 mb-1">
                  Estilo & Color
                </label>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1.5">
                    <button
                      onClick={() =>
                        setEditingElement({
                          ...editingElement,
                          fontWeight: editingElement.fontWeight === 'bold' ? 'normal' : 'bold',
                        })
                      }
                      className={`p-2 rounded-xl border text-xs font-bold ${
                        editingElement.fontWeight === 'bold'
                          ? 'bg-stone-900 text-white border-stone-900'
                          : 'bg-white text-stone-700 border-[#ded7cc]'
                      }`}
                    >
                      <Bold size={14} />
                    </button>
                    <button
                      onClick={() =>
                        setEditingElement({
                          ...editingElement,
                          fontStyle: editingElement.fontStyle === 'italic' ? 'normal' : 'italic',
                        })
                      }
                      className={`p-2 rounded-xl border text-xs font-bold ${
                        editingElement.fontStyle === 'italic'
                          ? 'bg-stone-900 text-white border-stone-900'
                          : 'bg-white text-stone-700 border-[#ded7cc]'
                      }`}
                    >
                      <Italic size={14} />
                    </button>
                    <button
                      onClick={() =>
                        setEditingElement({
                          ...editingElement,
                          underline: !editingElement.underline,
                        })
                      }
                      className={`p-2 rounded-xl border text-xs font-bold ${
                        editingElement.underline
                          ? 'bg-stone-900 text-white border-stone-900'
                          : 'bg-white text-stone-700 border-[#ded7cc]'
                      }`}
                      title="Subrayado"
                    >
                      <Underline size={14} />
                    </button>
                  </div>

                  {/* Colors */}
                  <div className="flex items-center space-x-1">
                    {['#000000', '#dc2626', '#2563eb', '#16a34a'].map((c) => (
                      <button
                        key={c}
                        onClick={() => setEditingElement({ ...editingElement, color: c })}
                        className={`w-5 h-5 rounded-full border-2 transition-transform ${
                          editingElement.color === c ? 'scale-115 border-stone-900' : 'border-white'
                        }`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center space-x-2.5 pt-2">
              <button
                onClick={() => deleteAnnotation(editingElement.id)}
                className="p-3 bg-rose-100 text-rose-900 rounded-2xl font-black text-xs flex items-center justify-center gap-1"
              >
                <Trash2 size={15} />
                <span>Borrar</span>
              </button>

              <button
                onClick={handleApplyChanges}
                className="flex-1 p-3.5 bg-stone-900 hover:bg-stone-800 text-white rounded-2xl font-black text-xs shadow-md flex items-center justify-center gap-2"
              >
                <Check size={16} className="text-emerald-400" />
                <span>Reemplazar en PDF</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BOTTOM SHEET 2: TEXT LIST EXPLORER */}
      {activeDrawer === 'text_list' && (
        <div
          className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs flex flex-col justify-end"
          style={{ zIndex: 60 }}
        >
          <div className="bg-[#f7f5f0] rounded-t-3xl border-t border-[#ded7cc] p-4 max-h-[85vh] flex flex-col shadow-2xl animate-in slide-in-from-bottom duration-200">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[#ded7cc]">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-stone-200 text-stone-900 rounded-xl font-bold">
                  <FileText size={17} />
                </div>
                <div>
                  <h3 className="font-black text-stone-900 text-sm">
                    Frases de la Página {currentPageIndex + 1}
                  </h3>
                  <p className="text-[11px] text-stone-500">
                    {detectedTextItems.length} textos detectados • Toca cualquiera para editar
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveDrawer('none')}
                className="p-1.5 bg-[#eae4d9] text-stone-700 rounded-xl"
              >
                <X size={18} />
              </button>
            </div>

            {/* Search Box */}
            <div className="py-2.5">
              <div className="flex items-center space-x-2 bg-white px-3 py-2 rounded-xl border border-[#ded7cc]">
                <Search size={15} className="text-stone-400" />
                <input
                  type="text"
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  placeholder="Buscar frase en esta hoja..."
                  className="w-full bg-transparent text-xs font-semibold outline-none text-stone-800"
                />
                {searchFilter && (
                  <button onClick={() => setSearchFilter('')} className="text-stone-400">
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>

            {/* List of detected text items */}
            <div className="flex-1 overflow-y-auto space-y-2 py-1">
              {filteredTextList.length === 0 ? (
                <div className="text-center py-8 text-stone-500 text-xs">
                  No se encontraron frases que coincidan.
                </div>
              ) : (
                filteredTextList.map((item, idx) => (
                  <div
                    key={idx}
                    onClick={() => {
                      setActiveDrawer('none');
                      openTextEditorForItem(item);
                    }}
                    className="p-3 bg-white rounded-2xl border border-[#ded7cc] active:border-stone-500 active:bg-stone-50 shadow-2xs flex items-center justify-between gap-3 cursor-pointer"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-stone-900 leading-snug break-words">
                        {item.text}
                      </p>
                      <span className="text-[10px] text-stone-400 font-medium">
                        {item.matchedFamily} • {Math.round(item.fontSize)} pt
                      </span>
                    </div>
                    <span className="px-3 py-1.5 bg-stone-100 text-stone-900 rounded-xl text-xs font-black shrink-0 border border-stone-300">
                      Editar
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* BOTTOM SHEET 3: FULLSCREEN SIGNATURE PAD */}
      {activeDrawer === 'sign' && (
        <div
          className="fixed inset-0 bg-stone-900/70 backdrop-blur-xs flex flex-col justify-end"
          style={{ zIndex: 60 }}
        >
          <div className="bg-[#f7f5f0] rounded-t-3xl border-t border-[#ded7cc] p-4 max-h-[85vh] flex flex-col space-y-3 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-[#ded7cc]">
              <h3 className="font-black text-stone-900 text-sm flex items-center gap-1.5">
                <PenTool size={16} className="text-stone-800" />
                <span>Dibuja tu Firma con el Dedo</span>
              </h3>
              <button onClick={() => setActiveDrawer('none')} className="p-1.5 bg-[#eae4d9] rounded-xl">
                <X size={16} />
              </button>
            </div>

            {/* Signature Canvas */}
            <div className="w-full h-44 bg-white rounded-2xl border-2 border-dashed border-stone-300 relative overflow-hidden touch-none">
              <canvas
                ref={sigCanvasRef}
                width={340}
                height={170}
                onTouchStart={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const touch = e.touches[0];
                  const pt = { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
                  setSigPoints((prev) => [...prev, [pt]]);
                  setIsDrawingSig(true);
                }}
                onTouchMove={(e) => {
                  if (!isDrawingSig) return;
                  const rect = e.currentTarget.getBoundingClientRect();
                  const touch = e.touches[0];
                  const pt = { x: touch.clientX - rect.left, y: touch.clientY - rect.top };

                  setSigPoints((prev) => {
                    const next = [...prev];
                    next[next.length - 1].push(pt);
                    return next;
                  });

                  const ctx = sigCanvasRef.current?.getContext('2d');
                  if (ctx) {
                    ctx.strokeStyle = '#0f172a';
                    ctx.lineWidth = 2.5;
                    ctx.lineCap = 'round';
                    ctx.lineTo(pt.x, pt.y);
                    ctx.stroke();
                  }
                }}
                onTouchEnd={() => setIsDrawingSig(false)}
                className="w-full h-full block"
              />
              <span className="absolute bottom-2 right-3 text-[10px] text-stone-400 font-semibold pointer-events-none">
                Área de firma
              </span>
            </div>

            {/* Signature Actions */}
            <div className="flex items-center space-x-2.5">
              <button
                onClick={() => {
                  setSigPoints([]);
                  const ctx = sigCanvasRef.current?.getContext('2d');
                  if (ctx) ctx.clearRect(0, 0, 340, 170);
                }}
                className="p-3 bg-[#eae4d9] text-stone-800 rounded-2xl font-bold text-xs flex items-center justify-center gap-1.5"
              >
                <Eraser size={15} />
                <span>Limpiar</span>
              </button>

              <button
                onClick={() => {
                  if (sigCanvasRef.current) {
                    const dataUrl = sigCanvasRef.current.toDataURL('image/png');
                    const newSig = {
                      id: Math.random().toString(36).substring(7),
                      type: 'signature',
                      pageIndex: currentPageIndex,
                      x: 40,
                      y: 150,
                      width: 140,
                      height: 60,
                      imageDataUrl: dataUrl,
                      opacity: 1,
                    };
                    saveAnnotation(newSig as any);
                  }
                  setActiveDrawer('none');
                }}
                className="flex-1 p-3 bg-stone-900 text-white rounded-2xl font-black text-xs shadow-md flex items-center justify-center gap-1.5"
              >
                <Check size={15} />
                <span>Insertar Firma</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BOTTOM SHEET 4: PAGE SELECTOR DRAWER */}
      {activeDrawer === 'pages' && (
        <div
          className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs flex flex-col justify-end"
          style={{ zIndex: 60 }}
        >
          <div className="bg-[#f7f5f0] rounded-t-3xl border-t border-[#ded7cc] p-4 max-h-[70vh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between pb-2.5 border-b border-[#ded7cc]">
              <h3 className="font-black text-stone-900 text-sm flex items-center gap-1.5">
                <Layers size={16} className="text-stone-800" />
                <span>Hojas del Documento ({thumbnails.length})</span>
              </h3>
              <button onClick={() => setActiveDrawer('none')} className="p-1.5 bg-[#eae4d9] rounded-xl">
                <X size={16} />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3 overflow-y-auto py-3">
              {thumbnails.map((thumb) => (
                <div
                  key={thumb.pageIndex}
                  onClick={() => {
                    setCurrentPageIndex(thumb.pageIndex);
                    setActiveDrawer('none');
                  }}
                  className={`polaroid-card rounded-xl p-1.5 flex flex-col items-center gap-1 cursor-pointer ${
                    currentPageIndex === thumb.pageIndex ? 'ring-2 ring-stone-800 bg-white' : ''
                  }`}
                >
                  <img
                    src={thumb.thumbnailUrl}
                    alt={`Pág ${thumb.pageIndex + 1}`}
                    className="max-h-[85px] object-contain rounded"
                  />
                  <span className="text-[10px] font-bold text-stone-700">
                    Pág {thumb.pageIndex + 1}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
