import React, { useState } from 'react';
import { X, Award, Check } from 'lucide-react';
import { StampElement } from '../../types/pdf';

interface StampDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectStamp: (stamp: Omit<StampElement, 'id' | 'pageIndex' | 'x' | 'y'>) => void;
}

const PRESET_STAMPS = [
  { text: 'APROBADO', variant: 'approved', color: '#16a34a', label: 'Aprobado' },
  { text: 'CONFIDENCIAL', variant: 'confidential', color: '#dc2626', label: 'Confidencial' },
  { text: 'COPIA OFICIAL', variant: 'copy', color: '#2563eb', label: 'Copia Oficial' },
  { text: 'PAGADO', variant: 'paid', color: '#059669', label: 'Pagado' },
  { text: 'ANULADO', variant: 'void', color: '#991b1b', label: 'Anulado' },
  { text: 'BORRADOR', variant: 'draft', color: '#ea580c', label: 'Borrador' },
  { text: 'REVISADO', variant: 'reviewed', color: '#7c3aed', label: 'Revisado' },
  { text: 'URGENTE', variant: 'custom', color: '#b91c1c', label: 'Urgente' },
];

export default function StampDialog({ isOpen, onClose, onSelectStamp }: StampDialogProps) {
  const [customText, setCustomText] = useState('');
  const [customColor, setCustomColor] = useState('#dc2626');

  if (!isOpen) return null;

  const handleSelectPreset = (preset: (typeof PRESET_STAMPS)[0]) => {
    onSelectStamp({
      type: 'stamp',
      text: preset.text,
      variant: preset.variant as any,
      color: preset.color,
      borderWidth: 3,
      width: 170,
      height: 60,
    });
    onClose();
  };

  const handleApplyCustom = () => {
    if (!customText.trim()) return;
    onSelectStamp({
      type: 'stamp',
      text: customText.trim().toUpperCase(),
      variant: 'custom',
      color: customColor,
      borderWidth: 3,
      width: Math.max(160, customText.length * 14),
      height: 60,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 px-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-amber-500 text-white rounded-xl">
              <Award size={18} />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-base">Catálogo de Sellos Oficiales</h3>
              <p className="text-xs text-slate-500">Selecciona un sello predeterminado o personaliza uno</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Preset Stamps Grid */}
        <div className="p-6 space-y-5">
          <div>
            <label className="block text-[11px] uppercase font-bold tracking-wider text-slate-400 mb-3">
              Sellos Prediseñados
            </label>
            <div className="grid grid-cols-2 gap-3">
              {PRESET_STAMPS.map((stamp) => (
                <button
                  key={stamp.text}
                  onClick={() => handleSelectPreset(stamp)}
                  className="p-3 border-2 rounded-xl transition-all hover:scale-102 flex flex-col items-center justify-center gap-1.5 group bg-slate-50/50 hover:bg-white hover:shadow-md"
                  style={{ borderColor: stamp.color }}
                >
                  <div
                    className="px-3 py-1 font-black text-sm tracking-wider uppercase border-2 rounded"
                    style={{ borderColor: stamp.color, color: stamp.color }}
                  >
                    {stamp.text}
                  </div>
                  <span className="text-[11px] text-slate-500 font-medium group-hover:text-slate-700">
                    {stamp.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Custom Stamp */}
          <div className="pt-4 border-t border-slate-100">
            <label className="block text-[11px] uppercase font-bold tracking-wider text-slate-400 mb-2">
              Crear Sello Personalizado
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                placeholder="Ej: RECIBIDO, GERENCIA, etc."
                className="flex-1 px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none uppercase font-semibold"
              />
              <input
                type="color"
                value={customColor}
                onChange={(e) => setCustomColor(e.target.value)}
                className="w-10 h-10 p-1 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer"
                title="Color del sello"
              />
              <button
                onClick={handleApplyCustom}
                disabled={!customText.trim()}
                className="flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-900 disabled:opacity-40 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors"
              >
                <Check size={16} />
                <span>Aplicar</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
