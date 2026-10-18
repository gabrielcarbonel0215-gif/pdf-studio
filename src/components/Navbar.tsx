import React, { useState } from 'react';
import {
  Camera,
  Layers,
  Sparkles,
  FilePlus2,
  Scissors,
  LayoutGrid,
  FileText,
  RefreshCw,
  Shield,
  HelpCircle,
  X,
  Keyboard,
  Lock,
  ChevronRight,
} from 'lucide-react';

export type MainTabType = 'home' | 'editor' | 'merge' | 'split' | 'organize' | 'ocr' | 'convert' | 'security';

interface NavbarProps {
  activeTab: MainTabType;
  setActiveTab: (tab: MainTabType) => void;
}

export default function Navbar({ activeTab, setActiveTab }: NavbarProps) {
  const [showHelpModal, setShowHelpModal] = useState(false);

  const navItems: { id: MainTabType; label: string; icon: React.ReactNode; pastelActive: string }[] = [
    { id: 'home', label: 'Galería', icon: <Camera size={14} />, pastelActive: 'bg-[#e8e2d5] text-stone-900 ring-1 ring-stone-300' },
    {
      id: 'editor',
      label: 'Editor Visual',
      icon: <Sparkles size={14} className="text-amber-700" />,
      pastelActive: 'bg-amber-100/80 text-amber-950 ring-1 ring-amber-300/80',
    },
    { id: 'ocr', label: 'OCR & Fotos', icon: <FileText size={14} className="text-emerald-700" />, pastelActive: 'bg-emerald-100/80 text-emerald-950 ring-1 ring-emerald-300/80' },
    { id: 'merge', label: 'Unir', icon: <FilePlus2 size={14} className="text-blue-700" />, pastelActive: 'bg-blue-100/80 text-blue-950 ring-1 ring-blue-300/80' },
    { id: 'split', label: 'Dividir', icon: <Scissors size={14} className="text-rose-700" />, pastelActive: 'bg-rose-100/80 text-rose-950 ring-1 ring-rose-300/80' },
    { id: 'organize', label: 'Organizar', icon: <LayoutGrid size={14} className="text-purple-700" />, pastelActive: 'bg-purple-100/80 text-purple-950 ring-1 ring-purple-300/80' },
    { id: 'convert', label: 'Conversor', icon: <RefreshCw size={14} className="text-teal-700" />, pastelActive: 'bg-teal-100/80 text-teal-950 ring-1 ring-teal-300/80' },
    { id: 'security', label: 'Seguridad', icon: <Shield size={14} className="text-stone-700" />, pastelActive: 'bg-stone-200/80 text-stone-950 ring-1 ring-stone-300' },
  ];

  return (
    <>
      <header className="bg-[#f4efe8]/95 backdrop-blur-md border-b border-[#ded7cc] px-6 lg:px-10 py-3 flex items-center justify-between shadow-2xs select-none">
        {/* Brand Logo - Pastel Studio Badge */}
        <div
          onClick={() => setActiveTab('home')}
          className="flex items-center space-x-3.5 cursor-pointer group"
          title="Ir a la galería de herramientas"
        >
          <div className="w-10 h-10 bg-[#eae4d9] rounded-2xl flex items-center justify-center shadow-xs border border-[#d6cebf] group-hover:scale-105 transition-transform">
            <Camera size={18} className="text-amber-800" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-black tracking-tight text-stone-900">
                PDF<span className="text-amber-800">Studio</span>
              </h1>
              <span className="bg-[#e4dcce] text-stone-800 border border-[#d1c6b4] text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">
                POLAROID
              </span>
            </div>
            <p className="text-[10px] text-stone-500 font-medium tracking-wide">
              Estudio & Mesa de Trabajo
            </p>
          </div>
        </div>

        {/* Airy, Spacious Pastel Pill Navigation */}
        <nav className="hidden lg:flex items-center space-x-1.5 p-1 rounded-2xl">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`px-3.5 py-1.8 rounded-xl text-xs font-bold transition-all duration-150 flex items-center gap-1.5 ${
                  isActive
                    ? `${item.pastelActive} shadow-xs font-black`
                    : 'text-stone-600 hover:text-stone-900 hover:bg-[#eae4d9]/70'
                }`}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Right Help & Status */}
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowHelpModal(true)}
            className="flex items-center gap-1.5 text-xs font-bold text-stone-700 hover:text-stone-900 bg-[#eae4d9] hover:bg-[#e0d9cc] px-3.5 py-1.8 rounded-xl border border-[#d6cebf] transition-colors shadow-2xs"
          >
            <Keyboard size={14} className="text-amber-800" />
            <span className="hidden sm:inline">Guía Rápida</span>
          </button>
        </div>
      </header>

      {/* Quick Help Modal */}
      {showHelpModal && (
        <div
          className="fixed inset-0 bg-stone-900/50 backdrop-blur-xs flex items-center justify-center p-4"
          style={{ zIndex: 100 }}
        >
          <div className="bg-[#f7f5f0] rounded-3xl max-w-md w-full p-6 shadow-2xl border border-[#ded7cc]">
            <div className="flex items-center justify-between pb-3 border-b border-[#ded7cc]">
              <div className="flex items-center space-x-2">
                <span className="p-1.5 bg-[#eae4d9] text-stone-900 rounded-xl">
                  <Sparkles size={16} className="text-amber-800" />
                </span>
                <h3 className="font-black text-stone-900 text-sm">Guía Rápida del Estudio</h3>
              </div>
              <button
                onClick={() => setShowHelpModal(false)}
                className="p-1.5 bg-[#eae4d9] text-stone-700 rounded-xl hover:bg-stone-200"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3 py-4 text-xs text-stone-700">
              <div className="p-3 bg-[#eae4d9]/70 rounded-2xl border border-[#ded7cc] space-y-1">
                <p className="font-bold text-stone-900">✨ Edición de Texto</p>
                <p className="text-stone-600 text-[11px]">
                  Toca cualquier texto en el PDF para editarlo directamente. Se mantendrá su tipografía y tamaño exactos.
                </p>
              </div>

              <div className="p-3 bg-[#eae4d9]/70 rounded-2xl border border-[#ded7cc] space-y-1">
                <p className="font-bold text-stone-900">📱 Modo Móvil Android</p>
                <p className="text-stone-600 text-[11px]">
                  Diseñado para usar con el pulgar. Desliza para cambiar de hoja o usa el selector central de páginas.
                </p>
              </div>

              <div className="p-3 bg-[#eae4d9]/70 rounded-2xl border border-[#ded7cc] space-y-1">
                <p className="font-bold text-stone-900">🔒 100% Local & Privado</p>
                <p className="text-stone-600 text-[11px]">
                  Todo se procesa en tu dispositivo sin enviar ningún archivo a servidores externos.
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowHelpModal(false)}
              className="w-full py-2.5 bg-stone-900 text-white rounded-2xl font-black text-xs shadow-md hover:bg-stone-800 transition-colors"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </>
  );
}
