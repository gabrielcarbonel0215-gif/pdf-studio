import React, { useState, useRef, useEffect } from 'react';
import { UploadCloud, FileText, Camera } from 'lucide-react';

interface StudioDropzoneProps {
  onFilesSelected: (files: File[]) => void;
  accept?: string;
  multiple?: boolean;
  title?: string;
  subtitle?: string;
  badge?: string;
  buttonText?: string;
  icon?: React.ReactNode;
  compact?: boolean;
  className?: string;
  supportsClipboardPaste?: boolean;
}

export default function StudioDropzone({
  onFilesSelected,
  accept = 'application/pdf',
  multiple = false,
  title = 'Abre o arrastra tu archivo aquí',
  subtitle = 'Soporte 100% en el navegador, privado y seguro.',
  badge,
  buttonText = 'Seleccionar Archivo',
  icon,
  compact = false,
  className = '',
  supportsClipboardPaste = true,
}: StudioDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Global paste handler if clipboard paste is enabled
  useEffect(() => {
    if (!supportsClipboardPaste) return;

    const handlePaste = (e: ClipboardEvent) => {
      if (e.clipboardData && e.clipboardData.files && e.clipboardData.files.length > 0) {
        const files = Array.from(e.clipboardData.files);
        if (files.length > 0) {
          onFilesSelected(multiple ? files : [files[0]]);
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [supportsClipboardPaste, multiple, onFilesSelected]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files);
      onFilesSelected(multiple ? files : [files[0]]);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      onFilesSelected(multiple ? files : [files[0]]);
      e.target.value = ''; // Reset input to allow selecting the same file again
    }
  };

  if (compact) {
    return (
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-2xl p-4 text-center cursor-pointer transition-all ${
          isDragging
            ? 'border-amber-600 bg-amber-50/70 scale-[0.99]'
            : 'border-stone-300 hover:border-stone-400 bg-white/70 hover:bg-white'
        } ${className}`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleInputChange}
          className="hidden"
        />
        <div className="flex items-center justify-center gap-2 text-stone-700">
          <UploadCloud size={18} className="text-amber-800" />
          <span className="text-xs font-black">{buttonText}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex-1 flex items-center justify-center p-4 md:p-8 ${className}`}>
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`glass-panel rounded-3xl p-8 md:p-12 text-center max-w-lg w-full relative group border transition-all duration-300 cursor-pointer ${
          isDragging
            ? 'border-amber-600 bg-amber-50/80 shadow-2xl scale-[1.01] ring-4 ring-amber-300/40'
            : 'border-stone-300/80 hover:border-amber-700/60 hover:shadow-2xl'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleInputChange}
          className="hidden"
        />

        {badge && (
          <div className="absolute top-4 right-4 bg-amber-200/80 text-amber-950 text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider">
            {badge}
          </div>
        )}

        <div className="w-18 h-18 bg-[#18181b] text-white rounded-3xl flex items-center justify-center mx-auto mb-5 shadow-xl group-hover:scale-110 group-hover:rotate-2 transition-transform duration-300">
          {icon || <UploadCloud size={34} className="text-amber-400" />}
        </div>

        <h3 className="text-2xl font-black text-stone-900 mb-1.5 tracking-tight">
          {title}
        </h3>

        <p className="text-xs text-stone-500 max-w-xs mx-auto mb-6 leading-relaxed font-medium">
          {subtitle}
        </p>

        <div className="inline-flex items-center gap-2 bg-[#18181b] group-hover:bg-black text-white px-7 py-3.5 rounded-2xl text-xs font-black shadow-lg transition-all active:scale-95">
          <span>{buttonText}</span>
        </div>

        {supportsClipboardPaste && (
          <p className="mt-4 text-[10px] font-bold text-stone-600">
            Tip: También puedes pegar capturas o archivos directamente con <kbd className="bg-stone-200 px-1.5 py-0.5 rounded text-stone-800">Ctrl + V</kbd>
          </p>
        )}
      </div>
    </div>
  );
}
