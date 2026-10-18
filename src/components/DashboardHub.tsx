import React from 'react';
import { MainTabType } from './Navbar';
import {
  Sparkles,
  FilePlus2,
  Scissors,
  LayoutGrid,
  FileText,
  RefreshCw,
  Shield,
  UploadCloud,
  ArrowRight,
  Lock,
  Zap,
  CheckCircle2,
  Edit3,
  Camera,
  Layers,
  Image as ImageIcon,
  Pin,
} from 'lucide-react';

interface DashboardHubProps {
  onSelectTool: (tool: MainTabType) => void;
}

export default function DashboardHub({ onSelectTool }: DashboardHubProps) {
  const polaroids: {
    id: MainTabType;
    title: string;
    subtitle: string;
    icon: React.ReactNode;
    color: string;
    tilt: string;
    description: string;
    features: string[];
  }[] = [
    {
      id: 'editor',
      title: 'Editor Visual',
      subtitle: 'Detección de Fuentes & Modificar',
      icon: <Sparkles size={34} className="text-amber-800" />,
      color: 'bg-amber-100/60 border-amber-200/90',
      tilt: '-rotate-0.5 hover:rotate-0',
      description: 'Haz clic sobre cualquier texto del PDF para editarlo con su misma tipografía y tamaño.',
      features: ['Edición directa en 1 clic', 'Firmas y Sellos oficiales', 'Marcas de agua y formas'],
    },
    {
      id: 'ocr',
      title: 'OCR & Fotos',
      subtitle: 'Extraer Texto de Imágenes y PDFs',
      icon: <Camera size={34} className="text-emerald-800" />,
      color: 'bg-emerald-100/60 border-emerald-200/90',
      tilt: 'rotate-0.5 hover:rotate-0',
      description: 'Pega capturas con Ctrl+V o sube fotos para extraer su texto con IA en Español e Inglés.',
      features: ['Pega capturas con Ctrl + V', 'PNG, JPG, WebP y PDFs', 'Descarga en TXT o PDF'],
    },
    {
      id: 'merge',
      title: 'Unir PDFs',
      subtitle: 'Combinar varios documentos',
      icon: <FilePlus2 size={34} className="text-blue-800" />,
      color: 'bg-blue-100/60 border-blue-200/90',
      tilt: '-rotate-0.5 hover:rotate-0',
      description: 'Combina múltiples archivos en el orden que desees con filtro de páginas por documento.',
      features: ['Reordenación por arrastre', 'Filtro por rangos (ej. 1-3)', 'Previsualización integrada'],
    },
    {
      id: 'split',
      title: 'Dividir & Extraer',
      subtitle: 'Separar o eliminar hojas',
      icon: <Scissors size={34} className="text-rose-800" />,
      color: 'bg-rose-100/60 border-rose-200/90',
      tilt: 'rotate-0.5 hover:rotate-0',
      description: 'Selecciona visualmente las páginas para separar en archivos individuales o crear un ZIP.',
      features: ['Cuadrícula de selección visual', 'Exportación a archivo .ZIP', 'Borrado de páginas'],
    },
    {
      id: 'organize',
      title: 'Organizador',
      subtitle: 'Reordenar & Rotar Páginas',
      icon: <LayoutGrid size={34} className="text-purple-800" />,
      color: 'bg-purple-100/60 border-purple-200/90',
      tilt: '-rotate-0.5 hover:rotate-0',
      description: 'Mueve las páginas de posición con arrastrar y soltar, rota 90°/180° o añade hojas en blanco.',
      features: ['Arrastrar miniaturas', 'Rotación individual/masiva', 'Insertar páginas en blanco'],
    },
    {
      id: 'convert',
      title: 'Conversor',
      subtitle: 'Imágenes ↔ PDF y Texto',
      icon: <RefreshCw size={34} className="text-teal-800" />,
      color: 'bg-teal-100/60 border-teal-200/90',
      tilt: 'rotate-0.5 hover:rotate-0',
      description: 'Convierte fotos JPG/PNG a PDF con tamaño de hoja o exporta páginas de PDF a imágenes en ZIP.',
      features: ['Fotos a PDF (A4/Carta)', 'PDF a imágenes en ZIP', 'Notas a documento PDF'],
    },
  ];

  return (
    <div className="min-h-[calc(100vh-60px)] bg-studio-desk py-8 px-4 sm:px-6 lg:px-12 flex flex-col items-center select-none">
      {/* Top Welcome Card */}
      <div className="max-w-4xl w-full text-center space-y-2 mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#e8e2d5] border border-[#d6cebf] text-xs font-bold text-stone-700">
          <Camera size={13} className="text-amber-800" />
          <span>Mesa de Trabajo & Estudio Polaroid</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-stone-900">
          Herramientas Visuales de Edición & PDF
        </h2>
        <p className="text-xs sm:text-sm text-stone-600 max-w-xl mx-auto font-medium">
          Selecciona una herramienta para comenzar. Todo el procesamiento se realiza localmente en tu navegador con total privacidad.
        </p>
      </div>

      {/* Polaroid Grid */}
      <div className="max-w-6xl w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {polaroids.map((tool) => (
          <div
            key={tool.id}
            onClick={() => onSelectTool(tool.id)}
            className={`polaroid-card rounded-2xl cursor-pointer ${tool.tilt} relative group flex flex-col justify-between`}
          >
            {/* Washi Tape */}
            <div className="polaroid-tape rounded-xs" />

            <div>
              {/* Top Photo Frame */}
              <div className={`w-full h-36 rounded-xl border flex flex-col items-center justify-center p-4 transition-transform group-hover:scale-[1.02] ${tool.color}`}>
                <div className="w-14 h-14 rounded-2xl bg-white/90 shadow-sm flex items-center justify-center mb-2 group-hover:rotate-6 transition-transform">
                  {tool.icon}
                </div>
                <span className="text-[10px] font-black uppercase tracking-wider text-stone-700">
                  {tool.subtitle}
                </span>
              </div>

              {/* Title & Description */}
              <div className="mt-4 px-1">
                <h3 className="text-base font-black text-stone-900 group-hover:text-amber-900 transition-colors">
                  {tool.title}
                </h3>
                <p className="text-xs text-stone-600 mt-1 font-medium leading-relaxed">
                  {tool.description}
                </p>

                {/* Features List */}
                <ul className="mt-3 space-y-1 border-t border-stone-200/80 pt-2.5">
                  {tool.features.map((feat, idx) => (
                    <li key={idx} className="flex items-center gap-1.5 text-[11px] font-bold text-stone-700">
                      <CheckCircle2 size={12} className="text-emerald-700 shrink-0" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Bottom Polaroid Action */}
            <div className="mt-4 pt-2 px-1 flex items-center justify-between text-xs font-black text-stone-800 group-hover:text-amber-900 border-t border-dashed border-stone-300">
              <span>Abrir herramienta</span>
              <div className="w-6 h-6 rounded-full bg-stone-900 text-white group-hover:bg-amber-800 flex items-center justify-center transition-colors">
                <ArrowRight size={13} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
