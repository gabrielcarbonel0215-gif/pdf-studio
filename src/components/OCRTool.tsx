import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { loadPdfJsDocument, extractAllTextFromPdf, renderPageToCanvas } from '../lib/pdfViewer';
import { performOcr, OcrProgress } from '../lib/ocrEngine';
import { downloadFile, convertTextToPdf } from '../lib/pdfCore';
import { useToast } from './common/Toast';
import {
  UploadCloud,
  File as FileIcon,
  Search,
  Copy,
  Download,
  Check,
  Sparkles,
  RefreshCw,
  FileText,
  Image as ImageIcon,
  Clipboard,
  Layers,
  RotateCw,
  X,
  ArrowRight,
  Zap,
  Camera,
} from 'lucide-react';

export default function OCRTool() {
  const { showToast } = useToast();
  const [loadedFile, setLoadedFile] = useState<File | null>(null);
  const [fileType, setFileType] = useState<'pdf' | 'image' | null>(null);

  // PDF state
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [extractedPages, setExtractedPages] = useState<{ pageNumber: number; text: string }[]>([]);
  const [activePdfSubTab, setActivePdfSubTab] = useState<'digital' | 'ocr'>('digital');
  const [ocrPage, setOcrPage] = useState<number>(1);

  // Image state
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageRotation, setImageRotation] = useState<number>(0);

  // OCR Execution state
  const [ocrLanguage, setOcrLanguage] = useState<'spa' | 'eng' | 'spa+eng'>('spa+eng');
  const [ocrProgress, setOcrProgress] = useState<OcrProgress | null>(null);
  const [ocrResultText, setOcrResultText] = useState<string>('');
  const [isProcessingOcr, setIsProcessingOcr] = useState<boolean>(false);

  // Search & Copy
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [isLoadingDoc, setIsLoadingDoc] = useState<boolean>(false);

  // Global Ctrl+V listener to paste images directly from clipboard
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (e.clipboardData && e.clipboardData.files && e.clipboardData.files.length > 0) {
        const files = Array.from(e.clipboardData.files);
        const imageFile = files.find((f) => f.type.startsWith('image/'));
        if (imageFile) {
          processImageFile(imageFile);
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);

  const processImageFile = (file: File) => {
    setLoadedFile(file);
    setFileType('image');
    setOcrResultText('');
    setImageRotation(0);

    const reader = new FileReader();
    reader.onload = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const processPdfFile = async (file: File) => {
    setLoadedFile(file);
    setFileType('pdf');
    setIsLoadingDoc(true);
    setOcrResultText('');

    try {
      const doc = await loadPdfJsDocument(file);
      setPdfDoc(doc);
      const pagesText = await extractAllTextFromPdf(doc);
      setExtractedPages(pagesText);
      setOcrPage(1);
    } catch (err) {
      console.error('Error extracting text from PDF:', err);
      showToast('No se pudo procesar el PDF.', 'error');
      resetAll();
    } finally {
      setIsLoadingDoc(false);
    }
  };

  const handleUniversalFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    const file = e.target.files[0];

    if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
      processPdfFile(file);
    } else if (file.type.startsWith('image/')) {
      processImageFile(file);
    } else {
      showToast('Por favor selecciona un archivo PDF o una imagen (PNG, JPG, WebP).', 'info');
    }
  };

  const resetAll = () => {
    setLoadedFile(null);
    setFileType(null);
    setPdfDoc(null);
    setExtractedPages([]);
    setImagePreview(null);
    setOcrResultText('');
    setImageRotation(0);
    setOcrProgress(null);
  };

  const handleRunImageOcr = async () => {
    if (!imagePreview) return;
    setIsProcessingOcr(true);
    setOcrProgress({ status: 'Escaneando foto con IA...', progress: 0.1 });

    try {
      const img = new Image();
      img.src = imagePreview;
      await new Promise((res) => {
        img.onload = res;
      });

      const canvas = document.createElement('canvas');
      if (imageRotation === 90 || imageRotation === 270) {
        canvas.width = img.naturalHeight;
        canvas.height = img.naturalWidth;
      } else {
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
      }

      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.save();
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((imageRotation * Math.PI) / 180);
      ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
      ctx.restore();

      const result = await performOcr(canvas, ocrLanguage, (p) => {
        setOcrProgress(p);
      });

      setOcrResultText(result.text || 'No se detectó texto legible en la imagen.');
      confetti({ particleCount: 70, spread: 60, origin: { y: 0.7 } });
      showToast('¡Texto extraído con éxito!');
    } catch (err) {
      console.error('Image OCR Error:', err);
      showToast('Hubo un error al extraer el texto de la imagen.', 'error');
    } finally {
      setIsProcessingOcr(false);
      setOcrProgress(null);
    }
  };

  const handleRunPdfOcr = async () => {
    if (!pdfDoc) return;
    setIsProcessingOcr(true);
    setOcrProgress({ status: 'Renderizando página para escaneo...', progress: 0.1 });

    try {
      const canvas = document.createElement('canvas');
      await renderPageToCanvas(pdfDoc, ocrPage, canvas, 2.0);

      const result = await performOcr(canvas, ocrLanguage, (p) => {
        setOcrProgress(p);
      });

      setOcrResultText(result.text || 'No se detectó texto en esta página.');
      confetti({ particleCount: 60, spread: 50, origin: { y: 0.7 } });
      showToast('¡Texto extraído de la página!');
    } catch (err) {
      console.error('OCR Error:', err);
      showToast('Hubo un error al ejecutar el OCR sobre el PDF.', 'error');
    } finally {
      setIsProcessingOcr(false);
      setOcrProgress(null);
    }
  };

  const allDigitalPdfText = extractedPages
    .map((p) => `--- PÁGINA ${p.pageNumber} ---\n${p.text}`)
    .join('\n\n');

  const activeText =
    fileType === 'pdf'
      ? activePdfSubTab === 'digital'
        ? allDigitalPdfText
        : ocrResultText
      : ocrResultText;

  const handleCopyText = () => {
    if (!activeText) return;
    navigator.clipboard.writeText(activeText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExportTxt = () => {
    if (!activeText) return;
    const baseName = loadedFile?.name.replace(/\.[^/.]+$/, '') || 'texto_extraido';
    const blob = new Blob([activeText], { type: 'text/plain;charset=utf-8' });
    downloadFile(blob, `${baseName}_ocr.txt`, 'text/plain');
  };

  const handleExportPdfFromText = async () => {
    if (!activeText) return;
    const baseName = loadedFile?.name.replace(/\.[^/.]+$/, '') || 'texto_extraido';
    const bytes = await convertTextToPdf(activeText, `Texto Extraído - ${baseName}`);
    downloadFile(bytes, `${baseName}_digital.pdf`);
    confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
  };

  return (
    <div className="flex-1 overflow-y-auto bg-studio-desk p-6 md:p-10 select-none">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-black tracking-tight text-stone-900 flex items-center gap-2">
              <Camera size={24} className="text-amber-600" />
              <span>OCR de Fotos & Documentos</span>
            </h2>
            <p className="text-xs sm:text-sm text-stone-600 mt-0.5">
              Sube una foto o PDF, o pega directamente una captura de pantalla con <kbd className="px-1.5 py-0.5 bg-white border border-stone-300 rounded font-mono font-bold text-stone-800">Ctrl + V</kbd>.
            </p>
          </div>
        </div>

        {/* ===================== EMPTY STATE: POLAROID TRAY ===================== */}
        {!loadedFile ? (
          <div className="space-y-6">
            {/* Polaroid Camera Drop Tray */}
            <div className="polaroid-card rounded-3xl p-10 md:p-14 text-center relative group">
              <input
                type="file"
                accept="application/pdf, image/png, image/jpeg, image/webp, image/bmp"
                onChange={handleUniversalFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
              />

              <div className="w-20 h-20 bg-stone-100 rounded-3xl border border-stone-200 flex items-center justify-center mx-auto mb-4 group-hover:rotate-3 transition-transform duration-300 shadow-inner">
                <Camera size={38} className="text-amber-600" />
              </div>

              <h3 className="text-xl font-black text-stone-900 mb-1">
                Coloca tu Foto, Captura o Documento PDF
              </h3>
              <p className="text-xs sm:text-sm text-stone-500 max-w-md mx-auto mb-6">
                Arrastra aquí cualquier imagen o archivo, o haz clic para explorar en tu equipo.
              </p>

              <div className="inline-flex items-center gap-2 bg-stone-900 hover:bg-stone-800 text-white px-7 py-3.5 rounded-2xl text-xs font-bold shadow-md transition-all">
                <span>Seleccionar Archivo</span>
              </div>

              <div className="mt-8 pt-5 border-t border-stone-100 flex items-center justify-center gap-2 text-xs text-stone-600 font-medium">
                <Clipboard size={14} className="text-amber-600" />
                <span>
                  ¿Tienes una captura en el portapapeles? Presiona <kbd className="px-2 py-0.5 bg-stone-100 border border-stone-300 rounded-lg font-mono font-bold text-stone-800">Ctrl + V</kbd> para pegarla al instante.
                </span>
              </div>
            </div>

            {/* Quick Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {/* Mobile Camera Direct Button */}
              <label className="polaroid-card rounded-2xl p-4.5 cursor-pointer flex items-center gap-3.5 group">
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleUniversalFileChange}
                  className="hidden"
                />
                <div className="p-3 bg-emerald-100/80 text-emerald-900 rounded-xl group-hover:scale-110 transition-transform">
                  <Camera size={22} />
                </div>
                <div className="flex-1">
                  <h4 className="font-black text-stone-900 text-xs group-hover:text-emerald-800 transition-colors">
                    Tomar Foto con Cámara
                  </h4>
                  <p className="text-[11px] text-stone-500 mt-0.5">
                    Abre la cámara de tu teléfono y escanea al instante
                  </p>
                </div>
                <ArrowRight size={14} className="text-stone-400 group-hover:text-emerald-700 transition-colors" />
              </label>

              <label className="polaroid-card rounded-2xl p-4.5 cursor-pointer flex items-center gap-3.5 group">
                <input
                  type="file"
                  accept="image/png, image/jpeg, image/webp, image/bmp"
                  onChange={handleUniversalFileChange}
                  className="hidden"
                />
                <div className="p-3 bg-amber-100/80 text-amber-900 rounded-xl group-hover:scale-110 transition-transform">
                  <ImageIcon size={22} />
                </div>
                <div className="flex-1">
                  <h4 className="font-black text-stone-900 text-xs group-hover:text-amber-800 transition-colors">
                    Galería de Fotos (PNG, JPG)
                  </h4>
                  <p className="text-[11px] text-stone-500 mt-0.5">
                    Recibos, documentos o capturas guardadas
                  </p>
                </div>
                <ArrowRight size={14} className="text-stone-400 group-hover:text-amber-700 transition-colors" />
              </label>

              <label className="polaroid-card rounded-2xl p-4.5 cursor-pointer flex items-center gap-3.5 group sm:col-span-2 md:col-span-1">
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={handleUniversalFileChange}
                  className="hidden"
                />
                <div className="p-3 bg-[#eae4d9] text-stone-800 rounded-xl group-hover:scale-110 transition-transform">
                  <FileText size={22} />
                </div>
                <div className="flex-1">
                  <h4 className="font-black text-stone-900 text-xs group-hover:text-stone-950 transition-colors">
                    Documento PDF
                  </h4>
                  <p className="text-[11px] text-stone-500 mt-0.5">
                    Archivos PDF escaneados o digitales
                  </p>
                </div>
                <ArrowRight size={14} className="text-stone-400 group-hover:text-stone-800 transition-colors" />
              </label>
            </div>
          </div>
        ) : fileType === 'image' ? (
          /* ===================== VIEW 1: IMAGE POLAROID WORKSPACE ===================== */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Polaroid Photo Frame */}
            <div className="lg:col-span-5 space-y-4">
              <div className="polaroid-card rounded-3xl p-5 space-y-4 relative -rotate-0.5">
                <div className="flex items-center justify-between pb-2 border-b border-stone-100">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-black text-stone-800 truncate max-w-[170px]">
                      {loadedFile.name || 'Captura Pegada'}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setImageRotation((r) => (r + 90) % 360)}
                      title="Rotar foto 90°"
                      className="p-2 text-stone-600 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 rounded-xl transition-colors"
                    >
                      <RotateCw size={14} />
                    </button>
                    <button
                      onClick={resetAll}
                      className="text-xs px-2.5 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-600 rounded-xl font-bold"
                    >
                      Cambiar
                    </button>
                  </div>
                </div>

                {/* Photo window inside Polaroid */}
                {imagePreview && (
                  <div className="w-full bg-stone-900 rounded-xl overflow-hidden min-h-[220px] max-h-[300px] flex items-center justify-center p-2 shadow-inner">
                    <img
                      src={imagePreview}
                      alt="Foto Polaroid"
                      className="max-w-full max-h-[280px] object-contain transition-transform duration-200 rounded"
                      style={{ transform: `rotate(${imageRotation}deg)` }}
                    />
                  </div>
                )}

                {/* Language Picker & OCR Action */}
                <div className="space-y-3 pt-2">
                  <div>
                    <label className="block text-[11px] uppercase font-bold tracking-wider text-stone-400 mb-1.5">
                      Idioma de Reconocimiento
                    </label>
                    <select
                      value={ocrLanguage}
                      onChange={(e) => setOcrLanguage(e.target.value as any)}
                      className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-200 rounded-xl outline-none font-bold text-stone-800"
                    >
                      <option value="spa+eng">Español + Inglés</option>
                      <option value="spa">Solo Español</option>
                      <option value="eng">Solo Inglés</option>
                    </select>
                  </div>

                  <button
                    onClick={handleRunImageOcr}
                    disabled={isProcessingOcr}
                    className="w-full flex items-center justify-center space-x-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-stone-950 py-3.5 px-4 rounded-2xl text-xs font-black shadow-md transition-all hover:scale-102"
                  >
                    {isProcessingOcr ? (
                      <div className="w-4 h-4 border-2 border-stone-950 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Sparkles size={16} />
                    )}
                    <span>{isProcessingOcr ? 'Escaneando texto con IA...' : 'Extraer Texto de esta Foto'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Right Column: OCR Result Display */}
            <div className="lg:col-span-7 polaroid-card rounded-3xl p-5 flex flex-col justify-between space-y-4 rotate-0.5">
              <div className="flex items-center justify-between pb-3 border-b border-stone-100">
                <span className="text-xs font-black text-stone-700 uppercase tracking-wider flex items-center gap-1.5">
                  <FileText size={15} className="text-amber-600" />
                  Texto Extraído de la Foto
                </span>

                {ocrResultText && (
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={handleCopyText}
                      className="flex items-center space-x-1 px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs font-bold transition-colors"
                    >
                      {copied ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                      <span>{copied ? '¡Copiado!' : 'Copiar'}</span>
                    </button>
                    <button
                      onClick={handleExportTxt}
                      className="flex items-center space-x-1 bg-stone-900 hover:bg-stone-800 text-white px-3 py-1.5 rounded-xl text-xs font-bold shadow-xs transition-colors"
                    >
                      <Download size={13} />
                      <span>TXT</span>
                    </button>
                    <button
                      onClick={handleExportPdfFromText}
                      className="flex items-center space-x-1 bg-amber-500 hover:bg-amber-400 text-stone-950 px-3 py-1.5 rounded-xl text-xs font-black shadow-xs transition-colors"
                    >
                      <FileText size={13} />
                      <span>PDF</span>
                    </button>
                  </div>
                )}
              </div>

              {ocrProgress && (
                <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl space-y-1.5">
                  <div className="flex justify-between items-center text-xs font-bold text-amber-900">
                    <span>{ocrProgress.status}</span>
                    <span>{Math.round(ocrProgress.progress * 100)}%</span>
                  </div>
                  <div className="w-full bg-amber-200 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-amber-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${Math.round(ocrProgress.progress * 100)}%` }}
                    />
                  </div>
                </div>
              )}

              <div className="flex-1 min-h-[300px]">
                <textarea
                  value={ocrResultText}
                  onChange={(e) => setOcrResultText(e.target.value)}
                  placeholder="Presiona 'Extraer Texto de esta Foto' para ver el texto escaneado aquí..."
                  rows={14}
                  className="w-full h-full p-4 bg-stone-50 border border-stone-200 rounded-2xl font-mono text-xs text-stone-800 leading-relaxed outline-none focus:ring-2 focus:ring-amber-500 resize-none"
                />
              </div>
            </div>
          </div>
        ) : (
          /* ===================== VIEW 2: PDF LOADED WORKSPACE ===================== */
          <div className="polaroid-card rounded-3xl p-6 space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-stone-100">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 bg-stone-100 text-stone-800 rounded-2xl">
                  <FileText size={20} />
                </div>
                <div>
                  <p className="text-sm font-black text-stone-900">{loadedFile.name}</p>
                  <p className="text-xs text-stone-500 font-semibold">{pdfDoc?.numPages || 0} páginas • PDF</p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={resetAll}
                  className="text-xs px-3 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl font-bold transition-colors"
                >
                  Cambiar archivo
                </button>
                <button
                  onClick={handleCopyText}
                  disabled={!activeText}
                  className="flex items-center space-x-1.5 px-3 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs font-bold transition-colors disabled:opacity-40"
                >
                  {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                  <span>{copied ? '¡Copiado!' : 'Copiar'}</span>
                </button>
                <button
                  onClick={handleExportTxt}
                  disabled={!activeText}
                  className="flex items-center space-x-1.5 bg-stone-900 hover:bg-stone-800 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-xs transition-colors disabled:opacity-40"
                >
                  <Download size={14} />
                  <span>Exportar TXT</span>
                </button>
              </div>
            </div>

            {/* Subtabs */}
            <div className="flex border-b border-stone-200 px-2 gap-4">
              <button
                onClick={() => setActivePdfSubTab('digital')}
                className={`pb-3 text-xs font-black border-b-2 flex items-center gap-2 transition-colors ${
                  activePdfSubTab === 'digital'
                    ? 'border-amber-600 text-amber-700'
                    : 'border-transparent text-stone-400 hover:text-stone-700'
                }`}
              >
                <FileText size={15} />
                <span>Texto Digital Nativo</span>
              </button>

              <button
                onClick={() => setActivePdfSubTab('ocr')}
                className={`pb-3 text-xs font-black border-b-2 flex items-center gap-2 transition-colors ${
                  activePdfSubTab === 'ocr'
                    ? 'border-amber-600 text-amber-700'
                    : 'border-transparent text-stone-400 hover:text-stone-700'
                }`}
              >
                <Sparkles size={15} className="text-amber-500" />
                <span>Escaneo OCR por Página</span>
              </button>
            </div>

            {activePdfSubTab === 'digital' ? (
              <div className="space-y-4">
                <div className="relative">
                  <Search size={16} className="absolute left-3.5 top-3 text-stone-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar palabras dentro del documento..."
                    className="w-full pl-10 pr-4 py-2.5 text-xs bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>

                <div className="max-h-[450px] overflow-y-auto space-y-3">
                  {extractedPages.map((page) => {
                    const hasMatches =
                      !searchQuery ||
                      page.text.toLowerCase().includes(searchQuery.toLowerCase());

                    if (!hasMatches) return null;

                    return (
                      <div
                        key={page.pageNumber}
                        className="border border-stone-100 rounded-2xl p-4 bg-stone-50/70"
                      >
                        <div className="text-[11px] font-bold uppercase tracking-wider text-amber-700 mb-1">
                          Página {page.pageNumber}
                        </div>
                        <p className="text-xs font-mono text-stone-800 whitespace-pre-wrap leading-relaxed">
                          {page.text || <span className="text-stone-400 italic">Sin texto digital (usa la pestaña OCR).</span>}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-stone-50 p-4 rounded-2xl border border-stone-200">
                  <div>
                    <label className="block text-[11px] uppercase font-bold tracking-wider text-stone-400 mb-1">
                      Página a Escanear
                    </label>
                    <select
                      value={ocrPage}
                      onChange={(e) => setOcrPage(parseInt(e.target.value) || 1)}
                      className="w-full px-3 py-2 text-xs bg-white border border-stone-200 rounded-xl outline-none font-bold text-stone-800"
                    >
                      {Array.from({ length: pdfDoc?.numPages || 1 }, (_, i) => (
                        <option key={i + 1} value={i + 1}>
                          Página {i + 1} de {pdfDoc?.numPages || 1}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] uppercase font-bold tracking-wider text-stone-400 mb-1">
                      Idioma
                    </label>
                    <select
                      value={ocrLanguage}
                      onChange={(e) => setOcrLanguage(e.target.value as any)}
                      className="w-full px-3 py-2 text-xs bg-white border border-stone-200 rounded-xl outline-none font-bold text-stone-800"
                    >
                      <option value="spa+eng">Español + Inglés</option>
                      <option value="spa">Solo Español</option>
                      <option value="eng">Solo Inglés</option>
                    </select>
                  </div>

                  <div className="flex items-end">
                    <button
                      onClick={handleRunPdfOcr}
                      disabled={isProcessingOcr}
                      className="w-full flex items-center justify-center space-x-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-stone-950 py-2.5 px-4 rounded-xl text-xs font-black shadow-sm transition-all"
                    >
                      {isProcessingOcr ? (
                        <div className="w-4 h-4 border-2 border-stone-950 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Sparkles size={15} />
                      )}
                      <span>{isProcessingOcr ? 'Escaneando...' : 'Iniciar Escaneo OCR'}</span>
                    </button>
                  </div>
                </div>

                <div>
                  <textarea
                    value={ocrResultText}
                    onChange={(e) => setOcrResultText(e.target.value)}
                    placeholder="El texto escaneado de esta página aparecerá aquí..."
                    rows={10}
                    className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-2xl font-mono text-xs text-stone-800 leading-relaxed outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
