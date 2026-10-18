import React, { useRef, useState, useEffect } from 'react';
import { X, PenTool, Upload, Trash2, Check } from 'lucide-react';

interface SignatureDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveSignature: (dataUrl: string) => void;
}

export default function SignatureDialog({ isOpen, onClose, onSaveSignature }: SignatureDialogProps) {
  const [tab, setTab] = useState<'draw' | 'upload'>('draw');
  const [penColor, setPenColor] = useState('#0f172a');
  const [penWidth, setPenWidth] = useState(3);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [removeBackground, setRemoveBackground] = useState(true);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawing = useRef(false);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (isOpen && tab === 'draw' && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
      }
    }
  }, [isOpen, tab]);

  if (!isOpen) return null;

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    isDrawing.current = true;
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    lastPoint.current = {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing.current || !lastPoint.current || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const currentX = clientX - rect.left;
    const currentY = clientY - rect.top;

    ctx.strokeStyle = penColor;
    ctx.lineWidth = penWidth;
    ctx.beginPath();
    ctx.moveTo(lastPoint.current.x, lastPoint.current.y);
    ctx.lineTo(currentX, currentY);
    ctx.stroke();

    lastPoint.current = { x: currentX, y: currentY };
  };

  const stopDrawing = () => {
    isDrawing.current = false;
    lastPoint.current = null;
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = () => {
        setUploadedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const processAndSave = () => {
    if (tab === 'draw') {
      const canvas = canvasRef.current;
      if (!canvas) return;
      // Convert transparent canvas directly to PNG data URL
      const dataUrl = canvas.toDataURL('image/png');
      onSaveSignature(dataUrl);
      onClose();
    } else if (tab === 'upload' && uploadedImage) {
      if (removeBackground) {
        // Process uploaded image to make white background transparent
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          const tempCanvas = document.createElement('canvas');
          tempCanvas.width = img.width;
          tempCanvas.height = img.height;
          const ctx = tempCanvas.getContext('2d');
          if (!ctx) return;
          ctx.drawImage(img, 0, 0);
          const imgData = ctx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
          const data = imgData.data;
          for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            // If color is very bright/white, make transparent
            if (r > 200 && g > 200 && b > 200) {
              const alpha = Math.max(0, 255 - ((r + g + b) / 3));
              data[i + 3] = alpha < 30 ? 0 : alpha;
            }
          }
          ctx.putImageData(imgData, 0, 0);
          onSaveSignature(tempCanvas.toDataURL('image/png'));
          onClose();
        };
        img.src = uploadedImage;
      } else {
        onSaveSignature(uploadedImage);
        onClose();
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 px-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-blue-600 text-white rounded-xl">
              <PenTool size={18} />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-base">Insertar Firma</h3>
              <p className="text-xs text-slate-500">Dibuja o sube tu firma digital</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 px-6 pt-2 bg-white">
          <button
            onClick={() => setTab('draw')}
            className={`pb-2.5 px-4 text-sm font-semibold border-b-2 flex items-center gap-2 transition-colors ${
              tab === 'draw'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <PenTool size={16} />
            Dibujar firma
          </button>
          <button
            onClick={() => setTab('upload')}
            className={`pb-2.5 px-4 text-sm font-semibold border-b-2 flex items-center gap-2 transition-colors ${
              tab === 'upload'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Upload size={16} />
            Subir imagen
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {tab === 'draw' ? (
            <div className="space-y-4">
              {/* Canvas area */}
              <div className="relative border-2 border-dashed border-slate-300 rounded-2xl bg-slate-50/70 overflow-hidden">
                <canvas
                  ref={canvasRef}
                  width={460}
                  height={180}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                  className="w-full h-[180px] cursor-crosshair touch-none"
                />
                <div className="absolute bottom-3 left-4 pointer-events-none text-[11px] text-slate-400 font-medium">
                  Firma sobre la línea
                </div>
                <div className="absolute bottom-7 left-4 right-4 h-px bg-slate-300 pointer-events-none border-b border-dashed border-slate-400" />
              </div>

              {/* Controls */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-semibold text-slate-600">Color:</span>
                  {['#0f172a', '#1e40af', '#dc2626'].map((color) => (
                    <button
                      key={color}
                      onClick={() => setPenColor(color)}
                      className={`w-6 h-6 rounded-full border-2 transition-transform ${
                        penColor === color ? 'scale-110 border-blue-500 ring-2 ring-blue-200' : 'border-white'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>

                <div className="flex items-center space-x-2">
                  <span className="text-xs font-semibold text-slate-600">Grosor:</span>
                  <input
                    type="range"
                    min={1}
                    max={6}
                    value={penWidth}
                    onChange={(e) => setPenWidth(parseInt(e.target.value))}
                    className="w-24 accent-blue-600"
                  />
                </div>

                <button
                  onClick={clearCanvas}
                  className="flex items-center space-x-1.5 text-xs text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg font-medium transition-colors"
                >
                  <Trash2 size={14} />
                  <span>Borrar</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="border-2 border-dashed border-slate-300 rounded-2xl p-6 text-center bg-slate-50 relative hover:bg-slate-100 transition-colors">
                <input
                  type="file"
                  accept="image/png, image/jpeg, image/webp"
                  onChange={handleImageUpload}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                />
                {uploadedImage ? (
                  <div className="flex flex-col items-center">
                    <img
                      src={uploadedImage}
                      alt="Firma subida"
                      className="max-h-36 object-contain rounded-lg border border-slate-200 bg-white p-2 shadow-sm"
                    />
                    <span className="text-xs text-blue-600 font-semibold mt-2">Haz clic para cambiar imagen</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center">
                    <Upload className="h-10 w-10 text-slate-400 mb-2" />
                    <p className="text-sm font-semibold text-slate-700">Selecciona una imagen de tu firma</p>
                    <p className="text-xs text-slate-400 mt-1">PNG, JPG o WebP</p>
                  </div>
                )}
              </div>

              {uploadedImage && (
                <label className="flex items-center space-x-2 text-xs font-medium text-slate-700 cursor-pointer p-2 bg-slate-50 rounded-xl">
                  <input
                    type="checkbox"
                    checked={removeBackground}
                    onChange={(e) => setRemoveBackground(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                  />
                  <span>Hacer transparente el fondo blanco automáticamente</span>
                </label>
              )}
            </div>
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
            onClick={processAndSave}
            className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-xl text-sm font-medium shadow-sm transition-colors"
          >
            <Check size={16} />
            <span>Insertar Firma en PDF</span>
          </button>
        </div>
      </div>
    </div>
  );
}
