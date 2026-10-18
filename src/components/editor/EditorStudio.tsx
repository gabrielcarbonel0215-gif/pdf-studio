import React, { useState, useEffect, useRef, useCallback } from 'react';
import confetti from 'canvas-confetti';
import {
  AnnotationElement,
  DetectedFontInfo,
  PageNumberConfig,
  PageThumbnail,
  StandardFontFamily,
  TextElement,
  ToolType,
  WatermarkConfig,
} from '../../types/pdf';
import {
  loadPdfJsDocument,
  renderPageToCanvas,
  generateThumbnails,
  extractPageTextItems,
  RenderPageResult,
} from '../../lib/pdfViewer';
import { applyStudioEditsToPdf, downloadFile } from '../../lib/pdfCore';
import EditorToolbar from './EditorToolbar';
import PageSidebar from './PageSidebar';
import PropertiesPanel from './PropertiesPanel';
import FontMatcherOverlay from './FontMatcherOverlay';
import SignatureDialog from './SignatureDialog';
import StampDialog from './StampDialog';
import WatermarkDialog from './WatermarkDialog';
import PageNumberDialog from './PageNumberDialog';
import MobileStudio from '../mobile/MobileStudio';
import StudioDropzone from '../common/StudioDropzone';
import {
  UploadCloud,
  ChevronLeft,
  ChevronRight,
  X,
  Copy,
  Trash2,
  Bold,
  Italic,
  Underline,
  Type,
  Maximize2,
  ZoomIn,
  ZoomOut,
  Undo2,
  Redo2,
  Download,
  Info,
  Check,
  Edit2,
  Layers,
  Camera,
  PenTool,
  Award,
  Sliders,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Palette,
  FileText,
  Search,
} from 'lucide-react';

interface EditorStudioProps {
  initialFile?: File | null;
  onClearFile?: () => void;
}

