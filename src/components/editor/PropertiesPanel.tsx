import React from 'react';
import {
  AnnotationElement,
  StandardFontFamily,
  TextElement,
  ShapeElement,
  StampElement,
} from '../../types/pdf';
import {
  Trash2,
  Copy,
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Sparkles,
  Layers,
  Palette,
  Type,
  Square,
} from 'lucide-react';

interface PropertiesPanelProps {
  selectedElement: AnnotationElement | null;
  onUpdateElement: (updated: AnnotationElement) => void;
  onDeleteElement: (id: string) => void;
  onDuplicateElement: (element: AnnotationElement) => void;
  onOpenFontDetector?: () => void;
}

export default function PropertiesPanel({
  selectedElement,
  onUpdateElement,
  onDeleteElement,
  onDuplicateElement,
}: PropertiesPanelProps) {
  if (!selectedElement) {
    return (
      <div className="w-72 bg-[#f4efe8] border-l border-[#ded7cc] p-6 flex flex-col items-center justify-center text-center text-stone-500 select-none">
        <div className="p-3.5 bg-[#eae4d9] text-amber-900 border border-[#d6cebf] rounded-2xl mb-3 shadow-2xs">
          <Type size={22} />
        </div>
        <p className="text-sm font-black text-stone-900">Modo de Edición Directo</p>
        <p className="text-xs text-stone-600 mt-1 max-w-[210px] leading-relaxed">
          Haz clic sobre cualquier texto del PDF para editarlo con su misma tipografía automáticamente.
        </p>

        <div className="mt-6 w-full text-left space-y-2.5 p-3.5 bg-[#eae4d9] rounded-2xl border border-[#ded7cc] text-[11px] text-stone-700">
          <div className="font-bold text-stone-800 uppercase tracking-wider text-[10px]">
            Atajos Rápidos
          </div>
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />
            <span><strong>Clic en texto:</strong> Editar texto existente</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-stone-600" />
            <span><strong>Doble clic en vacío:</strong> Crear nuevo texto</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-600" />
            <span><strong>Supr:</strong> Eliminar seleccionado</span>
          </div>
        </div>
      </div>
    );
  }

  const isText = selectedElement.type === 'text';
  const isShape =
    selectedElement.type === 'rectangle' ||
    selectedElement.type === 'circle' ||
    selectedElement.type === 'line' ||
    selectedElement.type === 'arrow' ||
    selectedElement.type === 'highlight';
  const isStamp = selectedElement.type === 'stamp';
  const isMedia = selectedElement.type === 'signature' || selectedElement.type === 'image';

  return (
    <aside className="w-80 bg-[#f4efe8] border-l border-[#ded7cc] flex flex-col overflow-y-auto shadow-sm select-none">
      {/* Header */}
      <div className="p-4 border-b border-[#ded7cc] flex items-center justify-between bg-[#eae4d9]">
        <div className="flex items-center space-x-2">
          <span className="p-1.5 bg-[#f7f5f0] text-amber-900 rounded-lg border border-[#ded7cc]">
            {isText ? <Type size={16} /> : isShape ? <Square size={16} /> : <Palette size={16} />}
          </span>
          <span className="text-xs font-black text-stone-900 uppercase tracking-wider">
            {isText ? 'Propiedades de Texto' : isShape ? 'Propiedades de Forma' : 'Propiedades'}
          </span>
        </div>

        <div className="flex items-center space-x-1">
          <button
            onClick={() => onDuplicateElement(selectedElement)}
            title="Duplicar elemento"
            className="p-1.5 text-stone-600 hover:text-stone-900 hover:bg-[#ded7cc] rounded-lg transition-colors"
          >
            <Copy size={16} />
          </button>
          <button
            onClick={() => onDeleteElement(selectedElement.id)}
            title="Eliminar elemento"
            className="p-1.5 text-rose-600 hover:text-rose-800 hover:bg-rose-100/70 rounded-lg transition-colors"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      <div className="p-5 space-y-5">
        {/* TEXT SPECIFIC CONTROLS */}
        {isText && (
          <>
            {/* Text Input Content */}
            <div>
              <label className="block text-[10px] uppercase font-bold tracking-widest text-slate-400 mb-1.5">
                Contenido del Texto
              </label>
              <textarea
                value={(selectedElement as TextElement).text}
                onChange={(e) =>
                  onUpdateElement({ ...selectedElement, text: e.target.value } as TextElement)
                }
                rows={3}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-shadow"
              />
            </div>

            {/* Font Family */}
            <div>
              <label className="block text-[10px] uppercase font-bold tracking-widest text-slate-400 mb-1.5">
                Tipografía / Fuente
              </label>
              <select
                value={(selectedElement as TextElement).fontFamily}
                onChange={(e) =>
                  onUpdateElement({
                    ...selectedElement,
                    fontFamily: e.target.value as StandardFontFamily,
                  } as TextElement)
                }
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none font-medium text-slate-700"
              >
                <option value="Helvetica">Helvetica (Sans-Serif / Arial)</option>
                <option value="Times-Roman">Times New Roman (Serif)</option>
                <option value="Courier">Courier (Monospace / Máquina)</option>
              </select>
            </div>

            {/* Font Size & Weight/Style */}
            <div className="space-y-3">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-[10px] uppercase font-bold tracking-widest text-slate-400">
                    Tamaño ({Math.round((selectedElement as TextElement).fontSize)} pt)
                  </label>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={8}
                    max={72}
                    value={(selectedElement as TextElement).fontSize}
                    onChange={(e) =>
                      onUpdateElement({
                        ...selectedElement,
                        fontSize: parseInt(e.target.value) || 12,
                      } as TextElement)
                    }
                    className="flex-1 accent-blue-600"
                  />
                  <input
                    type="number"
                    value={Math.round((selectedElement as TextElement).fontSize)}
                    onChange={(e) =>
                      onUpdateElement({
                        ...selectedElement,
                        fontSize: parseInt(e.target.value) || 12,
                      } as TextElement)
                    }
                    className="w-14 px-2 py-1 text-xs text-center bg-slate-50 border border-slate-200 rounded-lg outline-none"
                  />
                </div>
              </div>

              {/* Bold / Italic / Alignment */}
              <div className="flex items-center justify-between gap-2 pt-1">
                <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
                  <button
                    onClick={() =>
                      onUpdateElement({
                        ...selectedElement,
                        fontWeight:
                          (selectedElement as TextElement).fontWeight === 'bold'
                            ? 'normal'
                            : 'bold',
                      } as TextElement)
                    }
                    className={`p-1.5 rounded-lg transition-colors ${
                      (selectedElement as TextElement).fontWeight === 'bold'
                        ? 'bg-white text-blue-600 shadow-xs font-bold'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                    title="Negrita"
                  >
                    <Bold size={15} />
                  </button>
                  <button
                    onClick={() =>
                      onUpdateElement({
                        ...selectedElement,
                        fontStyle:
                          (selectedElement as TextElement).fontStyle === 'italic'
                            ? 'normal'
                            : 'italic',
                      } as TextElement)
                    }
                    className={`p-1.5 rounded-lg transition-colors ${
                      (selectedElement as TextElement).fontStyle === 'italic'
                        ? 'bg-white text-blue-600 shadow-xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                    title="Cursiva"
                  >
                    <Italic size={15} />
                  </button>
                  <button
                    onClick={() =>
                      onUpdateElement({
                        ...selectedElement,
                        underline: !(selectedElement as TextElement).underline,
                      } as TextElement)
                    }
                    className={`p-1.5 rounded-lg transition-colors ${
                      (selectedElement as TextElement).underline
                        ? 'bg-white text-blue-600 shadow-xs font-bold'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                    title="Subrayado"
                  >
                    <Underline size={15} />
                  </button>
                </div>

                <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
                  {(['left', 'center', 'right'] as const).map((align) => (
                    <button
                      key={align}
                      onClick={() =>
                        onUpdateElement({
                          ...selectedElement,
                          alignment: align,
                        } as TextElement)
                      }
                      className={`p-1.5 rounded-lg transition-colors ${
                        (selectedElement as TextElement).alignment === align
                          ? 'bg-white text-blue-600 shadow-xs'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                      title={`Alinear a la ${align === 'left' ? 'izquierda' : align === 'center' ? 'centro' : 'derecha'}`}
                    >
                      {align === 'left' ? (
                        <AlignLeft size={15} />
                      ) : align === 'center' ? (
                        <AlignCenter size={15} />
                      ) : (
                        <AlignRight size={15} />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Colors: Text color & Background color */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div>
                <label className="block text-[10px] uppercase font-bold tracking-widest text-slate-400 mb-1.5">
                  Color de Letra
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={(selectedElement as TextElement).color || '#000000'}
                    onChange={(e) =>
                      onUpdateElement({ ...selectedElement, color: e.target.value } as TextElement)
                    }
                    className="w-9 h-9 p-0.5 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer"
                  />
                  <span className="text-xs font-mono text-slate-600">
                    {(selectedElement as TextElement).color || '#000000'}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold tracking-widest text-slate-400 mb-1.5">
                  Fondo (Tapar texto)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={
                      (selectedElement as TextElement).backgroundColor &&
                      (selectedElement as TextElement).backgroundColor !== 'transparent'
                        ? (selectedElement as TextElement).backgroundColor
                        : '#ffffff'
                    }
                    onChange={(e) =>
                      onUpdateElement({
                        ...selectedElement,
                        backgroundColor: e.target.value,
                        backgroundOpacity: 1,
                      } as TextElement)
                    }
                    className="w-9 h-9 p-0.5 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer"
                  />
                  <button
                    onClick={() =>
                      onUpdateElement({
                        ...selectedElement,
                        backgroundColor:
                          (selectedElement as TextElement).backgroundColor === 'transparent'
                            ? '#ffffff'
                            : 'transparent',
                      } as TextElement)
                    }
                    className="text-[11px] px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium transition-colors"
                  >
                    {(selectedElement as TextElement).backgroundColor === 'transparent'
                      ? 'Sin fondo'
                      : 'Blanco'}
                  </button>
                </div>
              </div>
            </div>
          </>
        )}

        {/* SHAPE SPECIFIC CONTROLS */}
        {isShape && (
          <>
            <div>
              <label className="block text-[10px] uppercase font-bold tracking-widest text-slate-400 mb-1.5">
                Color de Trazo
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={(selectedElement as ShapeElement).strokeColor || '#2563eb'}
                  onChange={(e) =>
                    onUpdateElement({ ...selectedElement, strokeColor: e.target.value } as ShapeElement)
                  }
                  className="w-9 h-9 p-0.5 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer"
                />
                <span className="text-xs font-mono text-slate-600">
                  {(selectedElement as ShapeElement).strokeColor}
                </span>
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-[10px] uppercase font-bold tracking-widest text-slate-400">
                  Grosor de Trazo ({(selectedElement as ShapeElement).strokeWidth} px)
                </label>
              </div>
              <input
                type="range"
                min={1}
                max={20}
                value={(selectedElement as ShapeElement).strokeWidth}
                onChange={(e) =>
                  onUpdateElement({
                    ...selectedElement,
                    strokeWidth: parseInt(e.target.value) || 2,
                  } as ShapeElement)
                }
                className="w-full accent-blue-600"
              />
            </div>

            <div>
              <label className="block text-[10px] uppercase font-bold tracking-widest text-slate-400 mb-1.5">
                Color de Relleno
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={(selectedElement as ShapeElement).fillColor || '#ffffff'}
                  onChange={(e) =>
                    onUpdateElement({ ...selectedElement, fillColor: e.target.value } as ShapeElement)
                  }
                  className="w-9 h-9 p-0.5 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer"
                />
                <button
                  onClick={() =>
                    onUpdateElement({
                      ...selectedElement,
                      fillColor: (selectedElement as ShapeElement).fillColor ? undefined : '#ffffff',
                    } as ShapeElement)
                  }
                  className="text-xs px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium transition-colors"
                >
                  {(selectedElement as ShapeElement).fillColor ? 'Quitar Relleno' : 'Rellenar'}
                </button>
              </div>
            </div>
          </>
        )}

        {/* STAMP SPECIFIC CONTROLS */}
        {isStamp && (
          <div>
            <label className="block text-[10px] uppercase font-bold tracking-widest text-slate-400 mb-1.5">
              Texto del Sello
            </label>
            <input
              type="text"
              value={(selectedElement as StampElement).text}
              onChange={(e) =>
                onUpdateElement({
                  ...selectedElement,
                  text: e.target.value.toUpperCase(),
                } as StampElement)
              }
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl uppercase font-bold"
            />
          </div>
        )}

        {/* GENERAL CONTROLS (Opacity & Dimensions) */}
        <div className="pt-3 border-t border-slate-100 space-y-3">
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-[10px] uppercase font-bold tracking-widest text-slate-400">
                Opacidad ({Math.round((selectedElement.opacity ?? 1) * 100)}%)
              </label>
            </div>
            <input
              type="range"
              min={0.1}
              max={1}
              step={0.05}
              value={selectedElement.opacity ?? 1}
              onChange={(e) =>
                onUpdateElement({ ...selectedElement, opacity: parseFloat(e.target.value) })
              }
              className="w-full accent-blue-600"
            />
          </div>
        </div>
      </div>
    </aside>
  );
}
