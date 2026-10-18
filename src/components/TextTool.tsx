import React, { useState, useEffect } from 'react';
import { addTextToPdf, getPdfPageCount, downloadPdf, getPdfPageData, applyTextToPageBytes } from '../lib/pdfUtils';
import { UploadCloud, File as FileIcon, Type, Info, Maximize } from 'lucide-react';

export default function TextTool() {
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState<number>(0);
  
  const [text, setText] = useState('');
  const [page, setPage] = useState<number>(1);
  const [x, setX] = useState<number>(50);
  const [y, setY] = useState<number>(500);
  const [size, setSize] = useState<number>(24);
  const [addBackground, setAddBackground] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Live preview state
  const [basePageBytes, setBasePageBytes] = useState<Uint8Array | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [pageWidth, setPageWidth] = useState(600);
  const [pageHeight, setPageHeight] = useState(800);
  const [isRenderingPreview, setIsRenderingPreview] = useState(false);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      try {
        const count = await getPdfPageCount(selectedFile);
        setPageCount(count);
        setPage(1);
      } catch (err) {
        console.error(err);
        alert('El archivo no parece ser un PDF válido.');
        setFile(null);
      }
    }
  };

  // 1. Load the base page bytes when the selected file or page changes
  useEffect(() => {
    let active = true;
    const loadPage = async () => {
      if (!file || pageCount === 0) return;
      setIsRenderingPreview(true);
      try {
        const targetPage = Math.max(1, Math.min(page, pageCount)) - 1;
        const { bytes, width, height } = await getPdfPageData(file, targetPage);
        if (active) {
          setBasePageBytes(bytes);
          setPageWidth(width);
          setPageHeight(height);
          // Set sensible defaults if x/y are completely out of bounds for the new page
          if (x > width) setX(Math.round(width / 2));
          if (y > height) setY(Math.round(height / 2));
        }
      } catch (error) {
        console.error("Error loading page for preview", error);
      } finally {
        if (active) setIsRenderingPreview(false);
      }
    };
    loadPage();
    return () => { active = false; };
  }, [file, page, pageCount]);

  // 2. Generate preview when inputs change
  useEffect(() => {
    let active = true;
    let timer: any;
    const updatePreview = async () => {
      if (!basePageBytes) return;
      try {
        const updatedBytes = await applyTextToPageBytes(basePageBytes, text, x, y, size, addBackground);
        if (active) {
          const blob = new Blob([updatedBytes], { type: 'application/pdf' });
          const url = URL.createObjectURL(blob);
          setPreviewUrl(prev => {
            if (prev) URL.revokeObjectURL(prev);
            return url;
          });
        }
      } catch (error) {
        console.error("Error updating preview", error);
      }
    };

    // Debounce to keep the UI snappy when dragging sliders
    timer = setTimeout(updatePreview, 50);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [basePageBytes, text, x, y, size, addBackground]);

  const handleProcess = async () => {
    if (!file || !text.trim()) return;
    setIsProcessing(true);
    
    try {
      const targetPage = Math.max(1, Math.min(page, pageCount)) - 1; // 0-indexed
      const newPdfBytes = await addTextToPdf(file, text, targetPage, x, y, size, addBackground);
      downloadPdf(newPdfBytes, 'texto-anadido.pdf');
    } catch (error) {
      console.error('Error processing PDF', error);
      alert('Hubo un error al procesar el archivo.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <h2 className="text-2xl font-bold tracking-tight text-slate-800 mb-2">Añadir Texto al PDF</h2>
      <p className="text-sm text-slate-500 mb-6">Inserta nuevos cuadros de texto en tu documento o cubre texto existente con la vista previa interactiva.</p>

      {!file ? (
        <div className="max-w-3xl border-2 border-dashed border-slate-200 rounded-2xl p-8 mb-6 bg-slate-50/50 text-center hover:bg-slate-50 transition-colors relative">
          <input
            type="file"
            accept="application/pdf"
            onChange={handleFileChange}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          <UploadCloud className="mx-auto h-10 w-10 text-slate-400 mb-3" />
          <p className="text-sm font-medium text-slate-700">Selecciona un archivo PDF</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">
          
          {/* Panel de Controles */}
          <div className="lg:col-span-5 flex flex-col gap-5">
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5">
              <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-100">
                <div className="flex items-center space-x-3">
                  <div className="bg-blue-50 border border-blue-100 text-blue-600 p-2 rounded-xl">
                    <FileIcon size={16} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800 truncate max-w-[150px]">{file.name}</p>
                    <p className="text-xs text-slate-500 font-medium">{pageCount} páginas en total</p>
                  </div>
                </div>
                <button
                  onClick={() => setFile(null)}
                  className="text-xs px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 font-medium"
                >
                  Cambiar archivo
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] uppercase font-bold tracking-widest text-slate-400 mb-2">Texto a añadir</label>
                  <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Escribe tu texto aquí..."
                    rows={3}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow text-sm text-slate-800"
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-[10px] uppercase font-bold tracking-widest text-slate-400">Página ({page}/{pageCount})</label>
                  </div>
                  <div className="flex gap-4 items-center">
                    <input
                      type="range"
                      min={1}
                      max={pageCount}
                      value={page}
                      onChange={(e) => setPage(parseInt(e.target.value) || 1)}
                      className="flex-1 accent-blue-600"
                    />
                    <input
                      type="number"
                      min={1}
                      max={pageCount}
                      value={page}
                      onChange={(e) => setPage(parseInt(e.target.value) || 1)}
                      className="w-16 px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-center focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 space-y-4">
              <div>
                <label className="block text-[10px] uppercase font-bold tracking-widest text-slate-400 mb-2">Posición Horizontal (X)</label>
                <div className="flex gap-4 items-center">
                  <input
                    type="range"
                    min={0}
                    max={Math.round(pageWidth)}
                    value={x}
                    onChange={(e) => setX(parseInt(e.target.value) || 0)}
                    className="flex-1 accent-blue-600"
                  />
                  <input
                    type="number"
                    value={x}
                    onChange={(e) => setX(parseInt(e.target.value) || 0)}
                    className="w-20 px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-center focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-[10px] uppercase font-bold tracking-widest text-slate-400">Posición Vertical (Y)</label>
                  <span className="text-[10px] text-slate-400 font-medium">(0 es la base de la hoja)</span>
                </div>
                <div className="flex gap-4 items-center">
                  <input
                    type="range"
                    min={0}
                    max={Math.round(pageHeight)}
                    value={y}
                    onChange={(e) => setY(parseInt(e.target.value) || 0)}
                    className="flex-1 accent-blue-600"
                  />
                  <input
                    type="number"
                    value={y}
                    onChange={(e) => setY(parseInt(e.target.value) || 0)}
                    className="w-20 px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-center focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold tracking-widest text-slate-400 mb-2">Tamaño de fuente</label>
                <div className="flex gap-4 items-center">
                  <input
                    type="range"
                    min={8}
                    max={72}
                    value={size}
                    onChange={(e) => setSize(parseInt(e.target.value) || 12)}
                    className="flex-1 accent-blue-600"
                  />
                  <input
                    type="number"
                    value={size}
                    onChange={(e) => setSize(parseInt(e.target.value) || 12)}
                    className="w-20 px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-center focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              <div className="pt-2">
                <label className="flex items-center space-x-3 cursor-pointer p-3 bg-slate-50 border border-slate-200 rounded-xl hover:border-slate-300 transition-colors">
                  <input
                    type="checkbox"
                    checked={addBackground}
                    onChange={(e) => setAddBackground(e.target.checked)}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                  />
                  <span className="text-sm font-medium text-slate-700">Añadir fondo blanco (cubre el texto detrás)</span>
                </label>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end">
                <button
                  onClick={handleProcess}
                  disabled={!text.trim() || isProcessing}
                  className="w-full flex items-center justify-center space-x-2 bg-blue-600 text-white px-5 py-3 rounded-xl text-sm font-medium shadow-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isProcessing ? (
                    <span>Generando PDF final...</span>
                  ) : (
                    <>
                      <Type size={18} />
                      <span>Aplicar Texto y Descargar PDF</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Panel de Vista Previa */}
          <div className="lg:col-span-7 bg-slate-200/50 rounded-2xl border border-slate-200 overflow-hidden relative flex flex-col shadow-inner min-h-[600px]">
            <div className="p-3 bg-white border-b border-slate-200 flex justify-between items-center z-10 shadow-sm">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <Maximize size={12} className="text-blue-500" />
                Vista Previa en Vivo
              </span>
              {isRenderingPreview ? (
                <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-bold animate-pulse">Cargando...</span>
              ) : (
                <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold">Página {page}</span>
              )}
            </div>
            
            <div className="flex-1 relative flex items-center justify-center p-4">
              {previewUrl ? (
                <iframe 
                  src={`${previewUrl}#toolbar=0&navpanes=0&scrollbar=0`} 
                  className="w-full h-full border border-slate-300 shadow-md bg-white rounded-lg" 
                  title="PDF Live Preview" 
                />
              ) : (
                <div className="text-slate-400 text-sm font-medium flex flex-col items-center gap-3">
                  <div className="w-12 h-12 border-4 border-slate-200 border-t-blue-500 rounded-full animate-spin" />
                  Generando vista previa...
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
