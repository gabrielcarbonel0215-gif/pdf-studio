import React, { useState } from 'react';
import { X, Droplet, Check } from 'lucide-react';
import { StandardFontFamily, WatermarkConfig } from '../../types/pdf';

interface WatermarkDialogProps {
  isOpen: boolean;
  onClose: () => void;
  config: WatermarkConfig;
  onSaveConfig: (config: WatermarkConfig) => void;
  totalPages: number;
}

export default function WatermarkDialog({
  isOpen,
  onClose,
  config,
  onSaveConfig,
  totalPages,
}: WatermarkDialogProps) {
  const [localConfig, setLocalConfig] = useState<WatermarkConfig>({ ...config });

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
            <div className="p-2 bg-indigo-600 text-white rounded-xl">
              <Droplet size={18} />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-base">Marca de Agua</h3>
              <p className="text-xs text-slate-500">Configura marcas de agua para las páginas del PDF</p>
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
              className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
            />
            <span className="text-sm font-semibold text-slate-700">Activar marca de agua en el PDF</span>
          </label>

          {localConfig.enabled && (
            <>
              <div>
                <label className="block text-[11px] uppercase font-bold tracking-wider text-slate-400 mb-1.5">
                  Texto de la marca de agua
                </label>
                <input
                  type="text"
                  value={localConfig.text}
                  onChange={(e) => setLocalConfig({ ...localConfig, text: e.target.value })}
                  placeholder="Ej: CONFIDENCIAL, COPIA PRIVADA, BORRADOR..."
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none uppercase font-bold text-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] uppercase font-bold tracking-wider text-slate-400 mb-1.5">
                    Fuente
                  </label>
                  <select
                    value={localConfig.fontFamily}
                    onChange={(e) =>
                      setLocalConfig({ ...localConfig, fontFamily: e.target.value as StandardFontFamily })
                    }
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none"
                  >
                    <option value="Helvetica">Helvetica (Sans-Serif)</option>
                    <option value="Times-Roman">Times New Roman (Serif)</option>
                    <option value="Courier">Courier (Monospace)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] uppercase font-bold tracking-wider text-slate-400 mb-1.5">
                    Color y Opacidad ({Math.round((localConfig.opacity || 0.2) * 100)}%)
                  </label>
                  <div className="flex gap-2 items-center">
                    <input
                      type="color"
                      value={localConfig.color || '#94a3b8'}
                      onChange={(e) => setLocalConfig({ ...localConfig, color: e.target.value })}
                      className="w-10 h-10 p-1 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer"
                    />
                    <input
                      type="range"
                      min={0.05}
                      max={0.8}
                      step={0.05}
                      value={localConfig.opacity}
                      onChange={(e) => setLocalConfig({ ...localConfig, opacity: parseFloat(e.target.value) })}
                      className="flex-1 accent-indigo-600"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="text-[11px] uppercase font-bold tracking-wider text-slate-400">
                      Tamaño de letra ({localConfig.fontSize} pt)
                    </label>
                  </div>
                  <input
                    type="range"
                    min={24}
                    max={96}
                    value={localConfig.fontSize}
                    onChange={(e) => setLocalConfig({ ...localConfig, fontSize: parseInt(e.target.value) })}
                    className="w-full accent-indigo-600"
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="text-[11px] uppercase font-bold tracking-wider text-slate-400">
                      Ángulo ({localConfig.rotation}°)
                    </label>
                  </div>
                  <input
                    type="range"
                    min={-90}
                    max={90}
                    value={localConfig.rotation}
                    onChange={(e) => setLocalConfig({ ...localConfig, rotation: parseInt(e.target.value) })}
                    className="w-full accent-indigo-600"
                  />
                </div>
              </div>

              <div>
                <label className="flex items-center space-x-2 cursor-pointer p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={localConfig.tiled}
                    onChange={(e) => setLocalConfig({ ...localConfig, tiled: e.target.checked })}
                    className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                  />
                  <span>Patrón repetitivo en mosaico (cubre toda la página)</span>
                </label>
              </div>

              <div>
                <label className="block text-[11px] uppercase font-bold tracking-wider text-slate-400 mb-1.5">
                  Aplicar en páginas
                </label>
                <div className="flex gap-2">
                  {(['all', 'first', 'custom'] as const).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setLocalConfig({ ...localConfig, pages: mode })}
                      className={`flex-1 py-1.5 text-xs font-semibold rounded-xl border transition-colors ${
                        localConfig.pages === mode
                          ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {mode === 'all' ? 'Todas' : mode === 'first' ? 'Solo Primera' : 'Personalizado'}
                    </button>
                  ))}
                </div>
                {localConfig.pages === 'custom' && (
                  <input
                    type="text"
                    value={localConfig.customPages || ''}
                    onChange={(e) => setLocalConfig({ ...localConfig, customPages: e.target.value })}
                    placeholder={`Ej: 1-3, 5 (Total: ${totalPages})`}
                    className="w-full mt-2 px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none"
                  />
                )}
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
            className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-xl text-sm font-medium shadow-sm transition-colors"
          >
            <Check size={16} />
            <span>Guardar Configuración</span>
          </button>
        </div>
      </div>
    </div>
  );
}
