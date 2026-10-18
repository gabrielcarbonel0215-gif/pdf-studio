import React from 'react';
import { ToolType } from '../../types/pdf';
import {
  MousePointer,
  Type,
  Square,
  Circle,
  Highlighter,
  PenTool,
  Award,
  Image as ImageIcon,
  RotateCw,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Undo2,
  Redo2,
  Download,
  FileText,
} from 'lucide-react';

interface EditorToolbarProps {
  activeTool: ToolType;
  setActiveTool: (tool: ToolType) => void;
  scale: number;
  setScale: (fn: (prev: number) => number) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onRotatePage: () => void;
  onOpenSignatureModal: () => void;
  onOpenStampModal: () => void;
  onOpenWatermarkModal: () => void;
  onOpenPageNumberModal: () => void;
  onImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onExportPdf: () => void;
  isExporting: boolean;
  onOpenTextList?: () => void;
  detectedTextCount?: number;
}

export default function EditorToolbar({
  activeTool,
  setActiveTool,
  scale,
  setScale,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onRotatePage,
  onOpenSignatureModal,
  onOpenStampModal,
  onOpenWatermarkModal,
  onOpenPageNumberModal,
  onImageUpload,
  onExportPdf,
  isExporting,
  onOpenTextList,
  detectedTextCount = 0,
}: EditorToolbarProps) {
  const primaryTools: { id: ToolType; label: string; icon: React.ReactNode; tooltip: string }[] = [
    { id: 'select', label: 'Tocar Texto', icon: <MousePointer size={14} />, tooltip: 'Toca cualquier texto del PDF para modificarlo' },
    { id: 'text', label: '+ Cuadro Texto', icon: <Type size={14} />, tooltip: 'Crear un nuevo cuadro de texto libre' },
    { id: 'highlight', label: 'Resaltar', icon: <Highlighter size={14} />, tooltip: 'Resaltar texto con color' },
    { id: 'rectangle', label: 'Rectángulo', icon: <Square size={14} />, tooltip: 'Dibujar rectángulo' },
    { id: 'circle', label: 'Círculo', icon: <Circle size={14} />, tooltip: 'Dibujar círculo' },
  ];

  return (
    <div className="bg-[#efece6] border-b border-[#e2e0db] px-4 py-2 flex items-center justify-between gap-3 overflow-x-auto shadow-2xs z-20 select-none">
      {/* Primary Tool Buttons */}
      <div className="flex items-center space-x-1 shrink-0">
        {primaryTools.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTool(t.id)}
            title={t.tooltip}
            className={`px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-all text-xs font-bold ${
              activeTool === t.id
                ? 'bg-[#18181b] text-white shadow-xs font-black'
                : 'text-stone-700 hover:bg-[#e4e1db] hover:text-[#18181b]'
            }`}
          >
            {t.icon}
            <span className="whitespace-nowrap">{t.label}</span>
          </button>
        ))}

        {/* Text List Inspector Button */}
        {onOpenTextList && (
          <button
            onClick={onOpenTextList}
            title="Ver y modificar lista de textos encontrados en esta página"
            className="px-3 py-1.5 rounded-xl text-[#18181b] bg-[#e4e1db] hover:bg-[#d8d4ce] flex items-center gap-1.5 text-xs font-bold transition-colors border border-[#d1cdca]"
          >
            <FileText size={14} className="text-amber-700" />
            <span className="whitespace-nowrap">Textos de la Pág</span>
            {detectedTextCount > 0 && (
              <span className="px-1.5 py-0.2 bg-[#18181b] text-white rounded-full text-[10px] font-black">
                {detectedTextCount}
              </span>
            )}
          </button>
        )}

        <div className="h-5 w-px bg-[#d8d4ce] mx-1" />

        {/* Action Tools: Signature, Stamp, Image */}
        <button
          onClick={onOpenSignatureModal}
          title="Insertar Firma digital"
          className="px-2.5 py-1.5 rounded-xl text-stone-700 hover:bg-[#e4e1db] hover:text-[#18181b] flex items-center gap-1.5 text-xs font-bold transition-colors"
        >
          <PenTool size={14} className="text-stone-800" />
          <span className="hidden sm:inline">Firma</span>
        </button>

        <button
          onClick={onOpenStampModal}
          title="Insertar Sello Oficial"
          className="px-2.5 py-1.5 rounded-xl text-stone-700 hover:bg-[#e4e1db] hover:text-[#18181b] flex items-center gap-1.5 text-xs font-bold transition-colors"
        >
          <Award size={14} className="text-stone-800" />
          <span className="hidden sm:inline">Sello</span>
        </button>

        <label
          title="Insertar Imagen o Logo"
          className="px-2.5 py-1.5 rounded-xl text-stone-700 hover:bg-[#e4e1db] hover:text-[#18181b] flex items-center gap-1.5 text-xs font-bold cursor-pointer transition-colors"
        >
          <input
            type="file"
            accept="image/*"
            onChange={onImageUpload}
            className="hidden"
          />
          <ImageIcon size={14} className="text-stone-800" />
          <span className="hidden sm:inline">Imagen</span>
        </label>
      </div>

      {/* Right Action Buttons */}
      <div className="flex items-center space-x-2 shrink-0">
        {/* Undo / Redo */}
        <div className="flex items-center bg-[#e4e1db] p-0.5 rounded-xl border border-[#d1cdca]">
          <button
            onClick={onUndo}
            disabled={!canUndo}
            title="Deshacer (Ctrl+Z)"
            className="p-1.5 rounded-lg text-stone-700 hover:text-stone-950 disabled:opacity-30 transition-colors"
          >
            <Undo2 size={13} />
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            title="Rehacer (Ctrl+Y)"
            className="p-1.5 rounded-lg text-stone-700 hover:text-stone-950 disabled:opacity-30 transition-colors"
          >
            <Redo2 size={13} />
          </button>
        </div>

        {/* Rotate Page */}
        <button
          onClick={onRotatePage}
          title="Rotar Página Actual 90°"
          className="p-1.5 rounded-xl text-stone-700 hover:bg-[#e4e1db] hover:text-stone-950 transition-colors"
        >
          <RotateCw size={14} />
        </button>

        {/* Zoom Controls */}
        <div className="flex items-center bg-[#e4e1db] p-0.5 rounded-xl border border-[#d1cdca]">
          <button
            onClick={() => setScale((s) => Math.max(0.4, Math.round((s - 0.15) * 100) / 100))}
            title="Reducir zoom"
            className="p-1.5 rounded-lg text-stone-700 hover:text-stone-950 transition-colors"
          >
            <ZoomOut size={13} />
          </button>
          <span className="text-xs font-black text-[#18181b] px-2 min-w-[42px] text-center">
            {Math.round(scale * 100)}%
          </span>
          <button
            onClick={() => setScale((s) => Math.min(3.0, Math.round((s + 0.15) * 100) / 100))}
            title="Aumentar zoom"
            className="p-1.5 rounded-lg text-stone-700 hover:text-stone-950 transition-colors"
          >
            <ZoomIn size={13} />
          </button>
          <button
            onClick={() => setScale(() => 1.0)}
            title="Ajustar 100%"
            className="p-1.5 rounded-lg text-stone-700 hover:text-stone-950 transition-colors ml-0.5"
          >
            <Maximize2 size={13} />
          </button>
        </div>

        {/* Export / Download Button */}
        <button
          onClick={onExportPdf}
          disabled={isExporting}
          className="px-4 py-2 bg-[#18181b] hover:bg-stone-800 text-white rounded-xl text-xs font-black shadow-xs flex items-center gap-1.5 disabled:opacity-50 transition-all active:scale-95"
        >
          {isExporting ? (
            <div className="w-3.5 h-3.5 border-2 border-stone-200 border-t-transparent rounded-full animate-spin" />
          ) : (
            <Download size={14} />
          )}
          <span>Descargar PDF</span>
        </button>
      </div>
    </div>
  );
}