export default function EditorStudio({ initialFile = null, onClearFile }: EditorStudioProps = {}) {
  const [file, setFile] = useState<File | null>(initialFile);
  const [pdfJsDoc, setPdfJsDoc] = useState<any>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPageIndex, setCurrentPageIndex] = useState<number>(0);
  const [scale, setScale] = useState<number>(1.0);
  const [pageRotations, setPageRotations] = useState<Record<number, number>>({});
  const [thumbnails, setThumbnails] = useState<PageThumbnail[]>([]);

  // Auto-load initialFile when passed
  useEffect(() => {
    if (initialFile && initialFile !== file) {
      loadDocumentFile(initialFile);
    }
  }, [initialFile]);

  // Drawers & Modals
  const [showMobilePagesDrawer, setShowMobilePagesDrawer] = useState<boolean>(false);
  const [showMobileTextEditor, setShowMobileTextEditor] = useState<boolean>(false);
  const [showPageTextListModal, setShowPageTextListModal] = useState<boolean>(false);
  const [textSearchQuery, setTextSearchQuery] = useState<string>('');

  // Annotations & History
  const [annotationsByPage, setAnnotationsByPage] = useState<Record<number, AnnotationElement[]>>({});
  const [history, setHistory] = useState<Record<number, AnnotationElement[]>[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);

  // Tools & Selection
  const [activeTool, setActiveTool] = useState<ToolType>('select');
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [isEditingInlineText, setIsEditingInlineText] = useState<boolean>(false);

  // Mobile Screen Detector (Activates dedicated Android interface)
  const [isMobileScreen, setIsMobileScreen] = useState<boolean>(
    typeof window !== 'undefined' ? window.innerWidth < 1024 : false
  );

  useEffect(() => {
    const handleResize = () => {
      setIsMobileScreen(window.innerWidth < 1024);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Toast Notification Message
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'info' } | null>(null);

  const showToast = (text: string, type: 'success' | 'info' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 2500);
  };

  // Active Font / Style Settings
  const [currentFontSettings, setCurrentFontSettings] = useState<{
    fontFamily: StandardFontFamily;
    fontSize: number;
    fontWeight: 'normal' | 'bold';
    fontStyle: 'normal' | 'italic';
    color: string;
  }>({
    fontFamily: 'Helvetica',
    fontSize: 14,
    fontWeight: 'normal',
    fontStyle: 'normal',
    color: '#000000',
  });

  // Extracted Text Items for Font Detection
  const [detectedTextItems, setDetectedTextItems] = useState<DetectedFontInfo[]>([]);
  const [isLoadingDoc, setIsLoadingDoc] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [showSuccessModal, setShowSuccessModal] = useState<boolean>(false);

  // Modals
  const [showSignatureModal, setShowSignatureModal] = useState<boolean>(false);
  const [showStampModal, setShowStampModal] = useState<boolean>(false);
  const [showWatermarkModal, setShowWatermarkModal] = useState<boolean>(false);
  const [showPageNumberModal, setShowPageNumberModal] = useState<boolean>(false);

  // Global Configs
  const [watermarkConfig, setWatermarkConfig] = useState<WatermarkConfig>({
    enabled: false,
    text: 'CONFIDENCIAL',
    fontFamily: 'Helvetica',
    fontSize: 48,
    color: '#94a3b8',
    opacity: 0.2,
    rotation: -45,
    tiled: false,
    pages: 'all',
  });

  const [pageNumberConfig, setPageNumberConfig] = useState<PageNumberConfig>({
    enabled: false,
    format: 'page_of_total',
    position: 'bottom-center',
    fontSize: 10,
    color: '#475569',
    fontFamily: 'Helvetica',
    startNumber: 1,
    margin: 25,
  });

  // Canvas Refs
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const pageRenderInfo = useRef<RenderPageResult>({
    width: 600,
    height: 800,
    originalWidth: 600,
    originalHeight: 800,
    scale: 1.0,
  });

  // Dragging / Drawing state
  const isDraggingElement = useRef<boolean>(false);
  const dragStartOffset = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Push state to undo history
  const pushHistory = useCallback(
    (newAnnotations: Record<number, AnnotationElement[]>) => {
      setHistory((prev) => {
        const sliced = prev.slice(0, historyIndex + 1);
        return [...sliced, JSON.parse(JSON.stringify(newAnnotations))];
      });
      setHistoryIndex((prev) => prev + 1);
      setAnnotationsByPage(newAnnotations);
    },
    [historyIndex]
  );

  const handleUndo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setAnnotationsByPage(JSON.parse(JSON.stringify(history[newIndex])));
      setSelectedElementId(null);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setAnnotationsByPage(JSON.parse(JSON.stringify(history[newIndex])));
      setSelectedElementId(null);
    }
  };

  // 1. Load File into PDF.js
  const loadDocumentFile = async (selectedFile: File) => {
    setFile(selectedFile);
    setIsLoadingDoc(true);
    try {
      const doc = await loadPdfJsDocument(selectedFile);
      setPdfJsDoc(doc);
      setNumPages(doc.numPages);
      setCurrentPageIndex(0);
      setAnnotationsByPage({});
      setHistory([{}]);
      setHistoryIndex(0);

      // Auto-scale calculation
      const firstPage = await doc.getPage(1);
      const viewport = firstPage.getViewport({ scale: 1.0 });
      if (typeof window !== 'undefined' && window.innerWidth < 768) {
        const fitScale = Math.max(0.4, Math.round(((window.innerWidth - 32) / viewport.width) * 100) / 100);
        setScale(fitScale);
      } else {
        setScale(1.15);
      }

      const thumbs = await generateThumbnails(doc, 140);
      setThumbnails(thumbs);
      showToast('Documento cargado');
    } catch (err) {
      console.error('Error loading PDF:', err);
      showToast('No se pudo cargar el PDF.', 'error');
      setFile(null);
    } finally {
      setIsLoadingDoc(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      await loadDocumentFile(e.target.files[0]);
    }
  };

  // 2. Render Page and Extract Text
  useEffect(() => {
    if (!pdfJsDoc || !canvasRef.current) return;

    let active = true;
    const render = async () => {
      try {
        const rot = pageRotations[currentPageIndex] || 0;
        const renderResult = await renderPageToCanvas(
          pdfJsDoc,
          currentPageIndex + 1,
          canvasRef.current!,
          scale,
          rot
        );

        if (active) {
          pageRenderInfo.current = renderResult;
          const items = await extractPageTextItems(pdfJsDoc, currentPageIndex + 1);
          setDetectedTextItems(items);
        }
      } catch (err) {
        console.error('Error rendering page:', err);
      }
    };

    render();
    return () => {
      active = false;
    };
  }, [pdfJsDoc, currentPageIndex, scale, pageRotations]);

  // Rotate Page
  const handleRotateCurrentPage = (pageIdx: number = currentPageIndex) => {
    const currentRot = pageRotations[pageIdx] || 0;
    const newRot = (currentRot + 90) % 360;
    const updated = { ...pageRotations, [pageIdx]: newRot };
    setPageRotations(updated);

    setThumbnails((prev) =>
      prev.map((t) => (t.pageIndex === pageIdx ? { ...t, rotation: newRot } : t))
    );
    showToast(`Página ${pageIdx + 1} rotada a ${newRot}°`);
  };

  // Add Elements
  const addElementToCurrentPage = (element: AnnotationElement) => {
    const currentPageElements = annotationsByPage[currentPageIndex] || [];
    const newAnnotations = {
      ...annotationsByPage,
      [currentPageIndex]: [...currentPageElements, element],
    };
    pushHistory(newAnnotations);
    setSelectedElementId(element.id);
  };

  // Update Element
  const updateElement = (updated: AnnotationElement) => {
    const currentPageElements = annotationsByPage[currentPageIndex] || [];
    const newAnnotations = {
      ...annotationsByPage,
      [currentPageIndex]: currentPageElements.map((el) => (el.id === updated.id ? updated : el)),
    };
    pushHistory(newAnnotations);
  };

  // Delete Element
  const deleteElement = (id: string) => {
    const currentPageElements = annotationsByPage[currentPageIndex] || [];
    const newAnnotations = {
      ...annotationsByPage,
      [currentPageIndex]: currentPageElements.filter((el) => el.id !== id),
    };
    pushHistory(newAnnotations);
    setSelectedElementId(null);
    setIsEditingInlineText(false);
    setShowMobileTextEditor(false);
    showToast('Elemento eliminado', 'info');
  };

  // Duplicate Element
  const duplicateElement = (el: AnnotationElement) => {
    const duplicated: AnnotationElement = {
      ...JSON.parse(JSON.stringify(el)),
      id: Math.random().toString(36).substring(7),
      x: el.x + 15,
      y: el.y + 15,
    };
    addElementToCurrentPage(duplicated);
    showToast('Elemento duplicado');
  };

  // Direct Text Edit/Replace from clicking text in the PDF
  const handleDirectEditText = (replacement: TextElement) => {
    addElementToCurrentPage(replacement);
    setSelectedElementId(replacement.id);
    setShowMobileTextEditor(true);
    setShowPageTextListModal(false);
    showToast('Texto listo para modificar');
  };

  // Handle Overlay Click
  const handleOverlayMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (activeTool !== 'text' && activeTool !== 'rectangle' && activeTool !== 'circle' && activeTool !== 'line' && activeTool !== 'highlight') {
      return;
    }

    if (!overlayRef.current) return;
    const rect = overlayRef.current.getBoundingClientRect();
    const clickX = (e.clientX - rect.left) / scale;
    const clickY = (e.clientY - rect.top) / scale;

    if (activeTool === 'text') {
      const newText: TextElement = {
        id: Math.random().toString(36).substring(7),
        type: 'text',
        pageIndex: currentPageIndex,
        x: Math.round(clickX),
        y: Math.round(clickY),
        width: 180,
        height: Math.max(30, currentFontSettings.fontSize * 1.5),
        text: 'Escribe tu texto',
        fontFamily: currentFontSettings.fontFamily,
        fontSize: currentFontSettings.fontSize,
        fontWeight: currentFontSettings.fontWeight,
        fontStyle: currentFontSettings.fontStyle,
        color: currentFontSettings.color,
        backgroundColor: 'transparent',
        alignment: 'left',
      };
      addElementToCurrentPage(newText);
      setSelectedElementId(newText.id);
      setActiveTool('select');
      setShowMobileTextEditor(true);
    } else if (activeTool === 'rectangle' || activeTool === 'highlight') {
      const isHighlight = activeTool === 'highlight';
      const newShape = {
        id: Math.random().toString(36).substring(7),
        type: activeTool,
        pageIndex: currentPageIndex,
        x: Math.round(clickX),
        y: Math.round(clickY),
        width: isHighlight ? 160 : 120,
        height: isHighlight ? 22 : 80,
        strokeColor: isHighlight ? '#facc15' : '#2563eb',
        fillColor: isHighlight ? '#facc15' : undefined,
        strokeWidth: isHighlight ? 0 : 2,
        opacity: isHighlight ? 0.4 : 1,
      };
      addElementToCurrentPage(newShape as any);
      setActiveTool('select');
    } else if (activeTool === 'circle') {
      const newCircle = {
        id: Math.random().toString(36).substring(7),
        type: 'circle',
        pageIndex: currentPageIndex,
        x: Math.round(clickX),
        y: Math.round(clickY),
        width: 100,
        height: 100,
        strokeColor: '#2563eb',
        strokeWidth: 2,
        opacity: 1,
      };
      addElementToCurrentPage(newCircle as any);
      setActiveTool('select');
    }
  };

  // Image insertion
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const imgFile = e.target.files[0];
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        const img = new Image();
        img.onload = () => {
          const maxDim = 200;
          const scaleFactor = Math.min(maxDim / img.width, maxDim / img.height, 1);
          const newImgEl = {
            id: Math.random().toString(36).substring(7),
            type: 'image',
            pageIndex: currentPageIndex,
            x: 50,
            y: 50,
            width: Math.round(img.width * scaleFactor),
            height: Math.round(img.height * scaleFactor),
            imageDataUrl: dataUrl,
            opacity: 1,
          };
          addElementToCurrentPage(newImgEl as any);
          setActiveTool('select');
          showToast('Imagen insertada');
        };
        img.src = dataUrl;
      };
      reader.readAsDataURL(imgFile);
    }
  };

  // Save Signature
  const handleSaveSignature = (dataUrl: string) => {
    const img = new Image();
    img.onload = () => {
      const scaleFactor = Math.min(180 / img.width, 80 / img.height, 1);
      const newSig = {
        id: Math.random().toString(36).substring(7),
        type: 'signature',
        pageIndex: currentPageIndex,
        x: 60,
        y: 100,
        width: Math.round(img.width * scaleFactor) || 160,
        height: Math.round(img.height * scaleFactor) || 60,
        imageDataUrl: dataUrl,
        opacity: 1,
      };
      addElementToCurrentPage(newSig as any);
      showToast('Firma digital añadida');
    };
    img.src = dataUrl;
  };

  // Save Stamp
  const handleSelectStamp = (stampData: any) => {
    const newStamp = {
      ...stampData,
      id: Math.random().toString(36).substring(7),
      pageIndex: currentPageIndex,
      x: 80,
      y: 80,
    };
    addElementToCurrentPage(newStamp);
    showToast('Sello oficial aplicado');
  };

  // Final PDF Export & Download
  const handleExportPdf = async () => {
    if (!file) return;
    setIsExporting(true);
    try {
      const newPdfBytes = await applyStudioEditsToPdf(
        file,
        annotationsByPage,
        watermarkConfig,
        pageNumberConfig,
        pageRotations
      );

      const baseName = file.name.replace(/\.[^/.]+$/, '');
      downloadFile(newPdfBytes, `${baseName}_editado.pdf`);

      confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 } });
      setShowSuccessModal(true);
      showToast('¡PDF descargado con éxito!');
    } catch (err) {
      console.error('Error exporting edited PDF:', err);
      showToast('Hubo un error al generar el PDF.', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  const currentPageElements = annotationsByPage[currentPageIndex] || [];
  const selectedElement =
    currentPageElements.find((el) => el.id === selectedElementId) || null;

  // Filtered detected text items for the text list modal
  const filteredTextItems = detectedTextItems.filter((item) =>
    item.text.toLowerCase().includes(textSearchQuery.toLowerCase())
  );

  // If user is on Android / mobile screen and has loaded a document, render dedicated MobileStudio!
  if (file && pdfJsDoc && isMobileScreen) {
    return (
      <MobileStudio
        file={file}
        pdfJsDoc={pdfJsDoc}
        numPages={numPages}
        onClose={() => setFile(null)}
      />
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-studio-desk relative select-none">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-16 left-1/2 transform -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-3 duration-200">
          <div className="bg-stone-900 text-white text-xs font-bold px-4 py-2 rounded-2xl shadow-xl flex items-center gap-2 border border-stone-700">
            {toastMessage.type === 'success' ? (
              <Check size={14} className="text-emerald-400" />
            ) : (
              <Info size={14} className="text-amber-400" />
            )}
            <span>{toastMessage.text}</span>
          </div>
        </div>
      )}

      {!file ? (
        <StudioDropzone
          onFilesSelected={(files) => {
            if (files && files[0]) loadDocumentFile(files[0]);
          }}
          title="Abre un PDF en el Editor Visual"
          subtitle="Haz clic sobre cualquier texto para editarlo con su misma tipografía, añade firmas, sellos o formas."
          buttonText="Seleccionar Archivo PDF"
          icon={<Sparkles size={34} className="text-amber-400" />}
        />
      ) : (
        <div className="flex-1 flex flex-col h-full overflow-hidden">
          {/* Top Document Header Bar (Fixed above canvas - Never covers the PDF) */}
          <div className="bg-[#efece6] border-b border-[#e2e0db] px-4 py-2 flex items-center justify-between shadow-2xs z-20">
            <div className="flex items-center space-x-2 truncate max-w-[180px] sm:max-w-md">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <span className="font-extrabold text-xs text-[#0f172a] truncate">{file.name}</span>
            </div>

            {/* Middle Page Stepper & Drawer Trigger */}
            <div className="flex items-center space-x-1.5">
              <button
                onClick={() => setCurrentPageIndex((p) => Math.max(0, p - 1))}
                disabled={currentPageIndex === 0}
                className="p-1 hover:bg-stone-200/80 rounded-lg disabled:opacity-30 text-stone-700"
              >
                <ChevronLeft size={16} />
              </button>

              <button
                onClick={() => setShowMobilePagesDrawer(true)}
                className="px-2.5 py-1 bg-[#f7f5f0] border border-[#ded7cc] rounded-xl text-xs font-black text-stone-800 shadow-2xs flex items-center gap-1.5"
                title="Ver todas las páginas"
              >
                <Layers size={13} className="text-amber-800" />
                <span>Pág {currentPageIndex + 1} de {numPages}</span>
              </button>

              <button
                onClick={() => setCurrentPageIndex((p) => Math.min(numPages - 1, p + 1))}
                disabled={currentPageIndex === numPages - 1}
                className="p-1 hover:bg-stone-200/80 rounded-lg disabled:opacity-30 text-stone-700"
              >
                <ChevronRight size={16} />
              </button>
            </div>

            {/* Right Close Document */}
            <button
              onClick={() => setFile(null)}
              className="p-1 text-stone-500 hover:text-red-600 rounded-lg transition-colors"
              title="Cerrar documento"
            >
              <X size={16} />
            </button>
          </div>

          {/* Top Toolbar with Text List Button */}
          <EditorToolbar
            activeTool={activeTool}
            setActiveTool={setActiveTool}
            scale={scale}
            setScale={setScale}
            canUndo={historyIndex > 0}
            canRedo={historyIndex < history.length - 1}
            onUndo={handleUndo}
            onRedo={handleRedo}
            onRotatePage={() => handleRotateCurrentPage(currentPageIndex)}
            onOpenSignatureModal={() => setShowSignatureModal(true)}
            onOpenStampModal={() => setShowStampModal(true)}
            onOpenWatermarkModal={() => setShowWatermarkModal(true)}
            onOpenPageNumberModal={() => setShowPageNumberModal(true)}
            onImageUpload={handleImageUpload}
            onExportPdf={handleExportPdf}
            isExporting={isExporting}
            onOpenTextList={() => setShowPageTextListModal(true)}
            detectedTextCount={detectedTextItems.length}
          />

          {/* Main Studio Workspace */}
          <div className="flex-1 flex overflow-hidden relative">
            {/* Desktop Left Page Sidebar */}
            <div className="hidden lg:flex">
              <PageSidebar
                thumbnails={thumbnails}
                currentPageIndex={currentPageIndex}
                onSelectPage={(idx) => setCurrentPageIndex(idx)}
                onRotatePage={handleRotateCurrentPage}
              />
            </div>

            {/* Canvas Viewport (Center) - PURE CLEAN SCROLLABLE CANVAS WITH 0 FLOATING OVERLAYS */}
            <div className="flex-1 overflow-auto bg-studio-desk p-3 sm:p-6 flex flex-col items-center justify-start relative select-none pb-20">
              {/* PDF Canvas Container */}
              <div
                className="relative bg-white shadow-2xl rounded-xs ring-1 ring-stone-400/80 transition-shadow my-2"
                style={{
                  width: `${pageRenderInfo.current.width}px`,
                  height: `${pageRenderInfo.current.height}px`,
                }}
              >
                {/* 1. Underlying High-DPI PDF.js Canvas */}
                <canvas ref={canvasRef} className="absolute inset-0 w-full h-full block" />

                {/* 2. Smart Font Matcher Overlay */}
                <FontMatcherOverlay
                  textItems={detectedTextItems}
                  scale={scale}
                  originalHeight={pageRenderInfo.current.originalHeight}
                  onDirectEditText={handleDirectEditText}
                  pageIndex={currentPageIndex}
                  active={activeTool === 'select'}
                />

                {/* 3. Interactive Annotations & Elements Overlay */}
                <div
                  ref={overlayRef}
                  onMouseDown={handleOverlayMouseDown}
                  className={`absolute inset-0 ${
                    activeTool === 'select'
                      ? 'cursor-default'
                      : activeTool === 'text'
                      ? 'cursor-text'
                      : 'cursor-crosshair'
                  }`}
                >
                  {currentPageElements.map((el) => {
                    const isSelected = el.id === selectedElementId;
                    const screenX = el.x * scale;
                    const screenY = el.y * scale;
                    const screenWidth = el.width * scale;
                    const screenHeight = el.height * scale;

                    return (
                      <div
                        key={el.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedElementId(el.id);
                          if (el.type === 'text') {
                            setShowMobileTextEditor(true);
                          }
                        }}
                        onMouseDown={(e) => {
                          if (activeTool !== 'select') return;
                          e.stopPropagation();
                          setSelectedElementId(el.id);
                          isDraggingElement.current = true;
                          dragStartOffset.current = {
                            x: e.clientX - el.x * scale,
                            y: e.clientY - el.y * scale,
                          };

                          const handleMouseMove = (moveEvent: MouseEvent) => {
                            if (!isDraggingElement.current || !overlayRef.current) return;
                            const newX = (moveEvent.clientX - dragStartOffset.current.x) / scale;
                            const newY = (moveEvent.clientY - dragStartOffset.current.y) / scale;
                            updateElement({
                              ...el,
                              x: Math.round(newX),
                              y: Math.round(newY),
                            });
                          };

                          const handleMouseUp = () => {
                            isDraggingElement.current = false;
                            window.removeEventListener('mousemove', handleMouseMove);
                            window.removeEventListener('mouseup', handleMouseUp);
                          };

                          window.addEventListener('mousemove', handleMouseMove);
                          window.addEventListener('mouseup', handleMouseUp);
                        }}
                        className={`absolute select-none transition-shadow group ${
                          isSelected
                            ? 'ring-2 ring-amber-600 ring-offset-1 shadow-md z-30'
                            : 'hover:ring-1 hover:ring-amber-400/60'
                        }`}
                        style={{
                          left: `${screenX}px`,
                          top: `${screenY}px`,
                          width: `${screenWidth}px`,
                          height: `${screenHeight}px`,
                          opacity: el.opacity ?? 1,
                        }}
                      >
                        {/* Desktop Contextual Mini-Toolbar */}
                        {isSelected && (
                          <div
                            className="hidden lg:flex absolute -top-9 left-0 bg-stone-900 text-white rounded-xl px-2 py-1 items-center gap-1.5 shadow-xl border border-stone-700 z-40 animate-in fade-in zoom-in-95 pointer-events-auto"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {el.type === 'text' && (
                              <button
                                onClick={() => setShowMobileTextEditor(true)}
                                title="Editar texto"
                                className="p-1 hover:bg-stone-800 text-stone-300 hover:text-white rounded-lg flex items-center gap-1 text-[11px] font-semibold"
                              >
                                <Edit2 size={12} />
                                <span>Modificar</span>
                              </button>
                            )}
                            <button
                              onClick={() => duplicateElement(el)}
                              title="Duplicar"
                              className="p-1 hover:bg-stone-800 text-stone-300 hover:text-white rounded-lg"
                            >
                              <Copy size={13} />
                            </button>
                            <button
                              onClick={() => deleteElement(el.id)}
                              title="Eliminar"
                              className="p-1 hover:bg-red-900/60 text-red-400 hover:text-red-200 rounded-lg"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        )}

                        {/* TEXT ELEMENT */}
                        {el.type === 'text' && (
                          <div
                            className="w-full h-full p-0.5 overflow-hidden flex items-center"
                            style={{
                              backgroundColor:
                                (el as TextElement).backgroundColor &&
                                (el as TextElement).backgroundColor !== 'transparent'
                                  ? (el as TextElement).backgroundColor
                                  : undefined,
                              fontFamily:
                                (el as TextElement).fontFamily === 'Times-Roman'
                                  ? 'Times New Roman, serif'
                                  : (el as TextElement).fontFamily === 'Courier'
                                  ? 'Courier New, monospace'
                                  : 'Helvetica, Arial, sans-serif',
                              fontSize: `${(el as TextElement).fontSize * scale}px`,
                              fontWeight: (el as TextElement).fontWeight,
                              fontStyle: (el as TextElement).fontStyle,
                              textDecoration: (el as TextElement).underline ? 'underline' : 'none',
                              color: (el as TextElement).color,
                              textAlign: (el as TextElement).alignment,
                              lineHeight: 1.2,
                            }}
                          >
                            {(el as TextElement).text}
                          </div>
                        )}

                        {/* RECTANGLE / HIGHLIGHT */}
                        {(el.type === 'rectangle' || el.type === 'highlight') && (
                          <div
                            className="w-full h-full"
                            style={{
                              border:
                                el.type === 'highlight'
                                  ? 'none'
                                  : `${(el as any).strokeWidth * scale}px solid ${(el as any).strokeColor}`,
                              backgroundColor: (el as any).fillColor || undefined,
                              opacity: el.type === 'highlight' ? 0.4 : 1,
                            }}
                          />
                        )}

                        {/* CIRCLE */}
                        {el.type === 'circle' && (
                          <div
                            className="w-full h-full rounded-full"
                            style={{
                              border: `${(el as any).strokeWidth * scale}px solid ${(el as any).strokeColor}`,
                              backgroundColor: (el as any).fillColor || undefined,
                            }}
                          />
                        )}

                        {/* LINE / ARROW */}
                        {(el.type === 'line' || el.type === 'arrow') && (
                          <div
                            className="w-full h-full flex items-center justify-center"
                            style={{
                              borderBottom: `${(el as any).strokeWidth * scale}px solid ${(el as any).strokeColor}`,
                            }}
                          />
                        )}

                        {/* SIGNATURE / IMAGE */}
                        {(el.type === 'signature' || el.type === 'image') && (
                          <img
                            src={(el as any).imageDataUrl}
                            alt="Visual"
                            className="w-full h-full object-contain pointer-events-none"
                          />
                        )}

                        {/* STAMP */}
                        {el.type === 'stamp' && (
                          <div
                            className="w-full h-full border-4 rounded-lg flex items-center justify-center p-1 bg-white/90 shadow-sm"
                            style={{ borderColor: (el as any).color || '#dc2626' }}
                          >
                            <span
                              className="font-black uppercase tracking-wider text-center"
                              style={{
                                color: (el as any).color || '#dc2626',
                                fontSize: `${Math.min(screenHeight * 0.45, 18)}px`,
                              }}
                            >
                              {(el as any).text}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Desktop Right Properties Panel */}
            <div className="hidden lg:flex">
              <PropertiesPanel
                selectedElement={selectedElement}
                onUpdateElement={updateElement}
                onDeleteElement={deleteElement}
                onDuplicateElement={duplicateElement}
              />
            </div>
          </div>

          {/* PAGE TEXT LIST MODAL / DRAWER (Guarantees every text line can be edited 100% reliably!) */}
          {showPageTextListModal && (
            <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-[#f7f5f0] rounded-3xl border border-[#ded7cc] max-w-xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
                {/* Header */}
                <div className="p-4 bg-[#eae4d9] border-b border-[#ded7cc] flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="p-2 bg-amber-200 text-amber-950 rounded-xl font-bold">
                      <FileText size={18} />
                    </span>
                    <div>
                      <h3 className="font-black text-stone-900 text-sm">
                        Textos de la Página {currentPageIndex + 1}
                      </h3>
                      <p className="text-xs text-stone-500">
                        {detectedTextItems.length} líneas de texto encontradas
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowPageTextListModal(false)}
                    className="p-1.5 text-stone-500 hover:text-stone-900 rounded-xl hover:bg-stone-200"
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Search Bar */}
                <div className="p-3 border-b border-[#ded7cc] bg-white">
                  <div className="flex items-center space-x-2 bg-[#f4efe8] px-3 py-2 rounded-xl border border-[#ded7cc]">
                    <Search size={15} className="text-stone-400" />
                    <input
                      type="text"
                      value={textSearchQuery}
                      onChange={(e) => setTextSearchQuery(e.target.value)}
                      placeholder="Buscar palabra o frase en esta página..."
                      className="w-full bg-transparent text-xs font-semibold outline-none text-stone-800"
                    />
                    {textSearchQuery && (
                      <button onClick={() => setTextSearchQuery('')} className="text-stone-400 hover:text-stone-700">
                        <X size={13} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Text Items List */}
                <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
                  {filteredTextItems.length === 0 ? (
                    <div className="text-center py-10 text-stone-500 text-xs">
                      No se encontraron textos que coincidan.
                    </div>
                  ) : (
                    filteredTextItems.map((item, idx) => {
                      const topY = Math.max(0, pageRenderInfo.current.originalHeight - item.y - item.height);
                      const replacementElement: TextElement = {
                        id: Math.random().toString(36).substring(7),
                        type: 'text',
                        pageIndex: currentPageIndex,
                        x: Math.round(item.x),
                        y: Math.round(topY),
                        width: Math.max(Math.round(item.width + 10), 60),
                        height: Math.max(Math.round(item.height + 4), Math.round(item.fontSize * 1.3), 20),
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

                      return (
                        <div
                          key={idx}
                          className="p-3 bg-white rounded-2xl border border-[#ded7cc] hover:border-amber-400 shadow-2xs flex items-center justify-between gap-3 group transition-colors"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-stone-900 leading-snug break-words">
                              {item.text}
                            </p>
                            <div className="flex items-center gap-2 mt-1 text-[10px] text-stone-500 font-medium">
                              <span>{item.matchedFamily}</span>
                              <span>•</span>
                              <span>{Math.round(item.fontSize)} pt</span>
                              {item.fontWeight === 'bold' && <span className="font-bold text-stone-700">Negrita</span>}
                            </div>
                          </div>

                          <button
                            onClick={() => handleDirectEditText(replacementElement)}
                            className="px-3 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-950 rounded-xl text-xs font-black shrink-0 flex items-center gap-1.5 transition-colors border border-amber-300"
                          >
                            <Edit2 size={12} />
                            <span>Modificar</span>
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Footer */}
                <div className="p-3.5 bg-[#eae4d9] border-t border-[#ded7cc] flex justify-between items-center text-xs text-stone-600 font-medium">
                  <span>💡 Elige cualquier línea para editar su texto directamente.</span>
                  <button
                    onClick={() => setShowPageTextListModal(false)}
                    className="px-4 py-1.5 bg-stone-900 text-white rounded-xl font-bold text-xs"
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Mobile Sliding Bottom Drawer for Page Thumbnails */}
          {showMobilePagesDrawer && (
            <div className="lg:hidden fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex flex-col justify-end">
              <div className="bg-[#f4efe8] rounded-t-3xl border-t border-[#ded7cc] p-4 max-h-[65vh] flex flex-col shadow-2xl animate-in slide-in-from-bottom duration-200">
                <div className="flex items-center justify-between pb-3 border-b border-[#ded7cc]">
                  <h3 className="font-black text-stone-900 text-sm flex items-center gap-2">
                    <Layers size={16} className="text-amber-800" />
                    <span>Hojas del Documento ({thumbnails.length})</span>
                  </h3>
                  <button
                    onClick={() => setShowMobilePagesDrawer(false)}
                    className="p-1.5 bg-[#eae4d9] text-stone-700 rounded-xl"
                  >
                    <X size={16} />
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-3 overflow-y-auto py-3">
                  {thumbnails.map((thumb) => (
                    <div
                      key={thumb.pageIndex}
                      onClick={() => {
                        setCurrentPageIndex(thumb.pageIndex);
                        setShowMobilePagesDrawer(false);
                      }}
                      className={`polaroid-card rounded-xl p-1.5 flex flex-col items-center gap-1 cursor-pointer ${
                        currentPageIndex === thumb.pageIndex ? 'ring-2 ring-amber-700 bg-white' : ''
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

          {/* DEDICATED TEXT EDIT MODAL / BOTTOM SHEET (Universal for Mobile & Desktop) */}
          {showMobileTextEditor && selectedElement && selectedElement.type === 'text' && (
            <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
              <div className="bg-[#f7f5f0] rounded-t-3xl sm:rounded-3xl border border-[#ded7cc] p-5 shadow-2xl animate-in slide-in-from-bottom sm:zoom-in-95 duration-200 max-h-[90vh] w-full sm:max-w-lg flex flex-col space-y-4">
                {/* Header */}
                <div className="flex items-center justify-between pb-2 border-b border-[#ded7cc]">
                  <div className="flex items-center space-x-2">
                    <span className="p-1.5 bg-amber-100 text-amber-900 rounded-lg">
                      <Type size={16} />
                    </span>
                    <h3 className="font-black text-stone-900 text-sm">Modificar Texto en PDF</h3>
                  </div>
                  <button
                    onClick={() => setShowMobileTextEditor(false)}
                    className="p-1.5 bg-[#eae4d9] text-stone-700 rounded-xl"
                  >
                    <X size={16} />
                  </button>
                </div>

                {/* Text Content Input */}
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-stone-500 mb-1">
                    Nuevo Texto (Reemplazo)
                  </label>
                  <textarea
                    autoFocus
                    value={(selectedElement as TextElement).text}
                    onChange={(e) =>
                      updateElement({ ...selectedElement, text: e.target.value } as TextElement)
                    }
                    rows={3}
                    className="w-full p-3 bg-white border border-[#ded7cc] rounded-2xl text-sm font-semibold text-stone-900 outline-none focus:ring-2 focus:ring-amber-500 shadow-inner"
                    placeholder="Escribe aquí el nuevo texto..."
                  />
                </div>

                {/* Font Controls Row */}
                <div className="grid grid-cols-2 gap-3">
                  {/* Font Family */}
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-stone-500 mb-1">
                      Tipografía
                    </label>
                    <select
                      value={(selectedElement as TextElement).fontFamily}
                      onChange={(e) =>
                        updateElement({
                          ...selectedElement,
                          fontFamily: e.target.value as StandardFontFamily,
                        } as TextElement)
                      }
                      className="w-full p-2.5 bg-white border border-[#ded7cc] rounded-xl text-xs font-bold text-stone-800 outline-none"
                    >
                      <option value="Helvetica">Helvetica (Sans-Serif)</option>
                      <option value="Times-Roman">Times New Roman (Serif)</option>
                      <option value="Courier">Courier (Monoespaciada)</option>
                    </select>
                  </div>

                  {/* Font Size Stepper */}
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-stone-500 mb-1">
                      Tamaño ({Math.round((selectedElement as TextElement).fontSize)} pt)
                    </label>
                    <div className="flex items-center bg-white border border-[#ded7cc] rounded-xl p-1 justify-between">
                      <button
                        onClick={() =>
                          updateElement({
                            ...selectedElement,
                            fontSize: Math.max(6, (selectedElement as TextElement).fontSize - 1),
                          } as TextElement)
                        }
                        className="px-2.5 py-1 bg-[#eae4d9] hover:bg-[#dfd7c8] rounded-lg font-black text-xs"
                      >
                        -
                      </button>
                      <span className="text-xs font-black text-stone-900">
                        {Math.round((selectedElement as TextElement).fontSize)}
                      </span>
                      <button
                        onClick={() =>
                          updateElement({
                            ...selectedElement,
                            fontSize: Math.min(72, (selectedElement as TextElement).fontSize + 1),
                          } as TextElement)
                        }
                        className="px-2.5 py-1 bg-[#eae4d9] hover:bg-[#dfd7c8] rounded-lg font-black text-xs"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>

                {/* Font Styles & Color */}
                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() =>
                        updateElement({
                          ...selectedElement,
                          fontWeight:
                            (selectedElement as TextElement).fontWeight === 'bold' ? 'normal' : 'bold',
                        } as TextElement)
                      }
                      className={`p-2 rounded-xl border text-xs font-bold ${
                        (selectedElement as TextElement).fontWeight === 'bold'
                          ? 'bg-stone-900 text-white border-stone-900'
                          : 'bg-white text-stone-700 border-[#ded7cc]'
                      }`}
                    >
                      <Bold size={15} />
                    </button>
                    <button
                      onClick={() =>
                        updateElement({
                          ...selectedElement,
                          fontStyle:
                            (selectedElement as TextElement).fontStyle === 'italic' ? 'normal' : 'italic',
                        } as TextElement)
                      }
                      className={`p-2 rounded-xl border text-xs font-bold ${
                        (selectedElement as TextElement).fontStyle === 'italic'
                          ? 'bg-stone-900 text-white border-stone-900'
                          : 'bg-white text-stone-700 border-[#ded7cc]'
                      }`}
                    >
                      <Italic size={15} />
                    </button>
                    <button
                      onClick={() =>
                        updateElement({
                          ...selectedElement,
                          underline: !(selectedElement as TextElement).underline,
                        } as TextElement)
                      }
                      className={`p-2 rounded-xl border text-xs font-bold ${
                        (selectedElement as TextElement).underline
                          ? 'bg-stone-900 text-white border-stone-900'
                          : 'bg-white text-stone-700 border-[#ded7cc]'
                      }`}
                      title="Subrayado"
                    >
                      <Underline size={15} />
                    </button>
                  </div>

                  {/* Color Picker */}
                  <div className="flex items-center space-x-1.5">
                    {['#000000', '#dc2626', '#2563eb', '#16a34a', '#d97706'].map((c) => (
                      <button
                        key={c}
                        onClick={() =>
                          updateElement({
                            ...selectedElement,
                            color: c,
                          } as TextElement)
                        }
                        className={`w-6 h-6 rounded-full border-2 transition-transform ${
                          (selectedElement as TextElement).color === c
                            ? 'scale-115 border-stone-900 shadow-xs'
                            : 'border-white'
                        }`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center space-x-3 pt-2">
                  <button
                    onClick={() => deleteElement(selectedElement.id)}
                    className="p-3 bg-rose-100 text-rose-800 rounded-2xl font-black text-xs flex items-center justify-center gap-1.5"
                  >
                    <Trash2 size={16} />
                    <span>Eliminar</span>
                  </button>

                  <button
                    onClick={() => setShowMobileTextEditor(false)}
                    className="flex-1 p-3 bg-stone-900 text-white rounded-2xl font-black text-xs shadow-md flex items-center justify-center gap-2"
                  >
                    <Check size={16} />
                    <span>Listo / Aplicar al PDF</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Dialogs */}
          <SignatureDialog
            isOpen={showSignatureModal}
            onClose={() => setShowSignatureModal(false)}
            onSaveSignature={handleSaveSignature}
          />
          <StampDialog
            isOpen={showStampModal}
            onClose={() => setShowStampModal(false)}
            onSelectStamp={handleSelectStamp}
          />
          <WatermarkDialog
            isOpen={showWatermarkModal}
            onClose={() => setShowWatermarkModal(false)}
            config={watermarkConfig}
            onSaveConfig={setWatermarkConfig}
            totalPages={numPages}
          />
          <PageNumberDialog
            isOpen={showPageNumberModal}
            onClose={() => setShowPageNumberModal(false)}
            config={pageNumberConfig}
            onSaveConfig={setPageNumberConfig}
          />
        </div>
      )}
    </div>
  );
}
