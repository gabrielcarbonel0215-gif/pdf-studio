import React, { useState } from 'react';
import { X, Hash, Check } from 'lucide-react';
import { PageNumberConfig, StandardFontFamily } from '../../types/pdf';

interface PageNumberDialogProps {
  isOpen: boolean;
  onClose: () => void;
  config: PageNumberConfig;
  onSaveConfig: (config: PageNumberConfig) => void;
}

export default function PageNumberDialog({
  isOpen,
  onClose,
  config,
  onSaveConfig,
}: PageNumberDialogProps) {
  const [localConfig, setLocalConfig] = useState<PageNumberConfig>({ ...config });

  if (!isOpen) return null;

  const handleSave = () => {
    onSaveConfig(localConfig);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 px-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-emerald-600 text-white rounded-xl">
              <Hash size={18} />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-base">Numeración de Páginas</h3>
              <p className="text-xs text-slate-500">Inserta números de página o folios automáticamente</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 space-y-4">
          <label className="flex items-center space-x-3 cursor-pointer p-3 bg-slate-50 border border-slate-200 rounded-xl hover:border-slate-300 transition-colors">
            <input
              type="checkbox"
              checked={localConfig.enabled}
              onChange={(e) => setLocalConfig({ ...localConfig, enabled: e.target.checked })}
              className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
            />
            <span className="text-sm font-semibold text-slate-700">Activar números de página en el PDF</span>
          </label>

          {localConfig.enabled && (
            <>
              <div>
                <label className="block text-[11px] uppercase font-bold tracking-wider text-slate-400 mb-1.5">
                  Formato de Número
                </label>
                <select
                  value={localConfig.format}
                  onChange={(e) =>
                    setLocalConfig({ ...localConfig, format: e.target.value as any })
                  }
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none font-medium"
                >
                  <option value="page_of_total">Página 1 de 10 (Página {"{n}"} de {"{total}"})</option>
                  <option value="page_only">Solo número (1, 2, 3...)</option>
                  <option value="doc_page">Doc - 1, Doc - 2</option>
                  <option value="custom">Personalizado</option>
                </select>
                {localConfig.format === 'custom' && (
                  <input
                    type="text"
                    value={localConfig.customFormat || ''}
                    onChange={(e) => setLocalConfig({ ...localConfig, customFormat: e.target.value })}
                    placeholder="Ej: Folio {n}/{total}"
                    className="w-full mt-2 px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none font-medium"
                  />
                )}
              </div>

              <div>
                <label className="block text-[11px] uppercase font-bold tracking-wider text-slate-400 mb-1.5">
                  Posición
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'top-left', label: 'Superior Izq.' },
                    { id: 'top-center', label: 'Superior Centro' },
                    { id: 'top-right', label: 'Superior Der.' },
                    { id: 'bottom-left', label: 'Inferior Izq.' },
                    { id: 'bottom-center', label: 'Inferior Centro' },
                    { id: 'bottom-right', label: 'Inferior Der.' },
                  ].map((pos) => (
                    <button
                      key={pos.id}
                      type="button"
                      onClick={() => setLocalConfig({ ...localConfig, position: pos.id as any })}
                      className={`py-2 text-xs font-semibold rounded-xl border transition-colors ${
                        localConfig.position === pos.id
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-700 shadow-sm'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {pos.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] uppercase font-bold tracking-wider text-slate-400 mb-1.5">
                    Empezar en el número
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={localConfig.startNumber}
                    onChange={(e) =>
                      setLocalConfig({ ...localConfig, startNumber: parseInt(e.target.value) || 1 })
                    }
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] uppercase font-bold tracking-wider text-slate-400 mb-1.5">
                    Tamaño de letra ({localConfig.fontSize} pt)
                  </label>
                  <input
                    type="range"
                    min={8}
                    max={20}
                    value={localConfig.fontSize}
                    onChange={(e) =>
                      setLocalConfig({ ...localConfig, fontSize: parseInt(e.target.value) || 10 })
                    }
                    className="w-full accent-emerald-600 mt-2"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-3 pt-2">
                <span className="text-xs font-semibold text-slate-600">Color del texto:</span>
                <input
                  type="color"
                  value={localConfig.color}
                  onChange={(e) => setLocalConfig({ ...localConfig, color: e.target.value })}
                  className="w-8 h-8 p-1 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer"
                />
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 px-6 border-t border-slate-100 bg-slate-50 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200 rounded-xl transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            className="flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2 rounded-xl text-sm font-medium shadow-sm transition-colors"
          >
            <Check size={16} />
            <span>Guardar Numeración</span>
          </button>
        </div>
      </div>
    </div>
  );
}
