import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { mergePdfs, downloadFile } from '../lib/pdfCore';
import { loadPdfJsDocument, generateThumbnails } from '../lib/pdfViewer';
import { useToast } from './common/Toast';
import StudioDropzone from './common/StudioDropzone';
import {
  UploadCloud,
  File as FileIcon,
  X,
  MoveUp,
  MoveDown,
  Download,
  Eye,
  GripVertical,
  Plus,
  SlidersHorizontal,
  FilePlus2,
} from 'lucide-react';

interface PdfFileItem {
  id: string;
  file: File;
  pageCount: number;
  thumbnailUrl?: string;
  pageRanges: string; // e.g. "1-5, 8"
}

export default function MergeTool() {
  const { showToast } = useToast();
  const [items, setItems] = useState<PdfFileItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const handleFilesSelected = async (newFiles: File[]) => {
    if (!newFiles || newFiles.length === 0) return;
    setIsProcessing(true);
    const newItems: PdfFileItem[] = [];

    for (const f of newFiles) {
      try {
        const doc = await loadPdfJsDocument(f);
        let thumbUrl = '';
        try {
          const thumbs = await generateThumbnails(doc, 100);
          if (thumbs.length > 0) thumbUrl = thumbs[0].thumbnailUrl;
        } catch (e) {
          // ignore thumbnail generation failure
        }

        newItems.push({
          id: Math.random().toString(36).substring(7),
          file: f,
          pageCount: doc.numPages,
          thumbnailUrl: thumbUrl,
          pageRanges: '',
        });
      } catch (err) {
        console.error('Error loading PDF for merge:', err);
        showToast(`El archivo ${f.name} no parece ser un PDF válido.`, 'error');
      }
    }

    setItems((prev) => [...prev, ...newItems]);
    setIsProcessing(false);
    showToast(`Se agregaron ${newItems.length} archivos a la lista`);
  };

  const removeFile = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
    showToast('Archivo removido');
  };

  const moveFile = (index: number, direction: 'up' | 'down') => {
    const newItems = [...items];
    if (direction === 'up' && index > 0) {
      [newItems[index - 1], newItems[index]] = [newItems[index], newItems[index - 1]];
    } else if (direction === 'down' && index < items.length - 1) {
      [newItems[index + 1], newItems[index]] = [newItems[index], newItems[index + 1]];
    }
    setItems(newItems);
  };

  const handleMerge = async () => {
    if (items.length < 2) {
      showToast('Por favor agrega al menos 2 archivos para unir.', 'info');
      return;
    }
    setIsProcessing(true);
    try {
      const mergedBytes = await mergePdfs(
        items.map((it) => ({ file: it.file, pageRanges: it.pageRanges }))
      );
      downloadFile(mergedBytes, 'documentos_unidos.pdf');
      confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
      showToast('¡Documentos unidos y descargados con éxito!');
    } catch (err) {
      console.error('Error merging PDFs:', err);
      showToast('Hubo un error al unir los archivos.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePreview = async () => {
    if (items.length < 2) {
      showToast('Por favor agrega al menos 2 archivos para previsualizar.', 'info');
      return;
    }
    setIsProcessing(true);
    try {
      const mergedBytes = await mergePdfs(
        items.map((it) => ({ file: it.file, pageRanges: it.pageRanges }))
      );
      const blob = new Blob([mergedBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      setPreviewUrl(url);
      showToast('Vista previa generada');
    } catch (err) {
      console.error('Error generating preview:', err);
      showToast('Error al generar la vista previa.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const totalPages = items.reduce((acc, it) => acc + it.pageCount, 0);

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8 select-none">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-100 text-blue-900 text-xs font-bold mb-2">
            <FilePlus2 size={13} className="text-blue-800" />
            <span>Unión de Documentos</span>
          </div>
          <h2 className="text-2xl font-black tracking-tight text-stone-900">
            Unir Múltiples PDFs
          </h2>
          <p className="text-xs text-stone-500 font-medium">
            Combina varios archivos en el orden exacto que necesites con rangos opcionales de páginas.
          </p>
        </div>

        {items.length > 0 && (
          <button
            onClick={() => setItems([])}
            className="self-start sm:self-center px-3.5 py-1.5 bg-[#eae4d9] hover:bg-stone-300 text-stone-800 rounded-xl text-xs font-bold transition-colors flex items-center gap-1 border border-[#ded7cc]"
          >
            <X size={14} />
            <span>Limpiar Todo</span>
          </button>
        )}
      </div>

      {/* Upload Zone */}
      {items.length === 0 ? (
        <StudioDropzone
          onFilesSelected={handleFilesSelected}
          multiple={true}
          title="Selecciona o Arrastra los PDFs a Unir"
          subtitle="Puedes agregar múltiples documentos a la vez."
          buttonText="Seleccionar Archivos PDF"
          icon={<FilePlus2 size={34} className="text-amber-400" />}
        />
      ) : (
        <div className="space-y-4">
          <StudioDropzone
            onFilesSelected={handleFilesSelected}
            multiple={true}
            compact={true}
            buttonText="+ Añadir más PDFs a la lista"
          />

          {/* Items List */}
          <div className="bg-[#f7f5f0] border border-[#ded7cc] rounded-3xl shadow-xl overflow-hidden">
            <div className="p-4 bg-[#eae4d9] border-b border-[#ded7cc] flex justify-between items-center">
              <span className="text-xs font-black text-stone-800 uppercase tracking-wider">
                Archivos en orden de unión ({items.length})
              </span>
              <span className="text-xs font-black bg-blue-100 text-blue-950 px-3 py-1 rounded-full border border-blue-200">
                {totalPages} páginas en total
              </span>
            </div>

            <ul className="divide-y divide-[#ded7cc]">
              {items.map((item, index) => (
                <li
                  key={item.id}
                  className="p-3.5 flex items-center justify-between gap-3 hover:bg-[#efece6] transition-colors"
                >
                  <div className="flex items-center space-x-3 overflow-hidden flex-1">
                    <span className="text-xs font-black text-stone-400 w-5 text-center">
                      #{index + 1}
                    </span>

                    {item.thumbnailUrl ? (
                      <img
                        src={item.thumbnailUrl}
                        alt="Miniatura"
                        className="w-10 h-13 object-cover rounded-xl border border-[#ded7cc] shadow-2xs shrink-0"
                      />
                    ) : (
                      <div className="p-2.5 bg-[#eae4d9] text-blue-800 rounded-xl border border-[#ded7cc] shrink-0">
                        <FileIcon size={18} />
                      </div>
                    )}

                    <div className="truncate flex-1">
                      <span className="text-xs font-black text-stone-900 block truncate">
                        {item.file.name}
                      </span>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-stone-500 font-bold">
                          {item.pageCount} {item.pageCount === 1 ? 'pág' : 'págs'}
                        </span>
                        <span className="text-stone-300">•</span>
                        <input
                          type="text"
                          placeholder="Todas (o ej: 1-3, 5)"
                          value={item.pageRanges}
                          onChange={(e) => {
                            const val = e.target.value;
                            setItems((prev) =>
                              prev.map((it, idx) => (idx === index ? { ...it, pageRanges: val } : it))
                            );
                          }}
                          className="text-[10px] bg-white border border-[#ded7cc] rounded-lg px-2 py-0.5 w-32 outline-none font-bold text-stone-800"
                          title="Filtro de páginas a incluir"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-1 shrink-0">
                    <button
                      onClick={() => moveFile(index, 'up')}
                      disabled={index === 0}
                      className="p-1.5 text-stone-600 hover:text-black hover:bg-stone-200 disabled:opacity-20 rounded-lg transition-colors"
                      title="Mover arriba"
                    >
                      <MoveUp size={15} />
                    </button>
                    <button
                      onClick={() => moveFile(index, 'down')}
                      disabled={index === items.length - 1}
                      className="p-1.5 text-stone-600 hover:text-black hover:bg-stone-200 disabled:opacity-20 rounded-lg transition-colors"
                      title="Mover abajo"
                    >
                      <MoveDown size={15} />
                    </button>
                    <button
                      onClick={() => removeFile(index)}
                      className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-100/60 rounded-lg transition-colors"
                      title="Eliminar de la lista"
                    >
                      <X size={15} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>

            {/* Bottom Actions */}
            <div className="p-4 bg-[#eae4d9] border-t border-[#ded7cc] flex flex-col sm:flex-row items-center justify-between gap-3">
              <span className="text-xs font-bold text-stone-600">
                Arrastra o usa las flechas para ordenar antes de unir.
              </span>

              <div className="flex items-center space-x-2.5 w-full sm:w-auto justify-end">
                <button
                  onClick={handlePreview}
                  disabled={isProcessing || items.length < 2}
                  className="flex items-center space-x-1.5 px-4 py-2.5 bg-white hover:bg-stone-100 text-stone-800 rounded-2xl text-xs font-black border border-[#ded7cc] shadow-xs transition-all active:scale-95 disabled:opacity-50"
                >
                  <Eye size={14} />
                  <span>Previsualizar</span>
                </button>

                <button
                  onClick={handleMerge}
                  disabled={isProcessing || items.length < 2}
                  className="flex items-center space-x-2 bg-[#18181b] hover:bg-black text-white px-6 py-2.5 rounded-2xl text-xs font-black shadow-md transition-all active:scale-95 disabled:opacity-50"
                >
                  {isProcessing ? (
                    <div className="w-4 h-4 border-2 border-stone-200 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Download size={14} />
                  )}
                  <span>Unir PDFs y Descargar</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewUrl && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#f7f5f0] rounded-3xl w-full max-w-4xl h-[85vh] flex flex-col shadow-2xl overflow-hidden border border-[#ded7cc]">
            <div className="p-4 border-b border-[#ded7cc] flex justify-between items-center bg-[#eae4d9]">
              <span className="text-sm font-black text-stone-900">Vista Previa de Documentos Unidos</span>
              <button
                onClick={() => setPreviewUrl(null)}
                className="p-1.5 text-stone-600 hover:text-black rounded-xl hover:bg-stone-300"
              >
                <X size={18} />
              </button>
            </div>
            <iframe src={previewUrl} className="flex-1 w-full h-full border-none" title="Vista previa" />
          </div>
        </div>
      )}
    </div>
  );
}
