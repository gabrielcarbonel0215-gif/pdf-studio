import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import JSZip from 'jszip';
import {
  convertImagesToPdf,
  convertTextToPdf,
  downloadFile,
  ImageToPdfOptions,
} from '../lib/pdfCore';
import { loadPdfJsDocument, renderPageToCanvas } from '../lib/pdfViewer';
import { useToast } from './common/Toast';
import StudioDropzone from './common/StudioDropzone';
import {
  UploadCloud,
  Image as ImageIcon,
  FileText,
  Download,
  Archive,
  Layers,
  X,
  Sparkles,
  RefreshCw,
} from 'lucide-react';

export default function ConvertTool() {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'img2pdf' | 'pdf2img' | 'text2pdf'>('img2pdf');

  // Images to PDF state
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [imgOptions, setImgOptions] = useState<ImageToPdfOptions>({
    pageSize: 'a4',
    orientation: 'auto',
    margin: 20,
  });

  // PDF to Images state
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfPageCount, setPdfPageCount] = useState<number>(0);
  const [dpiScale, setDpiScale] = useState<number>(2.0); // 2.0 = ~150 DPI, 4.0 = ~300 DPI
  const [imageFormat, setImageFormat] = useState<'image/png' | 'image/jpeg'>('image/png');

  // Text to PDF state
  const [textTitle, setTextTitle] = useState<string>('Mi Documento');
  const [textContent, setTextContent] = useState<string>(
    'Escribe o pega aquí el contenido de tu documento...\n\nPuedes incluir varios párrafos, notas legales, acuerdos o apuntes.'
  );

  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // 1. Images to PDF handlers
  const handleImageFilesSelected = (files: File[]) => {
    setImageFiles((prev) => [...prev, ...files]);

    files.forEach((f) => {
      const reader = new FileReader();
      reader.onload = () => {
        setImagePreviews((prev) => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(f);
    });
    showToast(`Se agregaron ${files.length} imágenes`);
  };

  const removeImage = (index: number) => {
    setImageFiles((prev) => prev.filter((_, i) => i !== index));
    setImagePreviews((prev) => prev.filter((_, i) => i !== index));
    showToast('Imagen removida');
  };

  const handleConvertImagesToPdf = async () => {
    if (imageFiles.length === 0) {
      showToast('Agrega al menos una imagen para convertir.', 'info');
      return;
    }
    setIsProcessing(true);
    try {
      const bytes = await convertImagesToPdf(imageFiles, imgOptions);
      downloadFile(bytes, 'imagenes_convertidas.pdf');
      confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
      showToast('¡Imágenes convertidas a PDF con éxito!');
    } catch (err) {
      console.error('Error converting images to PDF:', err);
      showToast('Hubo un error al convertir las imágenes.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // 2. PDF to Images handlers
  const handlePdfSelected = async (files: File[]) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    setPdfFile(file);
    try {
      const doc = await loadPdfJsDocument(file);
      setPdfPageCount(doc.numPages);
      showToast(`PDF cargado con ${doc.numPages} páginas`);
    } catch (err) {
      console.error('Error loading PDF:', err);
      showToast('No se pudo cargar el PDF.', 'error');
      setPdfFile(null);
    }
  };

  const handleConvertPdfToImages = async () => {
    if (!pdfFile) return;
    setIsProcessing(true);
    try {
      const doc = await loadPdfJsDocument(pdfFile);
      const zip = new JSZip();
      const baseName = pdfFile.name.replace(/\.[^/.]+$/, '');
      const ext = imageFormat === 'image/png' ? 'png' : 'jpg';

      for (let i = 1; i <= doc.numPages; i++) {
        const canvas = document.createElement('canvas');
        await renderPageToCanvas(doc, i, canvas, dpiScale);

        const dataUrl = canvas.toDataURL(imageFormat, 0.92);
        const base64Data = dataUrl.split(',')[1];
        zip.file(`${baseName}_pagina_${i}.${ext}`, base64Data, { base64: true });
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      downloadFile(zipBlob, `${baseName}_imagenes.zip`, 'application/zip');
      confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
      showToast('¡Páginas exportadas en archivo ZIP!');
    } catch (err) {
      console.error('Error converting PDF to images:', err);
      showToast('Hubo un error al exportar las imágenes.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // 3. Text to PDF handler
  const handleConvertTextToPdf = async () => {
    if (!textContent.trim()) {
      showToast('Escribe algo de texto antes de generar el PDF.', 'info');
      return;
    }
    setIsProcessing(true);
    try {
      const bytes = await convertTextToPdf(textContent, textTitle);
      downloadFile(bytes, `${textTitle || 'documento'}.pdf`);
      confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
      showToast('¡Documento PDF de texto generado con éxito!');
    } catch (err) {
      console.error('Error converting text to PDF:', err);
      showToast('Hubo un error al generar el PDF.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 lg:p-8 select-none">
      <div className="mb-6">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-100 text-teal-900 text-xs font-bold mb-2">
          <RefreshCw size={13} className="text-teal-800" />
          <span>Conversor de Formatos</span>
        </div>
        <h2 className="text-2xl font-black tracking-tight text-stone-900">
          Conversor Universal
        </h2>
        <p className="text-xs text-stone-500 font-medium">
          Convierte imágenes a PDF con márgenes personalizables, extrae páginas como imágenes en alta resolución o convierte notas de texto a documento.
        </p>
      </div>

      {/* Subtab Selector */}
      <div className="flex border-b border-[#ded7cc] bg-[#f7f5f0] rounded-t-3xl px-4 pt-3 shadow-xs space-x-2">
        {[
          { id: 'img2pdf', label: 'Fotos / Imágenes a PDF', icon: <ImageIcon size={15} /> },
          { id: 'pdf2img', label: 'PDF a Imágenes (ZIP)', icon: <Archive size={15} /> },
          { id: 'text2pdf', label: 'Texto / Notas a PDF', icon: <FileText size={15} /> },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center space-x-2 py-2.5 px-4 rounded-t-2xl font-black text-xs transition-all ${
              activeTab === tab.id
                ? 'bg-stone-900 text-white shadow-xs'
                : 'text-stone-600 hover:text-stone-900 bg-[#eae4d9]/50'
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab 1: Images to PDF */}
      {activeTab === 'img2pdf' && (
        <div className="bg-[#f7f5f0] border-x border-b border-[#ded7cc] rounded-b-3xl p-5 sm:p-7 shadow-xl space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[10px] font-black uppercase text-stone-500 mb-1">
                Tamaño de Hoja
              </label>
              <select
                value={imgOptions.pageSize}
                onChange={(e) => setImgOptions({ ...imgOptions, pageSize: e.target.value as any })}
                className="w-full px-3 py-2 text-xs font-bold bg-white border border-[#ded7cc] rounded-xl outline-none"
              >
                <option value="a4">A4 (Estándar)</option>
                <option value="letter">Carta (Letter)</option>
                <option value="fit">Ajustar al tamaño de la imagen</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase text-stone-500 mb-1">
                Orientación
              </label>
              <select
                value={imgOptions.orientation}
                onChange={(e) => setImgOptions({ ...imgOptions, orientation: e.target.value as any })}
                className="w-full px-3 py-2 text-xs font-bold bg-white border border-[#ded7cc] rounded-xl outline-none"
              >
                <option value="auto">Automática (Según cada foto)</option>
                <option value="portrait">Vertical (Retrato)</option>
                <option value="landscape">Horizontal (Apaisado)</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase text-stone-500 mb-1">
                Margen ({imgOptions.margin} pt)
              </label>
              <input
                type="range"
                min={0}
                max={50}
                value={imgOptions.margin}
                onChange={(e) => setImgOptions({ ...imgOptions, margin: parseInt(e.target.value) || 0 })}
                className="w-full accent-amber-700"
              />
            </div>
          </div>

          <StudioDropzone
            onFilesSelected={handleImageFilesSelected}
            multiple={true}
            accept="image/*"
            compact={imageFiles.length > 0}
            title="Selecciona o Arrastra tus Imágenes (JPG, PNG, WebP)"
            subtitle="Crea un PDF combinando varias fotos ordenadas."
            buttonText="+ Agregar Imágenes"
            icon={<ImageIcon size={34} className="text-amber-400" />}
          />

          {imagePreviews.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-stone-800">
                  {imagePreviews.length} {imagePreviews.length === 1 ? 'imagen añadida' : 'imágenes añadidas'}
                </span>
                <button
                  onClick={() => {
                    setImageFiles([]);
                    setImagePreviews([]);
                  }}
                  className="text-xs text-rose-600 font-bold hover:underline"
                >
                  Limpiar todas
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
                {imagePreviews.map((src, idx) => (
                  <div key={idx} className="relative group bg-white p-2 rounded-2xl border border-[#ded7cc] shadow-2xs">
                    <img src={src} alt="Preview" className="w-full h-24 object-cover rounded-xl" />
                    <button
                      onClick={() => removeImage(idx)}
                      className="absolute top-1 right-1 p-1 bg-stone-900/80 hover:bg-red-600 text-white rounded-lg transition-colors"
                    >
                      <X size={12} />
                    </button>
                    <span className="text-[10px] font-black text-stone-600 block mt-1 text-center">
                      #{idx + 1}
                    </span>
                  </div>
                ))}
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={handleConvertImagesToPdf}
                  disabled={isProcessing}
                  className="flex items-center space-x-2 bg-[#18181b] hover:bg-black text-white px-6 py-3 rounded-2xl text-xs font-black shadow-md transition-all active:scale-95 disabled:opacity-50"
                >
                  {isProcessing ? (
                    <div className="w-4 h-4 border-2 border-stone-200 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Download size={15} />
                  )}
                  <span>Convertir Imágenes a PDF</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: PDF to Images */}
      {activeTab === 'pdf2img' && (
        <div className="bg-[#f7f5f0] border-x border-b border-[#ded7cc] rounded-b-3xl p-5 sm:p-7 shadow-xl space-y-6">
          {!pdfFile ? (
            <StudioDropzone
              onFilesSelected={handlePdfSelected}
              accept="application/pdf"
              title="Abre un PDF para Convertir a Imágenes"
              subtitle="Extrae cada página en alta resolución JPG o PNG empaquetadas en un ZIP."
              buttonText="Seleccionar Archivo PDF"
              icon={<Archive size={34} className="text-amber-400" />}
            />
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3.5 bg-[#eae4d9] rounded-2xl border border-[#ded7cc]">
                <div>
                  <span className="text-xs font-black text-stone-900 block truncate max-w-xs">{pdfFile.name}</span>
                  <span className="text-[10px] text-stone-500 font-bold">{pdfPageCount} páginas detectadas</span>
                </div>
                <button
                  onClick={() => setPdfFile(null)}
                  className="px-3 py-1.5 bg-[#f7f5f0] hover:bg-stone-300 text-stone-800 rounded-xl text-xs font-bold border border-[#ded7cc]"
                >
                  Cambiar PDF
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black uppercase text-stone-500 mb-1">
                    Formato de Imagen
                  </label>
                  <select
                    value={imageFormat}
                    onChange={(e) => setImageFormat(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs font-bold bg-white border border-[#ded7cc] rounded-xl outline-none"
                  >
                    <option value="image/png">PNG (Máxima nitidez sin pérdidas)</option>
                    <option value="image/jpeg">JPG (Fotográfico compacto)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase text-stone-500 mb-1">
                    Resolución / Calidad
                  </label>
                  <select
                    value={dpiScale}
                    onChange={(e) => setDpiScale(parseFloat(e.target.value) || 2.0)}
                    className="w-full px-3 py-2 text-xs font-bold bg-white border border-[#ded7cc] rounded-xl outline-none"
                  >
                    <option value={1.5}>Estándar (~110 DPI - Rápido)</option>
                    <option value={2.0}>Alta (~150 DPI - Recomendado)</option>
                    <option value={3.0}>Ultra Alta (~225 DPI - Para Impresión)</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={handleConvertPdfToImages}
                  disabled={isProcessing}
                  className="flex items-center space-x-2 bg-[#18181b] hover:bg-black text-white px-6 py-3 rounded-2xl text-xs font-black shadow-md transition-all active:scale-95 disabled:opacity-50"
                >
                  {isProcessing ? (
                    <div className="w-4 h-4 border-2 border-stone-200 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Download size={15} />
                  )}
                  <span>Exportar Páginas a ZIP</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Text to PDF */}
      {activeTab === 'text2pdf' && (
        <div className="bg-[#f7f5f0] border-x border-b border-[#ded7cc] rounded-b-3xl p-5 sm:p-7 shadow-xl space-y-4">
          <div>
            <label className="block text-[10px] font-black uppercase text-stone-500 mb-1">
              Título del Documento
            </label>
            <input
              type="text"
              value={textTitle}
              onChange={(e) => setTextTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs font-bold bg-white border border-[#ded7cc] rounded-xl outline-none focus:border-stone-800"
              placeholder="Ej: Contrato de Arrendamiento / Notas de Clase"
            />
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase text-stone-500 mb-1">
              Cuerpo del Documento
            </label>
            <textarea
              rows={10}
              value={textContent}
              onChange={(e) => setTextContent(e.target.value)}
              className="w-full p-3.5 text-xs font-medium bg-white border border-[#ded7cc] rounded-2xl outline-none focus:border-stone-800 font-mono shadow-inner"
              placeholder="Escribe o pega aquí el texto completo..."
            />
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={handleConvertTextToPdf}
              disabled={isProcessing}
              className="flex items-center space-x-2 bg-[#18181b] hover:bg-black text-white px-6 py-3 rounded-2xl text-xs font-black shadow-md transition-all active:scale-95 disabled:opacity-50"
            >
              {isProcessing ? (
                <div className="w-4 h-4 border-2 border-stone-200 border-t-transparent rounded-full animate-spin" />
              ) : (
                <Download size={15} />
              )}
              <span>Generar Documento PDF</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
