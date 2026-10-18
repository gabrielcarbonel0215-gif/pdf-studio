import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { mergePdfs, downloadFile } from '../lib/pdfCore';
import { loadPdfJsDocument, generateThumbnails } from '../lib/pdfViewer';
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
} from 'lucide-react';

interface PdfFileItem {
  id: string;
  file: File;
  pageCount: number;
  thumbnailUrl?: string;
  pageRanges: string; // e.g. "1-5, 8"
}

export default function MergeTool() {
  const [items, setItems] = useState<PdfFileItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    setIsProcessing(true);
    const newFiles = Array.from(e.target.files) as File[];
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
        alert(`El archivo ${f.name} no parece ser un PDF válido.`);
      }
    }

    setItems((prev) => [...prev, ...newItems]);
    setIsProcessing(false);
  };

  const removeFile = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
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
    if (items.length < 2) return;
    setIsProcessing(true);
    try {
      const mergedBytes = await mergePdfs(
        items.map((it) => ({ file: it.file, pageRanges: it.pageRanges }))
      );
      downloadFile(mergedBytes, 'documentos_unidos.pdf');
      confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
    } catch (err) {
      console.error('Error merging PDFs:', err);
      alert('Hubo un error al unir los archivos.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePreview = async () => {
    if (items.length < 2) return;
    setIsProcessing(true);
    try {
      const mergedBytes = await mergePdfs(
        items.map((it) => ({ file: it.file, pageRanges: it.pageRanges }))
      );
      const blob = new Blob([mergedBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      setPreviewUrl(url);
    } catch (err) {
      console.error('Error creating preview:', err);
      alert('No se pudo generar la vista previa.');
    } finally {
      setIsProcessing(false);
    }
  };

  const totalPages = items.reduce((acc, it) => acc + it.pageCount, 0);

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold tracking-tight text-slate-800">Unir PDFs</h2>
        <p className="text-sm text-slate-500">
          Combina múltiples documentos PDF en un solo archivo con reordenación y rangos de páginas por archivo.
        </p>
      </div>

      {/* Upload Zone */}
      <div className="border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-3xl p-8 mb-6 bg-white text-center transition-all relative group shadow-xs">
        <input
          type="file"
          multiple
          accept="application/pdf"
          onChange={handleFileChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
        />
        <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-3 group-hover:scale-105 transition-transform">
          <UploadCloud size={28} />
        </div>
        <p className="text-sm font-bold text-slate-800">Haz clic o arrastra aquí varios archivos PDF</p>
        <p className="text-xs text-slate-400 mt-1 uppercase tracking-wider font-semibold">
          Puedes agregar tantos archivos como necesites
        </p>
      </div>

      {/* Items List */}
      {items.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden mb-6">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
              Archivos en orden de unión ({items.length})
            </span>
            <span className="text-xs font-bold bg-blue-100 text-blue-700 px-3 py-1 rounded-full">
              {totalPages} páginas en total
            </span>
          </div>

          <ul className="divide-y divide-slate-100">
            {items.map((item, index) => (
              <li
                key={item.id}
                className="p-4 flex items-center justify-between gap-4 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center space-x-3 overflow-hidden flex-1">
                  <div className="text-slate-400 cursor-grab">
                    <GripVertical size={18} />
                  </div>

                  {item.thumbnailUrl ? (
                    <img
                      src={item.thumbnailUrl}
                      alt="Miniatura"
                      className="w-10 h-13 object-cover rounded-lg border border-slate-200 shadow-2xs"
                    />
                  ) : (
                    <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl border border-blue-100">
                      <FileIcon size={20} />
                    </div>
                  )}

                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="text-sm font-bold text-slate-800 truncate">{item.file.name}</span>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs font-semibold text-slate-500">
                        {item.pageCount} páginas
                      </span>
                      <div className="flex items-center gap-1.5">
                        <SlidersHorizontal size={13} className="text-slate-400" />
                        <input
                          type="text"
                          value={item.pageRanges}
                          onChange={(e) => {
                            const val = e.target.value;
                            setItems((prev) =>
                              prev.map((it, idx) => (idx === index ? { ...it, pageRanges: val } : it))
                            );
                          }}
                          placeholder="Todas las páginas (ej. 1-3, 5)"
                          className="text-xs px-2 py-0.5 bg-slate-50 border border-slate-200 rounded-md outline-none w-48 focus:border-blue-500 focus:bg-white"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => moveFile(index, 'up')}
                    disabled={index === 0}
                    title="Mover arriba"
                    className="p-2 text-slate-400 hover:text-slate-700 disabled:opacity-20 rounded-lg hover:bg-slate-100"
                  >
                    <MoveUp size={16} />
                  </button>
                  <button
                    onClick={() => moveFile(index, 'down')}
                    disabled={index === items.length - 1}
                    title="Mover abajo"
                    className="p-2 text-slate-400 hover:text-slate-700 disabled:opacity-20 rounded-lg hover:bg-slate-100"
                  >
                    <MoveDown size={16} />
                  </button>
                  <button
                    onClick={() => removeFile(index)}
                    title="Quitar"
                    className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg ml-1"
                  >
                    <X size={16} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex justify-end items-center gap-3">
        {items.length >= 2 && (
          <button
            onClick={handlePreview}
            disabled={isProcessing}
            className="flex items-center space-x-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-5 py-2.5 rounded-xl text-sm font-bold shadow-xs transition-colors"
          >
            <Eye size={17} />
            <span>Vista Previa</span>
          </button>
        )}

        <button
          onClick={handleMerge}
          disabled={items.length < 2 || isProcessing}
          className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl text-sm font-bold shadow-sm disabled:opacity-50 transition-all hover:shadow-md"
        >
          {isProcessing ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <Download size={17} />
          )}
          <span>Unir y Descargar PDF</span>
        </button>
      </div>

      {/* Live Preview Modal */}
      {previewUrl && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex flex-col p-6">
          <div className="flex justify-between items-center mb-3 bg-white p-3.5 rounded-2xl shadow-lg">
            <h3 className="font-bold text-slate-800 text-sm">Vista Previa: Documento Fusionado</h3>
            <button
              onClick={() => setPreviewUrl(null)}
              className="p-1.5 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100"
            >
              <X size={20} />
            </button>
          </div>
          <div className="flex-1 bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200">
            <iframe src={previewUrl} className="w-full h-full border-none" title="PDF Preview" />
          </div>
        </div>
      )}
    </div>
  );
}
