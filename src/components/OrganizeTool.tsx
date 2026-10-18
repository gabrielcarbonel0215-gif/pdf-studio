import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import { organizePdfPages, downloadFile, PageOrganizeAction } from '../lib/pdfCore';
import { loadPdfJsDocument, generateThumbnails } from '../lib/pdfViewer';
import { useToast } from './common/Toast';
import StudioDropzone from './common/StudioDropzone';
import {
  RotateCw,
  Copy,
  Trash2,
  Plus,
  Download,
  RotateCcw as ResetIcon,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  X,
  File as FileIcon,
} from 'lucide-react';

interface OrganizeItem {
  id: string;
  sourcePageIndex: number | 'blank';
  rotation: number;
  thumbnailUrl: string;
  label: string;
}

export default function OrganizeTool() {
  const { showToast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [items, setItems] = useState<OrganizeItem[]>([]);
  const [initialItems, setInitialItems] = useState<OrganizeItem[]>([]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const handleFilesSelected = async (files: File[]) => {
    if (!files || files.length === 0) return;
    const selectedFile = files[0];
    setFile(selectedFile);
    setIsProcessing(true);
    try {
      const doc = await loadPdfJsDocument(selectedFile);
      const thumbs = await generateThumbnails(doc, 160);

      const newItems: OrganizeItem[] = thumbs.map((t, idx) => ({
        id: Math.random().toString(36).substring(7),
        sourcePageIndex: idx,
        rotation: 0,
        thumbnailUrl: t.thumbnailUrl,
        label: `Página ${idx + 1}`,
      }));

      setItems(newItems);
      setInitialItems(JSON.parse(JSON.stringify(newItems)));
      showToast(`PDF cargado con ${newItems.length} páginas`);
    } catch (err) {
      console.error('Error loading PDF for organize:', err);
      showToast('No se pudo cargar el PDF.', 'error');
      setFile(null);
    } finally {
      setIsProcessing(false);
    }
  };

  // Drag and drop for desktop mouse
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnter = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    setItems((prev) => {
      const updated = [...prev];
      const dragged = updated[draggedIndex];
      updated.splice(draggedIndex, 1);
      updated.splice(index, 0, dragged);
      return updated;
    });
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  // 100% Mobile Touch-Friendly Reordering
  const moveItem = (index: number, direction: 'left' | 'right') => {
    const targetIndex = direction === 'left' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= items.length) return;
    setItems((prev) => {
      const updated = [...prev];
      const [moved] = updated.splice(index, 1);
      updated.splice(targetIndex, 0, moved);
      return updated;
    });
  };

  const rotateItem = (index: number, deg: number) => {
    setItems((prev) =>
      prev.map((item, idx) =>
        idx === index ? { ...item, rotation: (item.rotation + deg) % 360 } : item
      )
    );
  };

  const rotateAll = (deg: number) => {
    setItems((prev) =>
      prev.map((item) => ({ ...item, rotation: (item.rotation + deg) % 360 }))
    );
    showToast(`Todas las páginas rotadas ${deg}°`);
  };

  const duplicateItem = (index: number) => {
    setItems((prev) => {
      const target = prev[index];
      const copy: OrganizeItem = {
        ...target,
        id: Math.random().toString(36).substring(7),
        label: `${target.label} (Copia)`,
      };
      const updated = [...prev];
      updated.splice(index + 1, 0, copy);
      return updated;
    });
    showToast('Página duplicada');
  };

  const insertBlankPage = (afterIndex: number) => {
    setItems((prev) => {
      const blank: OrganizeItem = {
        id: Math.random().toString(36).substring(7),
        sourcePageIndex: 'blank',
        rotation: 0,
        thumbnailUrl: '',
        label: 'Página en Blanco',
      };
      const updated = [...prev];
      updated.splice(afterIndex + 1, 0, blank);
      return updated;
    });
    showToast('Página en blanco añadida');
  };

  const deleteItem = (index: number) => {
    if (items.length <= 1) {
      showToast('Debe quedar al menos una página en el documento.', 'error');
      return;
    }
    setItems((prev) => prev.filter((_, idx) => idx !== index));
    showToast('Página eliminada');
  };

  const resetAll = () => {
    setItems(JSON.parse(JSON.stringify(initialItems)));
    showToast('Orden original restaurado');
  };

  const handleSave = async () => {
    if (!file || items.length === 0) return;
    setIsProcessing(true);
    try {
      const actions: PageOrganizeAction[] = items.map((it) => ({
        id: it.id,
        sourcePageIndex: it.sourcePageIndex,
        rotation: it.rotation,
      }));

      const newBytes = await organizePdfPages(file, actions);
      const baseName = file.name.replace(/\.[^/.]+$/, '');
      downloadFile(newBytes, `${baseName}_organizado.pdf`);
      confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
      showToast('¡PDF reorganizado y descargado con éxito!');
    } catch (err) {
      console.error('Error organizing PDF:', err);
      showToast('Hubo un error al reorganizar el PDF.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 select-none">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-100 text-purple-900 text-xs font-bold mb-2">
            <LayoutGrid size={13} className="text-purple-800" />
            <span>Organizador Visual de Hojas</span>
          </div>
          <h2 className="text-2xl font-black tracking-tight text-stone-900">
            Reordenar, Rotar y Organizar Páginas
          </h2>
          <p className="text-xs text-stone-500 font-medium">
            Arrastra con el ratón o usa las flechas ◀ ▶ en celular para mover páginas.
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
          title="Abre un PDF para Organizar sus Páginas"
          subtitle="Reordena, rota individual o masivamente y añade hojas en blanco."
          buttonText="Seleccionar Archivo PDF"
          icon={<LayoutGrid size={34} className="text-amber-400" />}
        />
      ) : (
        <div className="space-y-6">
          {/* Action Toolbar */}
          <div className="bg-[#f7f5f0] border border-[#ded7cc] rounded-3xl p-4 sm:p-5 shadow-lg flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center space-x-3 w-full md:w-auto">
              <span className="p-2.5 bg-[#eae4d9] rounded-xl text-purple-950 border border-[#ded7cc]">
                <FileIcon size={20} />
              </span>
              <div>
                <span className="text-xs font-black text-stone-900 block truncate max-w-xs">{file.name}</span>
                <span className="text-[11px] text-stone-500 font-bold block">
                  {items.length} páginas en la nueva disposición
                </span>
              </div>
            </div>

            <div className="flex items-center space-x-2 flex-wrap justify-end w-full md:w-auto gap-y-2">
              <button
                onClick={() => rotateAll(90)}
                className="flex items-center space-x-1.5 text-xs font-black px-3.5 py-2 bg-[#eae4d9] hover:bg-stone-300 text-stone-800 rounded-xl border border-[#ded7cc] transition-colors active:scale-95"
                title="Rotar todas las páginas 90° horario"
              >
                <RotateCw size={13} />
                <span>Rotar Todo +90°</span>
              </button>

              <button
                onClick={() => insertBlankPage(items.length - 1)}
                className="flex items-center space-x-1.5 text-xs font-black px-3.5 py-2 bg-[#eae4d9] hover:bg-stone-300 text-stone-800 rounded-xl border border-[#ded7cc] transition-colors active:scale-95"
              >
                <Plus size={13} />
                <span>+ Hoja en Blanco</span>
              </button>

              <button
                onClick={resetAll}
                className="flex items-center space-x-1.5 text-xs font-black px-3 py-2 text-stone-500 hover:text-stone-900 rounded-xl transition-colors"
              >
                <ResetIcon size={13} />
                <span>Restablecer</span>
              </button>

              <button
                onClick={handleSave}
                disabled={isProcessing || items.length === 0}
                className="flex items-center space-x-2 bg-[#18181b] hover:bg-black disabled:opacity-50 text-white px-5 py-2.5 rounded-2xl text-xs font-black shadow-md transition-all active:scale-95"
              >
                {isProcessing ? (
                  <div className="w-4 h-4 border-2 border-stone-200 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Download size={15} />
                )}
                <span>Guardar y Descargar</span>
              </button>
            </div>
          </div>

          {/* Grid of Polaroid Pages with Touch Navigation */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-5">
            {items.map((item, index) => (
              <div
                key={item.id}
                draggable
                onDragStart={(e) => handleDragStart(e, index)}
                onDragEnter={(e) => handleDragEnter(e, index)}
                onDragOver={handleDragOver}
                onDragEnd={handleDragEnd}
                className={`polaroid-card rounded-2xl flex flex-col group relative bg-white p-3 shadow-md border border-[#ded7cc] transition-all ${
                  draggedIndex === index
                    ? 'opacity-40 scale-95 ring-2 ring-amber-500'
                    : 'hover:shadow-xl'
                }`}
              >
                {/* Thumbnail Display inside Polaroid Frame */}
                <div className="w-full bg-stone-100 rounded-xl overflow-hidden min-h-[160px] flex items-center justify-center relative border border-stone-200 shadow-inner">
                  {item.sourcePageIndex === 'blank' ? (
                    <div className="w-full h-[160px] bg-white border border-dashed border-stone-300 flex flex-col items-center justify-center text-stone-400">
                      <Plus size={24} className="mb-1 text-stone-300" />
                      <span className="text-[10px] font-bold">Hoja en Blanco</span>
                    </div>
                  ) : (
                    <img
                      src={item.thumbnailUrl}
                      alt={item.label}
                      className="max-w-full max-h-[160px] object-contain transition-transform duration-200"
                      style={{ transform: `rotate(${item.rotation}deg)` }}
                    />
                  )}

                  {/* Position badge */}
                  <span className="absolute top-2 left-2 bg-stone-900 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-xs">
                    #{index + 1}
                  </span>

                  {item.rotation !== 0 && (
                    <span className="absolute top-2 right-2 bg-amber-500 text-stone-950 text-[10px] font-black px-1.5 py-0.5 rounded-md shadow-xs">
                      {item.rotation}°
                    </span>
                  )}
                </div>

                {/* Tactile Arrow Navigation Buttons for Mobile and Quick Clicks */}
                <div className="flex items-center justify-between mt-2 pt-1 border-t border-stone-200">
                  <button
                    onClick={() => moveItem(index, 'left')}
                    disabled={index === 0}
                    className="p-1.5 text-stone-700 hover:text-black bg-stone-100 hover:bg-stone-200 disabled:opacity-30 rounded-lg transition-colors flex items-center gap-0.5 text-[10px] font-black active:scale-95"
                    title="Mover hacia la izquierda"
                  >
                    <ChevronLeft size={14} />
                    <span className="hidden sm:inline">Antes</span>
                  </button>

                  <button
                    onClick={() => moveItem(index, 'right')}
                    disabled={index === items.length - 1}
                    className="p-1.5 text-stone-700 hover:text-black bg-stone-100 hover:bg-stone-200 disabled:opacity-30 rounded-lg transition-colors flex items-center gap-0.5 text-[10px] font-black active:scale-95"
                    title="Mover hacia la derecha"
                  >
                    <span className="hidden sm:inline">Después</span>
                    <ChevronRight size={14} />
                  </button>
                </div>

                {/* Polaroid Bottom Actions (Rotate, Duplicate, Delete) */}
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-[11px] font-black text-stone-800 truncate max-w-[70px]">
                    {item.label}
                  </span>

                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => rotateItem(index, 90)}
                      title="Rotar 90°"
                      className="p-1.5 text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition-colors"
                    >
                      <RotateCw size={13} />
                    </button>
                    <button
                      onClick={() => duplicateItem(index)}
                      title="Duplicar página"
                      className="p-1.5 text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition-colors"
                    >
                      <Copy size={13} />
                    </button>
                    <button
                      onClick={() => deleteItem(index)}
                      title="Eliminar página"
                      className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
