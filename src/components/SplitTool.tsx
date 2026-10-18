import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import {
  extractPages,
  splitPdfToZip,
  splitPdfByRangeGroups,
  downloadFile,
  parsePageRanges,
} from '../lib/pdfCore';
import { loadPdfJsDocument, generateThumbnails } from '../lib/pdfViewer';
import { PageThumbnail } from '../types/pdf';
import {
  UploadCloud,
  File as FileIcon,
  Scissors,
  X,
  CheckSquare,
  Square,
  Archive,
  Download,
  Check,
} from 'lucide-react';

export default function SplitTool() {
  const [file, setFile] = useState<File | null>(null);
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [pageCount, setPageCount] = useState<number>(0);
  const [thumbnails, setThumbnails] = useState<PageThumbnail[]>([]);
  const [selectedPages, setSelectedPages] = useState<Set<number>>(new Set());

  // Modes: 'extract_single' | 'extract_zip' | 'ranges_zip' | 'delete_pages'
  const [mode, setMode] = useState<'extract_single' | 'extract_zip' | 'ranges_zip' | 'delete_pages'>('extract_single');
  const [rangeInput, setRangeInput] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isLoadingDoc, setIsLoadingDoc] = useState<boolean>(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      setIsLoadingDoc(true);
      try {
        const doc = await loadPdfJsDocument(selectedFile);
        setPdfDoc(doc);
        setPageCount(doc.numPages);
        setSelectedPages(new Set());
        setRangeInput('');

        const thumbs = await generateThumbnails(doc, 140);
        setThumbnails(thumbs);
      } catch (err) {
        console.error('Error loading PDF for split:', err);
        alert('No se pudo cargar el PDF.');
        setFile(null);
      } finally {
        setIsLoadingDoc(false);
      }
    }
  };

  const togglePageSelection = (pageIndex: number) => {
    setSelectedPages((prev) => {
      const next = new Set(prev);
      if (next.has(pageIndex)) next.delete(pageIndex);
      else next.add(pageIndex);
      return next;
    });
  };

  const selectAll = () => {
    setSelectedPages(new Set(Array.from({ length: pageCount }, (_, i) => i)));
  };

  const clearSelection = () => {
    setSelectedPages(new Set());
  };

  const invertSelection = () => {
    const next = new Set<number>();
    for (let i = 0; i < pageCount; i++) {
      if (!selectedPages.has(i)) next.add(i);
    }
    setSelectedPages(next);
  };

  // Sync range input with selected pages if in range mode
  const handleRangeInputChange = (val: string) => {
    setRangeInput(val);
    if (mode !== 'ranges_zip') {
      const parsed = parsePageRanges(val, pageCount);
      setSelectedPages(new Set(parsed));
    }
  };

  const handleProcess = async () => {
    if (!file) return;
    setIsProcessing(true);

    try {
      const baseName = file.name.replace(/\.[^/.]+$/, '');

      if (mode === 'extract_single') {
        const indices = (Array.from(selectedPages) as number[]).sort((a: number, b: number) => a - b);
        if (indices.length === 0) {
          alert('Por favor selecciona al menos una página para extraer.');
          setIsProcessing(false);
          return;
        }
        const bytes = await extractPages(file, indices);
        downloadFile(bytes, `${baseName}_extraido.pdf`);
      } else if (mode === 'extract_zip') {
        const indices =
          selectedPages.size > 0
            ? (Array.from(selectedPages) as number[]).sort((a: number, b: number) => a - b)
            : undefined;
        const zipBlob = await splitPdfToZip(file, indices);
        downloadFile(zipBlob, `${baseName}_paginas_individuales.zip`, 'application/zip');
      } else if (mode === 'ranges_zip') {
        const groups = rangeInput.split(';').map((s) => s.trim()).filter(Boolean);
        if (groups.length === 0) {
          alert('Ingresa los grupos de rangos separados por punto y coma. Ej: 1-3; 4-6; 7-10');
          setIsProcessing(false);
          return;
        }
        const zipBlob = await splitPdfByRangeGroups(file, groups);
        downloadFile(zipBlob, `${baseName}_dividido_por_partes.zip`, 'application/zip');
      } else if (mode === 'delete_pages') {
        const keepIndices: number[] = [];
        for (let i = 0; i < pageCount; i++) {
          if (!selectedPages.has(i)) keepIndices.push(i);
        }
        if (keepIndices.length === 0) {
          alert('No puedes eliminar todas las páginas del documento.');
          setIsProcessing(false);
          return;
        }
        const bytes = await extractPages(file, keepIndices);
        downloadFile(bytes, `${baseName}_paginas_eliminadas.pdf`);
      }

      confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
    } catch (err) {
      console.error('Error processing split:', err);
      alert('Hubo un error al dividir el PDF.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold tracking-tight text-slate-800">Dividir y Extraer Páginas</h2>
        <p className="text-sm text-slate-500">
          Extrae páginas específicas, separa en PDFs individuales (ZIP), divide por rangos o elimina páginas no deseadas.
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
            <UploadCloud size={32} />
          </div>
          <p className="text-sm font-bold text-slate-800">Selecciona un archivo PDF para dividir</p>
          <p className="text-xs text-slate-400 mt-1 uppercase tracking-wider font-semibold">
            Visualiza todas las miniaturas y selecciona interactivamente
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Top Bar with file summary and modes */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col gap-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl border border-blue-100">
                  <FileIcon size={20} />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800">{file.name}</p>
                  <p className="text-xs text-slate-500 font-semibold">{pageCount} páginas en total</p>
                </div>
              </div>
              <button
                onClick={() => setFile(null)}
                className="text-xs px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg font-semibold transition-colors"
              >
                Cambiar archivo
              </button>
            </div>

            {/* Mode selection buttons */}
            <div>
              <label className="block text-[11px] uppercase font-bold tracking-wider text-slate-400 mb-2">
                Modo de División
              </label>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
                {[
                  { id: 'extract_single', label: 'Extraer en 1 PDF', desc: 'Une las páginas seleccionadas' },
                  { id: 'extract_zip', label: 'Separar en ZIP', desc: '1 PDF por cada página seleccionada' },
                  { id: 'ranges_zip', label: 'Dividir por Rangos', desc: 'Ej: 1-3; 4-6; 7-10 (ZIP)' },
                  { id: 'delete_pages', label: 'Eliminar Páginas', desc: 'Borra las seleccionadas' },
                ].map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setMode(m.id as any)}
                    className={`p-3 rounded-xl border-2 text-left transition-all ${
                      mode === m.id
                        ? 'border-blue-600 bg-blue-50/50 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <span className={`block text-xs font-bold ${mode === m.id ? 'text-blue-700' : 'text-slate-800'}`}>
                      {m.label}
                    </span>
                    <span className="text-[11px] text-slate-500 block mt-0.5">{m.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Range Input Field */}
            {mode === 'ranges_zip' ? (
              <div>
                <label className="block text-[11px] uppercase font-bold tracking-wider text-slate-400 mb-1.5">
                  Rangos a dividir (separados por punto y coma)
                </label>
                <input
                  type="text"
                  value={rangeInput}
                  onChange={(e) => setRangeInput(e.target.value)}
                  placeholder="Ej: 1-3; 4-7; 8-10"
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            ) : (
              <div>
                <label className="block text-[11px] uppercase font-bold tracking-wider text-slate-400 mb-1.5">
                  Filtro por Rango de Texto
                </label>
                <input
                  type="text"
                  value={rangeInput}
                  onChange={(e) => handleRangeInputChange(e.target.value)}
                  placeholder="Ej: 1-4, 7, 9-12 (o haz clic abajo en las miniaturas)"
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            )}
          </div>

          {/* Thumbnail Selection Grid */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold text-slate-700">
                  {selectedPages.size} de {pageCount} páginas seleccionadas
                </span>
              </div>
              <div className="flex items-center space-x-2 text-xs">
                <button
                  onClick={selectAll}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold"
                >
                  Seleccionar Todo
                </button>
                <button
                  onClick={invertSelection}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold"
                >
                  Invertir
                </button>
                <button
                  onClick={clearSelection}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold"
                >
                  Limpiar
                </button>
              </div>
            </div>

            {/* Grid of Polaroid Pages */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {thumbnails.map((thumb) => {
                const isSelected = selectedPages.has(thumb.pageIndex);
                return (
                  <div
                    key={thumb.pageIndex}
                    onClick={() => togglePageSelection(thumb.pageIndex)}
                    className={`cursor-pointer polaroid-card rounded-2xl p-2.5 transition-all flex flex-col items-center gap-1.5 relative group ${
                      isSelected
                        ? 'ring-3 ring-amber-500 scale-102 shadow-lg -rotate-0.5'
                        : 'opacity-80 hover:opacity-100 hover:scale-102'
                    }`}
                  >
                    <div className="w-full bg-stone-100 rounded-xl overflow-hidden flex items-center justify-center min-h-[110px] relative border border-stone-200 shadow-inner">
                      <img
                        src={thumb.thumbnailUrl}
                        alt={`Página ${thumb.pageIndex + 1}`}
                        className="max-h-[110px] object-contain"
                      />
                      <div
                        className={`absolute top-1.5 right-1.5 rounded-full p-1 transition-all ${
                          isSelected ? 'bg-amber-500 text-stone-950 shadow-xs' : 'bg-stone-900/40 text-white opacity-0 group-hover:opacity-100'
                        }`}
                      >
                        <Check size={12} className="stroke-[3]" />
                      </div>
                    </div>
                    <span className={`text-xs font-black ${isSelected ? 'text-amber-800' : 'text-stone-600'}`}>
                      Página {thumb.pageIndex + 1}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Action Button */}
          <div className="flex justify-end">
            <button
              onClick={handleProcess}
              disabled={isProcessing || (mode !== 'ranges_zip' && selectedPages.size === 0)}
              className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-6 py-3 rounded-xl text-sm font-bold shadow-md transition-all"
            >
              {isProcessing ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : mode === 'extract_zip' || mode === 'ranges_zip' ? (
                <Archive size={18} />
              ) : (
                <Scissors size={18} />
              )}
              <span>
                {mode === 'extract_single'
                  ? 'Extraer Páginas Seleccionadas'
                  : mode === 'extract_zip'
                  ? 'Descargar en Archivo ZIP'
                  : mode === 'ranges_zip'
                  ? 'Dividir y Descargar ZIP'
                  : 'Eliminar Páginas y Descargar'}
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
