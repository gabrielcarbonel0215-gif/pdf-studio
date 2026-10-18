import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import { PDFDocument } from 'pdf-lib';
import { updatePdfMetadata, flattenPdf, optimizePdf, downloadFile, convertImagesToPdf } from '../lib/pdfCore';
import { loadPdfJsDocument, renderPageToCanvas } from '../lib/pdfViewer';
import { DocumentMetadata } from '../types/pdf';
import { useToast } from './common/Toast';
import StudioDropzone from './common/StudioDropzone';
import {
  File as FileIcon,
  Shield,
  Layers,
  Sparkles,
  Download,
  Info,
  Minimize2,
  X,
  Zap,
  Image as ImageIcon,
} from 'lucide-react';

export default function SecurityMetaTool() {
  const { showToast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<'metadata' | 'flatten' | 'compress'>('metadata');

  // Metadata state
  const [metadata, setMetadata] = useState<DocumentMetadata>({
    title: '',
    author: '',
    subject: '',
    keywords: '',
    creator: '',
    producer: 'PDF Studio Pro',
  });

  // Compression state
  const [compressMode, setCompressMode] = useState<'vector' | 'raster'>('vector');
  const [stripMeta, setStripMeta] = useState<boolean>(true);
  const [rasterQuality, setRasterQuality] = useState<'medium' | 'high'>('medium');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  const handleFilesSelected = async (files: File[]) => {
    if (!files || files.length === 0) return;
    const selectedFile = files[0];
    setFile(selectedFile);
    try {
      const arrayBuffer = await selectedFile.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });

      setMetadata({
        title: pdfDoc.getTitle() || '',
        author: pdfDoc.getAuthor() || '',
        subject: pdfDoc.getSubject() || '',
        keywords: pdfDoc.getKeywords() || '',
        creator: pdfDoc.getCreator() || '',
        producer: pdfDoc.getProducer() || 'PDF Studio Pro',
      });
      showToast(`PDF cargado: ${selectedFile.name}`);
    } catch (err) {
      console.error('Error reading PDF metadata:', err);
      showToast('Error al leer el archivo PDF.', 'error');
    }
  };

  const handleSaveMetadata = async () => {
    if (!file) return;
    setIsProcessing(true);
    try {
      const bytes = await updatePdfMetadata(file, metadata);
      const baseName = file.name.replace(/\.[^/.]+$/, '');
      downloadFile(bytes, `${baseName}_metadatos_actualizados.pdf`);
      confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
      showToast('¡Metadatos actualizados y descargados con éxito!');
    } catch (err) {
      console.error('Error updating metadata:', err);
      showToast('Hubo un error al actualizar los metadatos.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFlattenPdf = async () => {
    if (!file) return;
    setIsProcessing(true);
    try {
      const bytes = await flattenPdf(file);
      const baseName = file.name.replace(/\.[^/.]+$/, '');
      downloadFile(bytes, `${baseName}_aplanado_inmutable.pdf`);
      confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
      showToast('¡Documento aplanado con éxito!');
    } catch (err) {
      console.error('Error flattening PDF:', err);
      showToast('Hubo un error al aplanar el PDF.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCompressPdf = async () => {
    if (!file) return;
    setIsProcessing(true);
    try {
      let finalBytes: Uint8Array;
      const baseName = file.name.replace(/\.[^/.]+$/, '');

      if (compressMode === 'vector') {
        // Safe vector-preserving stream optimization
        finalBytes = await optimizePdf(file, stripMeta);
        showToast('¡Compresión vectorial completada sin pérdidas!');
      } else {
        // Scanned photo compression mode
        const doc = await loadPdfJsDocument(file);
        const scale = rasterQuality === 'high' ? 1.2 : 1.5;
        const quality = rasterQuality === 'high' ? 0.75 : 0.85;

        const compressedImages: File[] = [];
        for (let i = 1; i <= doc.numPages; i++) {
          const canvas = document.createElement('canvas');
          await renderPageToCanvas(doc, i, canvas, scale);
          const blob = await new Promise<Blob>((res) =>
            canvas.toBlob((b) => res(b!), 'image/jpeg', quality)
          );
          compressedImages.push(new File([blob], `page_${i}.jpg`, { type: 'image/jpeg' }));
        }

        finalBytes = await convertImagesToPdf(compressedImages, {
          pageSize: 'fit',
          orientation: 'auto',
          margin: 0,
        });
        showToast('¡PDF escaneado comprimido con éxito!');
      }

      downloadFile(finalBytes, `${baseName}_optimizado.pdf`);
      confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
    } catch (err) {
      console.error('Error compressing PDF:', err);
      showToast('Hubo un error al comprimir el PDF.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8 select-none">
      <div className="mb-6">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-stone-200 text-stone-800 text-xs font-bold mb-2">
          <Shield size={13} className="text-stone-800" />
          <span>Seguridad, Aplanamiento & Optimización</span>
        </div>
        <h2 className="text-2xl font-black tracking-tight text-stone-900">
          Control de Documentos & Metadatos
        </h2>
        <p className="text-xs text-stone-500 font-medium">
          Optimiza el tamaño de tu PDF, aplana formularios interactivos y edita información del autor o título.
        </p>
      </div>

      {!file ? (
        <StudioDropzone
          onFilesSelected={handleFilesSelected}
          title="Abre un PDF para Optimizar o Proteger"
          subtitle="Modifica metadatos, aplana capas interactivas o compacta el archivo."
          buttonText="Seleccionar Archivo PDF"
          icon={<Shield size={34} className="text-amber-400" />}
        />
      ) : (
        <div className="bg-[#f7f5f0] border border-[#ded7cc] rounded-3xl p-5 sm:p-7 shadow-xl space-y-6">
          {/* File Card Header */}
          <div className="flex items-center justify-between p-3.5 bg-[#eae4d9] rounded-2xl border border-[#ded7cc]">
            <div className="flex items-center space-x-3 overflow-hidden">
              <span className="p-2.5 bg-[#f7f5f0] rounded-xl text-stone-800 border border-[#ded7cc] shrink-0">
                <FileIcon size={20} />
              </span>
              <div className="truncate">
                <span className="block text-xs font-black text-stone-900 truncate">{file.name}</span>
                <span className="text-[10px] text-stone-500 font-bold">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </span>
              </div>
            </div>

            <button
              onClick={() => setFile(null)}
              className="px-3 py-1.5 bg-[#f7f5f0] hover:bg-stone-300 text-stone-700 hover:text-stone-900 rounded-xl text-xs font-bold transition-colors flex items-center gap-1 border border-[#ded7cc]"
            >
              <X size={14} />
              <span>Cambiar PDF</span>
            </button>
          </div>

          {/* Subtabs Selector */}
          <div className="flex border-b border-[#ded7cc] space-x-2">
            {[
              { id: 'metadata', label: 'Metadatos', icon: <Info size={15} /> },
              { id: 'flatten', label: 'Aplanar Capas (Flatten)', icon: <Layers size={15} /> },
              { id: 'compress', label: 'Optimizar Tamaño', icon: <Minimize2 size={15} /> },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveSubTab(tab.id as any)}
                className={`flex items-center space-x-2 py-2.5 px-4 rounded-t-2xl font-black text-xs transition-all ${
                  activeSubTab === tab.id
                    ? 'bg-stone-900 text-white shadow-xs'
                    : 'text-stone-600 hover:text-stone-900 bg-[#eae4d9]/60'
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* SUBTAB 1: METADATA */}
          {activeSubTab === 'metadata' && (
            <div className="space-y-4 pt-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[10px] uppercase font-black tracking-wider text-stone-500 mb-1">
                    Título del Documento
                  </label>
                  <input
                    type="text"
                    value={metadata.title || ''}
                    onChange={(e) => setMetadata({ ...metadata, title: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs font-bold bg-white border border-[#ded7cc] rounded-xl outline-none focus:border-stone-800"
                    placeholder="Título del documento..."
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-black tracking-wider text-stone-500 mb-1">
                    Autor / Creador
                  </label>
                  <input
                    type="text"
                    value={metadata.author || ''}
                    onChange={(e) => setMetadata({ ...metadata, author: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs font-bold bg-white border border-[#ded7cc] rounded-xl outline-none focus:border-stone-800"
                    placeholder="Nombre del autor o entidad..."
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-black tracking-wider text-stone-500 mb-1">
                    Asunto / Tema
                  </label>
                  <input
                    type="text"
                    value={metadata.subject || ''}
                    onChange={(e) => setMetadata({ ...metadata, subject: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs font-bold bg-white border border-[#ded7cc] rounded-xl outline-none focus:border-stone-800"
                    placeholder="Tema principal..."
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-black tracking-wider text-stone-500 mb-1">
                    Palabras Clave (Keywords)
                  </label>
                  <input
                    type="text"
                    value={metadata.keywords || ''}
                    onChange={(e) => setMetadata({ ...metadata, keywords: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs font-bold bg-white border border-[#ded7cc] rounded-xl outline-none focus:border-stone-800"
                    placeholder="legal, contrato, informe..."
                  />
                </div>
              </div>

              <div className="flex justify-end pt-3">
                <button
                  onClick={handleSaveMetadata}
                  disabled={isProcessing}
                  className="flex items-center space-x-2 bg-[#18181b] hover:bg-black text-white px-6 py-3 rounded-2xl text-xs font-black shadow-md transition-all active:scale-95 disabled:opacity-50"
                >
                  {isProcessing ? (
                    <div className="w-4 h-4 border-2 border-stone-200 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Download size={15} />
                  )}
                  <span>Guardar Metadatos y Descargar</span>
                </button>
              </div>
            </div>
          )}

          {/* SUBTAB 2: FLATTEN */}
          {activeSubTab === 'flatten' && (
            <div className="space-y-4 pt-1">
              <div className="p-4 bg-amber-50 border border-amber-200/90 rounded-2xl text-xs text-amber-950 leading-relaxed font-medium">
                <p className="font-black text-stone-900 mb-1">¿Qué hace el aplanamiento (Flatten)?</p>
                <p>
                  Convierte todos los formularios rellenables, anotaciones y firmas flotantes en contenido fijo no editable. Esto garantiza que nadie pueda modificar los campos rellenados al abrirlo en otros lectores de PDF.
                </p>
              </div>

              <div className="flex justify-end pt-3">
                <button
                  onClick={handleFlattenPdf}
                  disabled={isProcessing}
                  className="flex items-center space-x-2 bg-[#18181b] hover:bg-black text-white px-6 py-3 rounded-2xl text-xs font-black shadow-md transition-all active:scale-95 disabled:opacity-50"
                >
                  {isProcessing ? (
                    <div className="w-4 h-4 border-2 border-stone-200 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Layers size={15} />
                  )}
                  <span>Aplanar Documento y Descargar</span>
                </button>
              </div>
            </div>
          )}

          {/* SUBTAB 3: COMPRESS / OPTIMIZE */}
          {activeSubTab === 'compress' && (
            <div className="space-y-4 pt-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setCompressMode('vector')}
                  className={`p-4 rounded-2xl border-2 text-left transition-all ${
                    compressMode === 'vector'
                      ? 'border-amber-700 bg-amber-50/80 shadow-xs'
                      : 'border-[#ded7cc] bg-white hover:border-stone-400'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Zap size={16} className="text-amber-800" />
                    <span className="text-xs font-black text-stone-900">Compresión Vectorial (Recomendada)</span>
                  </div>
                  <p className="text-[11px] text-stone-600 font-medium">
                    Optimiza flujos internos y tablas sin tocar vectores. <strong>Cero pérdida de nitidez y texto 100% seleccionable</strong>.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setCompressMode('raster')}
                  className={`p-4 rounded-2xl border-2 text-left transition-all ${
                    compressMode === 'raster'
                      ? 'border-amber-700 bg-amber-50/80 shadow-xs'
                      : 'border-[#ded7cc] bg-white hover:border-stone-400'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <ImageIcon size={16} className="text-stone-700" />
                    <span className="text-xs font-black text-stone-900">Modo Documento Escaneado</span>
                  </div>
                  <p className="text-[11px] text-stone-600 font-medium">
                    Especial para PDFs que son fotografías o escaneos pesados. Comprime las imágenes internas.
                  </p>
                </button>
              </div>

              {compressMode === 'vector' ? (
                <div className="p-3 bg-white rounded-2xl border border-[#ded7cc] flex items-center justify-between">
                  <span className="text-xs font-bold text-stone-800">
                    Limpiar metadatos redundantes para mayor compactación
                  </span>
                  <input
                    type="checkbox"
                    checked={stripMeta}
                    onChange={(e) => setStripMeta(e.target.checked)}
                    className="w-4 h-4 accent-amber-700 cursor-pointer"
                  />
                </div>
              ) : (
                <div className="p-3 bg-white rounded-2xl border border-[#ded7cc] flex items-center justify-between">
                  <span className="text-xs font-bold text-stone-800">Nivel de calidad fotográfica</span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setRasterQuality('medium')}
                      className={`px-3 py-1 rounded-xl text-xs font-bold ${
                        rasterQuality === 'medium' ? 'bg-stone-900 text-white' : 'bg-stone-100 text-stone-700'
                      }`}
                    >
                      Estándar
                    </button>
                    <button
                      type="button"
                      onClick={() => setRasterQuality('high')}
                      className={`px-3 py-1 rounded-xl text-xs font-bold ${
                        rasterQuality === 'high' ? 'bg-stone-900 text-white' : 'bg-stone-100 text-stone-700'
                      }`}
                    >
                      Alta
                    </button>
                  </div>
                </div>
              )}

              <div className="flex justify-end pt-3">
                <button
                  onClick={handleCompressPdf}
                  disabled={isProcessing}
                  className="flex items-center space-x-2 bg-[#18181b] hover:bg-black text-white px-6 py-3 rounded-2xl text-xs font-black shadow-md transition-all active:scale-95 disabled:opacity-50"
                >
                  {isProcessing ? (
                    <div className="w-4 h-4 border-2 border-stone-200 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Minimize2 size={15} />
                  )}
                  <span>Optimizar PDF y Descargar</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
