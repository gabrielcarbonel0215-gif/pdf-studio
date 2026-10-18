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
import {
  UploadCloud,
  Image as ImageIcon,
  FileText,
  Download,
  Archive,
  Layers,
  X,
  Sparkles,
} from 'lucide-react';

export default function ConvertTool() {
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
  const handleImageFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files) as File[];
    setImageFiles((prev) => [...prev, ...files]);

    files.forEach((f) => {
      const reader = new FileReader();
      reader.onload = () => {
        setImagePreviews((prev) => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(f);
    });
  };

  const removeImage = (index: number) => {
    setImageFiles((prev) => prev.filter((_, i) => i !== index));
    setImagePreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleConvertImagesToPdf = async () => {
    if (imageFiles.length === 0) return;
    setIsProcessing(true);
    try {
      const bytes = await convertImagesToPdf(imageFiles, imgOptions);
      downloadFile(bytes, 'imagenes_convertidas.pdf');
      confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
    } catch (err) {
      console.error('Error converting images to PDF:', err);
      alert('Hubo un error al convertir las imágenes.');
    } finally {
      setIsProcessing(false);
    }
  };

  // 2. PDF to Images handlers
  const handlePdfFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setPdfFile(file);
      try {
        const doc = await loadPdfJsDocument(file);
        setPdfPageCount(doc.numPages);
      } catch (err) {
        console.error('Error loading PDF:', err);
        alert('No se pudo cargar el PDF.');
        setPdfFile(null);
      }
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
    } catch (err) {
      console.error('Error converting PDF to images:', err);
      alert('Hubo un error al exportar las imágenes.');
    } finally {
      setIsProcessing(false);
    }
  };

  // 3. Text to PDF handler
  const handleConvertTextToPdf = async () => {
    if (!textContent.trim()) return;
    setIsProcessing(true);
    try {
      const bytes = await convertTextToPdf(textContent, textTitle);
      downloadFile(bytes, `${textTitle || 'documento'}.pdf`);
      confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
    } catch (err) {
      console.error('Error converting text to PDF:', err);
      alert('Hubo un error al generar el PDF.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold tracking-tight text-slate-800">Conversor Multiformato</h2>
        <p className="text-sm text-slate-500">
          Convierte imágenes a PDF con opciones de diseño, extrae páginas de PDF como imágenes en alta resolución o convierte notas de texto a PDF.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 bg-white rounded-t-2xl px-6 pt-3 shadow-2xs">
        <button
          onClick={() => setActiveTab('img2pdf')}
          className={`pb-3 px-4 text-sm font-bold border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'img2pdf'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <ImageIcon size={16} />
          <span>Imágenes a PDF</span>
        </button>

        <button
          onClick={() => setActiveTab('pdf2img')}
          className={`pb-3 px-4 text-sm font-bold border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'pdf2img'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Layers size={16} />
          <span>PDF a Imágenes (ZIP)</span>
        </button>

        <button
          onClick={() => setActiveTab('text2pdf')}
          className={`pb-3 px-4 text-sm font-bold border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'text2pdf'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileText size={16} />
          <span>Texto a PDF</span>
        </button>
      </div>

      {/* TAB 1: IMAGES TO PDF */}
      {activeTab === 'img2pdf' && (
        <div className="bg-white border border-slate-200 rounded-b-2xl p-6 shadow-xs space-y-6">
          {/* Upload Dropzone */}
          <div className="border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-2xl p-8 bg-slate-50/60 text-center relative group">
            <input
              type="file"
              multiple
              accept="image/png, image/jpeg, image/webp"
              onChange={handleImageFilesChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            />
            <ImageIcon size={32} className="mx-auto text-blue-500 mb-2 group-hover:scale-110 transition-transform" />
            <p className="text-sm font-bold text-slate-800">Selecciona o arrastra imágenes</p>
            <p className="text-xs text-slate-400 mt-1">PNG, JPG o WebP</p>
          </div>

          {/* Options */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div>
              <label className="block text-[11px] uppercase font-bold tracking-wider text-slate-400 mb-1.5">
                Tamaño de Página
              </label>
              <select
                value={imgOptions.pageSize}
                onChange={(e) =>
                  setImgOptions({ ...imgOptions, pageSize: e.target.value as any })
                }
                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl outline-none font-semibold"
              >
                <option value="a4">A4 Estándar</option>
                <option value="letter">Carta (Letter)</option>
                <option value="fit">Ajustar al tamaño exacto de imagen</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] uppercase font-bold tracking-wider text-slate-400 mb-1.5">
                Orientación
              </label>
              <select
                value={imgOptions.orientation}
                onChange={(e) =>
                  setImgOptions({ ...imgOptions, orientation: e.target.value as any })
                }
                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl outline-none font-semibold"
              >
                <option value="auto">Automática (según foto)</option>
                <option value="portrait">Vertical (Retrato)</option>
                <option value="landscape">Horizontal (Paisaje)</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] uppercase font-bold tracking-wider text-slate-400 mb-1.5">
                Márgenes
              </label>
              <select
                value={imgOptions.margin}
                onChange={(e) =>
                  setImgOptions({ ...imgOptions, margin: parseInt(e.target.value) })
                }
                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl outline-none font-semibold"
              >
                <option value={0}>Sin margen (Ajuste total)</option>
                <option value={20}>Margen Pequeño (20 pt)</option>
                <option value={40}>Margen Amplio (40 pt)</option>
              </select>
            </div>
          </div>

          {/* Previews */}
          {imagePreviews.length > 0 && (
            <div>
              <label className="block text-[11px] uppercase font-bold tracking-wider text-slate-400 mb-3">
                Imágenes a Convertir ({imagePreviews.length})
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
                {imagePreviews.map((src, idx) => (
                  <div key={idx} className="relative group rounded-xl overflow-hidden border border-slate-200 bg-slate-100 p-1">
                    <img src={src} alt={`Foto ${idx + 1}`} className="w-full h-24 object-cover rounded-lg" />
                    <button
                      onClick={() => removeImage(idx)}
                      className="absolute top-2 right-2 p-1 bg-red-600 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                    >
                      <X size={12} />
                    </button>
                    <span className="text-[10px] font-bold text-slate-500 block text-center mt-1">
                      #{idx + 1}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action */}
          <div className="flex justify-end pt-2">
            <button
              onClick={handleConvertImagesToPdf}
              disabled={imageFiles.length === 0 || isProcessing}
              className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-6 py-2.5 rounded-xl text-sm font-bold shadow-md transition-all"
            >
              {isProcessing ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Download size={16} />
              )}
              <span>Convertir a PDF</span>
            </button>
          </div>
        </div>
      )}

      {/* TAB 2: PDF TO IMAGES */}
      {activeTab === 'pdf2img' && (
        <div className="bg-white border border-slate-200 rounded-b-2xl p-6 shadow-xs space-y-6">
          {!pdfFile ? (
            <div className="border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-2xl p-8 bg-slate-50/60 text-center relative group">
              <input
                type="file"
                accept="application/pdf"
                onChange={handlePdfFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />
              <Layers size={32} className="mx-auto text-blue-500 mb-2 group-hover:scale-110 transition-transform" />
              <p className="text-sm font-bold text-slate-800">Selecciona el archivo PDF a convertir en imágenes</p>
              <p className="text-xs text-slate-400 mt-1">Exportación en alta fidelidad y resolución</p>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-blue-50 text-blue-600 rounded-lg border border-blue-100">
                    <FileText size={18} />
                  </div>
                  <div>
                    <span className="text-sm font-bold text-slate-800">{pdfFile.name}</span>
                    <span className="text-xs text-slate-500 font-semibold block">{pdfPageCount} páginas</span>
                  </div>
                </div>
                <button
                  onClick={() => setPdfFile(null)}
                  className="text-xs px-3 py-1.5 bg-white border border-slate-200 text-slate-600 rounded-lg font-semibold hover:bg-slate-100"
                >
                  Cambiar archivo
                </button>
              </div>

              {/* Conversion Settings */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] uppercase font-bold tracking-wider text-slate-400 mb-1.5">
                    Resolución / Calidad
                  </label>
                  <select
                    value={dpiScale}
                    onChange={(e) => setDpiScale(parseFloat(e.target.value))}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none font-semibold"
                  >
                    <option value={1.5}>Estándar (~100 DPI - Rápido)</option>
                    <option value={2.0}>Alta Definición (~150 DPI - Recomendado)</option>
                    <option value={3.5}>Ultra Definición (~300 DPI - Impresión)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] uppercase font-bold tracking-wider text-slate-400 mb-1.5">
                    Formato de Imagen
                  </label>
                  <select
                    value={imageFormat}
                    onChange={(e) => setImageFormat(e.target.value as any)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none font-semibold"
                  >
                    <option value="image/png">PNG (Sin pérdida de calidad)</option>
                    <option value="image/jpeg">JPG (Fotográfico y ligero)</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={handleConvertPdfToImages}
                  disabled={isProcessing}
                  className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-6 py-2.5 rounded-xl text-sm font-bold shadow-md transition-all"
                >
                  {isProcessing ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Archive size={16} />
                  )}
                  <span>Exportar Páginas a ZIP ({imageFormat === 'image/png' ? 'PNG' : 'JPG'})</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: TEXT TO PDF */}
      {activeTab === 'text2pdf' && (
        <div className="bg-white border border-slate-200 rounded-b-2xl p-6 shadow-xs space-y-4">
          <div>
            <label className="block text-[11px] uppercase font-bold tracking-wider text-slate-400 mb-1.5">
              Título del Documento
            </label>
            <input
              type="text"
              value={textTitle}
              onChange={(e) => setTextTitle(e.target.value)}
              placeholder="Ej: Contrato de Arrendamiento, Minuta..."
              className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-[11px] uppercase font-bold tracking-wider text-slate-400 mb-1.5">
              Cuerpo del Documento
            </label>
            <textarea
              value={textContent}
              onChange={(e) => setTextContent(e.target.value)}
              rows={12}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 font-sans leading-relaxed outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={handleConvertTextToPdf}
              disabled={!textContent.trim() || isProcessing}
              className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-6 py-2.5 rounded-xl text-sm font-bold shadow-md transition-all"
            >
              {isProcessing ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Download size={16} />
              )}
              <span>Crear y Descargar PDF</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
