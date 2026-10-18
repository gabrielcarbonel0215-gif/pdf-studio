import React, { useState } from 'react';
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
import { useToast } from './common/Toast';
import StudioDropzone from './common/StudioDropzone';
import {
  File as FileIcon,
  Scissors,
  X,
  CheckSquare,
  Square,
  Archive,
  Download,
  Check,
  Layers,
} from 'lucide-react';

export default function SplitTool() {
  const { showToast } = useToast();
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

  const handleFilesSelected = async (files: File[]) => {
    if (!files || files.length === 0) return;
    const selectedFile = files[0];
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
      showToast(`PDF cargado con ${doc.numPages} páginas`);
    } catch (err) {
      console.error('Error loading PDF for split:', err);
      showToast('No se pudo cargar el PDF.', 'error');
      setFile(null);
    } finally {
      setIsLoadingDoc(false);
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
    showToast('Todas las páginas seleccionadas');
  };

  const clearSelection = () => {
    setSelectedPages(new Set());
    showToast('Selección limpiada');
  };

  const invertSelection = () => {
    const next = new Set<number>();
    for (let i = 0; i < pageCount; i++) {
      if (!selectedPages.has(i)) next.add(i);
    }
    setSelectedPages(next);
    showToast('Selección invertida');
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
          showToast('Por favor selecciona al menos una página para extraer.', 'info');
          setIsProcessing(false);
          return;
        }
        const bytes = await extractPages(file, indices);
        downloadFile(bytes, `${baseName}_extraido.pdf`);
        showToast('¡Páginas extraídas y descargadas!');
      } else if (mode === 'extract_zip') {
        const indices =
          selectedPages.size > 0
            ? (Array.from(selectedPages) as number[]).sort((a: number, b: number) => a - b)
            : undefined;
        const zipBlob = await splitPdfToZip(file, indices);
        downloadFile(zipBlob, `${baseName}_paginas_individuales.zip`, 'application/zip');
        showToast('¡Archivo ZIP con páginas individuales generado!');
      } else if (mode === 'ranges_zip') {
        const groups = rangeInput.split(';').map((s) => s.trim()).filter(Boolean);
        if (groups.length === 0) {
          showToast('Ingresa los grupos de rangos separados por punto y coma (ej: 1-3; 4-6)', 'info');
          setIsProcessing(false);
          return;
        }
        const zipBlob = await splitPdfByRangeGroups(file, groups);
        downloadFile(zipBlob, `${baseName}_dividido_por_partes.zip`, 'application/zip');
        showToast('¡Documento dividido por partes generado en ZIP!');
      } else if (mode === 'delete_pages') {
        const keepIndices: number[] = [];
        for (let i = 0; i < pageCount; i++) {
          if (!selectedPages.has(i)) keepIndices.push(i);
        }
        if (keepIndices.length === 0) {
          showToast('No puedes eliminar todas las páginas del documento.', 'error');
          setIsProcessing(false);
          return;
        }
        const bytes = await extractPages(file, keepIndices);
        downloadFile(bytes, `${baseName}_paginas_eliminadas.pdf`);
        showToast('¡PDF con páginas eliminadas generado!');
      }

      confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
    } catch (err) {
      console.error('Error processing split:', err);
      showToast('Hubo un error al dividir el PDF.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 lg:p-8 select-none">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-100 text-rose-900 text-xs font-bold mb-2">
            <Scissors size={13} className="text-rose-800" />
            <span>División & Extracción</span>
          </div>
          <h2 className="text-2xl font-black tracking-tight text-stone-900">
            Dividir y Extraer Páginas
          </h2>
          <p className="text-xs text-stone-500 font-medium">
            Extrae páginas específicas, separa en PDFs individuales (ZIP) o elimina páginas innecesarias.
          </p>
        </div>

        {file && (
          <button
            onClick={() => setFile(null)}
            className="self-start sm:self-center px-3.5 py-1.5 bg-[#eae4d9] hover:bg-stone-300 text-stone-800 rounded-xl text-xs font-bold transition-colors flex items-center gap-1 border border-[#ded7cc]"
          >
            <X size={14} />
            <span>Cargar otro PDF</span>
          </button>
        )}
      </div>

      {!file ? (
        <StudioDropzone
          onFilesSelected={handleFilesSelected}
          title="Selecciona un PDF para Dividir o Extraer"
          subtitle="Visualiza todas las miniaturas y selecciona interactivamente con 1 toque."
          buttonText="Seleccionar Archivo PDF"
          icon={<Scissors size={34} className="text-amber-400" />}
        />
      ) : (
        <div className="space-y-6">
          {/* Top Bar with file summary and modes */}
          <div className="bg-[#f7f5f0] border border-[#ded7cc] rounded-3xl p-5 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#ded7cc] gap-3">
              <div className="flex items-center space-x-3 overflow-hidden">
                <span className="p-2.5 bg-[#eae4d9] rounded-xl text-rose-950 border border-[#ded7cc] shrink-0">
                  <FileIcon size={20} />
                </span>
                <div className="truncate">
                  <span className="text-xs font-black text-stone-900 block truncate">{file.name}</span>
                  <span className="text-[10px] text-stone-500 font-bold">
                    {pageCount} páginas • {selectedPages.size} seleccionadas
                  </span>
                </div>
              </div>

              {/* Selection quick pills */}
              <div className="flex items-center space-x-2 text-xs">
                <button
                  onClick={selectAll}
                  className="px-2.5 py-1.5 bg-[#eae4d9] hover:bg-stone-300 text-stone-800 rounded-xl font-bold transition-colors"
                >
                  Todas
                </button>
                <button
                  onClick={clearSelection}
                  className="px-2.5 py-1.5 bg-[#eae4d9] hover:bg-stone-300 text-stone-800 rounded-xl font-bold transition-colors"
                >
                  Ninguna
                </button>
                <button
                  onClick={invertSelection}
                  className="px-2.5 py-1.5 bg-[#eae4d9] hover:bg-stone-300 text-stone-800 rounded-xl font-bold transition-colors"
                >
                  Invertir
                </button>
              </div>
            </div>

            {/* Split Mode Tabs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
              {[
                { id: 'extract_single', label: 'Extraer Seleccionadas', desc: 'Crea 1 PDF con las hojas elegidas' },
                { id: 'extract_zip', label: 'Separar Todo a ZIP', desc: 'Cada hoja en su propio archivo PDF' },
                { id: 'ranges_zip', label: 'Dividir por Rangos', desc: 'Ej: 1-3; 4-6 empaquetado en ZIP' },
                { id: 'delete_pages', label: 'Eliminar Seleccionadas', desc: 'Descarta las hojas marcadas' },
              ].map((m) => (
                <button
                  key={m.id}
                  onClick={() => setMode(m.id as any)}
                  className={`p-3 rounded-2xl border-2 text-left transition-all ${
                    mode === m.id
                      ? 'border-rose-700 bg-rose-50/70 shadow-xs'
                      : 'border-[#ded7cc] bg-white hover:border-stone-400'
                  }`}
                >
                  <span className="block text-xs font-black text-stone-900">{m.label}</span>
                  <span className="block text-[10px] text-stone-500 font-medium mt-0.5">{m.desc}</span>
                </button>
              ))}
            </div>

            {/* Range input for ranges_zip */}
            {mode === 'ranges_zip' && (
              <div className="p-3 bg-white rounded-2xl border border-[#ded7cc]">
                <label className="block text-[10px] font-black uppercase text-stone-500 mb-1">
                  Escribe los grupos de páginas separados por punto y coma (;)
                </label>
                <input
                  type="text"
                  placeholder="Ej: 1-3; 4-7; 8-10"
                  value={rangeInput}
                  onChange={(e) => handleRangeInputChange(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-bold border border-[#ded7cc] rounded-xl outline-none focus:border-stone-800"
                />
              </div>
            )}

            {/* Process Action Button */}
            <div className="flex justify-end pt-2">
              <button
                onClick={handleProcess}
                disabled={isProcessing}
                className="flex items-center space-x-2 bg-[#18181b] hover:bg-black text-white px-6 py-2.5 rounded-2xl text-xs font-black shadow-md transition-all active:scale-95 disabled:opacity-50"
              >
                {isProcessing ? (
                  <div className="w-4 h-4 border-2 border-stone-200 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Download size={15} />
                )}
                <span>
                  {mode === 'extract_single' && 'Extraer Páginas y Descargar'}
                  {mode === 'extract_zip' && 'Descargar ZIP con Hojas Individuales'}
                  {mode === 'ranges_zip' && 'Dividir en Grupos y Descargar ZIP'}
                  {mode === 'delete_pages' && 'Eliminar Páginas y Descargar PDF'}
                </span>
              </button>
            </div>
          </div>

          {/* Interactive Thumbnails Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3.5 sm:gap-4">
            {thumbnails.map((thumb) => {
              const isSelected = selectedPages.has(thumb.pageIndex);
              return (
                <div
                  key={thumb.pageIndex}
                  onClick={() => togglePageSelection(thumb.pageIndex)}
                  className={`bg-white p-2.5 rounded-2xl border transition-all cursor-pointer shadow-xs relative group ${
                    isSelected
                      ? 'border-rose-600 ring-2 ring-rose-400 bg-rose-50/30 shadow-md scale-[1.02]'
                      : 'border-[#ded7cc] hover:border-stone-400'
                  }`}
                >
                  <div className="w-full bg-stone-100 rounded-xl overflow-hidden min-h-[140px] flex items-center justify-center border border-stone-200 mb-2">
                    <img
                      src={thumb.thumbnailUrl}
                      alt={`Página ${thumb.pageNumber}`}
                      className="max-w-full max-h-[140px] object-contain"
                    />
                  </div>

                  <div className="flex items-center justify-between px-1">
                    <span className="text-[11px] font-black text-stone-800">
                      Pág {thumb.pageNumber}
                    </span>
                    <span
                      className={`w-5 h-5 rounded-lg flex items-center justify-center text-xs ${
                        isSelected
                          ? 'bg-rose-600 text-white'
                          : 'border border-stone-300 text-transparent group-hover:border-stone-500'
                      }`}
                    >
                      <Check size={12} />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
