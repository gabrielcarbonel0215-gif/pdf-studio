import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import { organizePdfPages, downloadFile, PageOrganizeAction } from '../lib/pdfCore';
import { loadPdfJsDocument, generateThumbnails } from '../lib/pdfViewer';
import { PageThumbnail } from '../types/pdf';
import {
  UploadCloud,
  File as FileIcon,
  RotateCw,
  RotateCcw,
  Copy,
  Trash2,
  Plus,
  GripVertical,
  Download,
  RotateCcw as ResetIcon,
} from 'lucide-react';

interface OrganizeItem {
  id: string;
  sourcePageIndex: number | 'blank';
  rotation: number;
  thumbnailUrl: string;
  label: string;
}

export default function OrganizeTool() {
  const [file, setFile] = useState<File | null>(null);
  const [items, setItems] = useState<OrganizeItem[]>([]);
  const [initialItems, setInitialItems] = useState<OrganizeItem[]>([]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
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
      } catch (err) {
        console.error('Error loading PDF for organize:', err);
        alert('No se pudo cargar el PDF.');
        setFile(null);
      } finally {
        setIsProcessing(false);
      }
    }
  };

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
  };

  const deleteItem = (index: number) => {
    if (items.length <= 1) {
      alert('Debe quedar al menos una página.');
      return;
    }
    setItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  const resetAll = () => {
    setItems(JSON.parse(JSON.stringify(initialItems)));
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
    } catch (err) {
      console.error('Error organizing PDF:', err);
      alert('Hubo un error al generar el PDF organizado.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold tracking-tight text-slate-800">Organizador de Páginas</h2>
        <p className="text-sm text-slate-500">
          Arrastra las páginas para reordenar, rotar en cualquier ángulo, duplicar o insertar páginas en blanco.
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
          <p className="text-sm font-bold text-slate-800">Selecciona un archivo PDF para organizar</p>
          <p className="text-xs text-slate-400 mt-1 uppercase tracking-wider font-semibold">
            Reorganiza páginas arrastrando y soltando
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Action Bar */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-50 text-blue-600 rounded-xl border border-blue-100">
                <FileIcon size={18} />
              </div>
              <div>
                <span className="text-sm font-bold text-slate-800">{file.name}</span>
                <span className="text-xs text-slate-500 font-semibold block">
                  {items.length} páginas en la nueva disposición
                </span>
              </div>
            </div>

            <div className="flex items-center space-x-2 flex-wrap">
              <button
                onClick={() => rotateAll(90)}
                className="flex items-center space-x-1.5 text-xs font-semibold px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors"
                title="Rotar todas las páginas 90° horario"
              >
                <RotateCw size={14} />
                <span>Rotar Todo +90°</span>
              </button>

              <button
                onClick={() => insertBlankPage(items.length - 1)}
                className="flex items-center space-x-1.5 text-xs font-semibold px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors"
              >
                <Plus size={14} />
                <span>Añadir Hoja en Blanco</span>
              </button>

              <button
                onClick={resetAll}
                className="flex items-center space-x-1.5 text-xs font-semibold px-3 py-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
              >
                <ResetIcon size={14} />
                <span>Restablecer</span>
              </button>

              <button
                onClick={handleSave}
                disabled={isProcessing || items.length === 0}
                className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-5 py-2 rounded-xl text-xs font-bold shadow-sm transition-all"
              >
                {isProcessing ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Download size={15} />
                )}
                <span>Guardar y Descargar PDF</span>
              </button>
            </div>
          </div>

          {/* Grid of Draggable Polaroid Pages */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5">
            {items.map((item, index) => (
              <div
                key={item.id}
                draggable
                onDragStart={(e) => handleDragStart(e, index)}
                onDragEnter={(e) => handleDragEnter(e, index)}
                onDragOver={handleDragOver}
                onDragEnd={handleDragEnd}
                className={`polaroid-card rounded-2xl flex flex-col group relative cursor-grab active:cursor-grabbing ${
                  draggedIndex === index
                    ? 'opacity-40 scale-95 ring-2 ring-amber-500'
                    : index % 2 === 0 ? '-rotate-0.5 hover:rotate-0' : 'rotate-0.5 hover:rotate-0'
                }`}
              >
                {/* Thumbnail Display inside Polaroid Frame */}
                <div className="w-full bg-stone-100 rounded-xl overflow-hidden min-h-[170px] flex items-center justify-center relative border border-stone-200 shadow-inner">
                  {item.sourcePageIndex === 'blank' ? (
                    <div className="w-full h-[170px] bg-white border border-dashed border-stone-300 flex flex-col items-center justify-center text-stone-400">
                      <Plus size={24} className="mb-1 text-stone-300" />
                      <span className="text-[11px] font-bold">Hoja en Blanco</span>
                    </div>
                  ) : (
                    <img
                      src={item.thumbnailUrl}
                      alt={item.label}
                      className="max-w-full max-h-[170px] object-contain transition-transform duration-200"
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

                {/* Polaroid Bottom Chin with Label & Quick Actions */}
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-xs font-black text-stone-800 truncate max-w-[85px]">
                    {item.label}
                  </span>

                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => rotateItem(index, 90)}
                      title="Rotar 90°"
                      className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <RotateCw size={14} />
                    </button>
                    <button
                      onClick={() => duplicateItem(index)}
                      title="Duplicar página"
                      className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                      <Copy size={14} />
                    </button>
                    <button
                      onClick={() => deleteItem(index)}
                      title="Eliminar página"
                      className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 size={14} />
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
