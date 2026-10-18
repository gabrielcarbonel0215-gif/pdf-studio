import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import { PDFDocument } from 'pdf-lib';
import { updatePdfMetadata, flattenPdf, downloadFile, convertImagesToPdf } from '../lib/pdfCore';
import { loadPdfJsDocument, renderPageToCanvas } from '../lib/pdfViewer';
import { DocumentMetadata } from '../types/pdf';
import {
  UploadCloud,
  File as FileIcon,
  Shield,
  Layers,
  Sparkles,
  Download,
  Info,
  Minimize2,
} from 'lucide-react';

export default function SecurityMetaTool() {
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
  const [compressLevel, setCompressLevel] = useState<'low' | 'medium' | 'high'>('medium');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
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
      } catch (err) {
        console.error('Error reading PDF metadata:', err);
      }
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
    } catch (err) {
      console.error('Error updating metadata:', err);
      alert('Hubo un error al actualizar los metadatos.');
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
    } catch (err) {
      console.error('Error flattening PDF:', err);
      alert('Hubo un error al aplanar el PDF.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCompressPdf = async () => {
    if (!file) return;
    setIsProcessing(true);
    try {
      const doc = await loadPdfJsDocument(file);
      const scale = compressLevel === 'high' ? 1.0 : compressLevel === 'medium' ? 1.4 : 1.8;
      const quality = compressLevel === 'high' ? 0.65 : compressLevel === 'medium' ? 0.8 : 0.9;

      const compressedImages: File[] = [];

      for (let i = 1; i <= doc.numPages; i++) {
        const canvas = document.createElement('canvas');
        await renderPageToCanvas(doc, i, canvas, scale);
        const blob = await new Promise<Blob>((res) => canvas.toBlob((b) => res(b!), 'image/jpeg', quality));
        compressedImages.push(new File([blob], `page_${i}.jpg`, { type: 'image/jpeg' }));
      }

      const newPdfBytes = await convertImagesToPdf(compressedImages, {
        pageSize: 'fit',
        orientation: 'auto',
        margin: 0,
      });

      const baseName = file.name.replace(/\.[^/.]+$/, '');
      downloadFile(newPdfBytes, `${baseName}_comprimido.pdf`);
      confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
    } catch (err) {
      console.error('Error compressing PDF:', err);
      alert('Hubo un error al comprimir el PDF.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold tracking-tight text-slate-800">Seguridad, Metadatos y Optimización</h2>
        <p className="text-sm text-slate-500">
          Modifica las propiedades internas del documento, aplana las capas para evitar ediciones no autorizadas o comprime el tamaño del PDF.
        </p>
      </div>

      {!file ? (
        <div className="border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-3xl p-10 bg-white text-center transition-all relative group shadow-xs">
          <input
            type="file"
            accept="application/pdf"
            onChange={handleFileChange}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
          />
          <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-3 group-hover:scale-105 transition-transform">
            <Shield size={32} />
          </div>
          <p className="text-sm font-bold text-slate-800">Selecciona un archivo PDF</p>
          <p className="text-xs text-slate-400 mt-1 uppercase tracking-wider font-semibold">
            Metadatos, aplanamiento e inmutabilidad
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl border border-blue-100">
                <FileIcon size={20} />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800">{file.name}</p>
                <p className="text-xs text-slate-500 font-semibold">
                  {(file.size / (1024 * 1024)).toFixed(2)} MB
                </p>
              </div>
            </div>
            <button
              onClick={() => setFile(null)}
              className="text-xs px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg font-semibold"
            >
              Cambiar archivo
            </button>
          </div>

          {/* Subtabs */}
          <div className="flex border-b border-slate-200 bg-white rounded-t-2xl px-6 pt-3 shadow-2xs">
            <button
              onClick={() => setActiveSubTab('metadata')}
              className={`pb-3 px-4 text-sm font-bold border-b-2 flex items-center gap-2 transition-colors ${
                activeSubTab === 'metadata'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Info size={16} />
              <span>Editar Metadatos</span>
            </button>

            <button
              onClick={() => setActiveSubTab('flatten')}
              className={`pb-3 px-4 text-sm font-bold border-b-2 flex items-center gap-2 transition-colors ${
                activeSubTab === 'flatten'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Layers size={16} />
              <span>Aplanar PDF (Flatten)</span>
            </button>

            <button
              onClick={() => setActiveSubTab('compress')}
              className={`pb-3 px-4 text-sm font-bold border-b-2 flex items-center gap-2 transition-colors ${
                activeSubTab === 'compress'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Minimize2 size={16} />
              <span>Optimizar Tamaño</span>
            </button>
          </div>

          {/* SUBTAB 1: METADATA */}
          {activeSubTab === 'metadata' && (
            <div className="bg-white border border-slate-200 rounded-b-2xl p-6 shadow-xs space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] uppercase font-bold tracking-wider text-slate-400 mb-1.5">
                    Título del Documento
                  </label>
                  <input
                    type="text"
                    value={metadata.title || ''}
                    onChange={(e) => setMetadata({ ...metadata, title: e.target.value })}
                    className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] uppercase font-bold tracking-wider text-slate-400 mb-1.5">
                    Autor
                  </label>
                  <input
                    type="text"
                    value={metadata.author || ''}
                    onChange={(e) => setMetadata({ ...metadata, author: e.target.value })}
                    className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] uppercase font-bold tracking-wider text-slate-400 mb-1.5">
                    Asunto / Tema
                  </label>
                  <input
                    type="text"
                    value={metadata.subject || ''}
                    onChange={(e) => setMetadata({ ...metadata, subject: e.target.value })}
                    className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] uppercase font-bold tracking-wider text-slate-400 mb-1.5">
                    Palabras Clave (separadas por coma)
                  </label>
                  <input
                    type="text"
                    value={metadata.keywords || ''}
                    onChange={(e) => setMetadata({ ...metadata, keywords: e.target.value })}
                    className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] uppercase font-bold tracking-wider text-slate-400 mb-1.5">
                    Aplicación Creadora (Creator)
                  </label>
                  <input
                    type="text"
                    value={metadata.creator || ''}
                    onChange={(e) => setMetadata({ ...metadata, creator: e.target.value })}
                    className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] uppercase font-bold tracking-wider text-slate-400 mb-1.5">
                    Productor de PDF (Producer)
                  </label>
                  <input
                    type="text"
                    value={metadata.producer || ''}
                    onChange={(e) => setMetadata({ ...metadata, producer: e.target.value })}
                    className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-3">
                <button
                  onClick={handleSaveMetadata}
                  disabled={isProcessing}
                  className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-6 py-2.5 rounded-xl text-sm font-bold shadow-md transition-all"
                >
                  {isProcessing ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Download size={16} />
                  )}
                  <span>Guardar Metadatos y Descargar</span>
                </button>
              </div>
            </div>
          )}

          {/* SUBTAB 2: FLATTEN */}
          {activeSubTab === 'flatten' && (
            <div className="bg-white border border-slate-200 rounded-b-2xl p-6 shadow-xs space-y-4">
              <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl text-xs text-blue-900 leading-relaxed">
                <p className="font-bold mb-1">¿Qué hace el aplanamiento (Flatten)?</p>
                <p>
                  Convierte todos los formularios rellenables, anotaciones, firmas y cuadros de texto interactivos en una capa fija y no editable. Esto garantiza que nadie pueda modificar los campos rellenados o extraer firmas flotantes.
                </p>
              </div>

              <div className="flex justify-end pt-3">
                <button
                  onClick={handleFlattenPdf}
                  disabled={isProcessing}
                  className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-6 py-2.5 rounded-xl text-sm font-bold shadow-md transition-all"
                >
                  {isProcessing ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Layers size={16} />
                  )}
                  <span>Aplanar Documento y Descargar</span>
                </button>
              </div>
            </div>
          )}

          {/* SUBTAB 3: COMPRESS */}
          {activeSubTab === 'compress' && (
            <div className="bg-white border border-slate-200 rounded-b-2xl p-6 shadow-xs space-y-5">
              <div>
                <label className="block text-[11px] uppercase font-bold tracking-wider text-slate-400 mb-2">
                  Nivel de Compresión
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { id: 'low', label: 'Baja Compresión', desc: 'Alta fidelidad visual (~10-20% ahorro)' },
                    { id: 'medium', label: 'Compresión Media', desc: 'Equilibrio perfecto (~30-50% ahorro)' },
                    { id: 'high', label: 'Alta Compresión', desc: 'Máximo ahorro de espacio (~50-80% ahorro)' },
                  ].map((lvl) => (
                    <button
                      key={lvl.id}
                      onClick={() => setCompressLevel(lvl.id as any)}
                      className={`p-3.5 rounded-xl border-2 text-left transition-all ${
                        compressLevel === lvl.id
                          ? 'border-blue-600 bg-blue-50/50 shadow-xs'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <span className="block text-xs font-bold text-slate-800">{lvl.label}</span>
                      <span className="text-[11px] text-slate-500 block mt-1">{lvl.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end pt-3">
                <button
                  onClick={handleCompressPdf}
                  disabled={isProcessing}
                  className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-6 py-2.5 rounded-xl text-sm font-bold shadow-md transition-all"
                >
                  {isProcessing ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Minimize2 size={16} />
                  )}
                  <span>Comprimir y Descargar</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
