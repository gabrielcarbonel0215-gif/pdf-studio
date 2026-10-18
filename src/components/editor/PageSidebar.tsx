import React from 'react';
import { PageThumbnail } from '../../types/pdf';
import { Layers, RotateCw, Trash2, Plus, Camera } from 'lucide-react';

interface PageSidebarProps {
  thumbnails: PageThumbnail[];
  currentPageIndex: number;
  onSelectPage: (index: number) => void;
  onRotatePage: (index: number) => void;
  onDeletePage?: (index: number) => void;
  onInsertBlankPage?: (afterIndex: number) => void;
}

export default function PageSidebar({
  thumbnails,
  currentPageIndex,
  onSelectPage,
  onRotatePage,
  onDeletePage,
  onInsertBlankPage,
}: PageSidebarProps) {
  return (
    <aside className="w-52 bg-[#f4efe8] border-r border-[#ded7cc] flex flex-col overflow-y-auto select-none">
      <div className="p-3.5 border-b border-[#ded7cc] bg-[#eae4d9] flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center space-x-2 text-xs font-bold text-stone-800">
          <Camera size={15} className="text-amber-800" />
          <span>Hojas ({thumbnails.length})</span>
        </div>
      </div>

      <div className="p-3 space-y-4">
        {thumbnails.map((thumb) => {
          const isSelected = thumb.pageIndex === currentPageIndex;

          return (
            <div key={thumb.pageIndex} className="relative group">
              <div
                onClick={() => onSelectPage(thumb.pageIndex)}
                className={`cursor-pointer polaroid-card rounded-2xl p-2 transition-all flex flex-col items-center gap-1.5 ${
                  isSelected
                    ? 'ring-2 ring-amber-700 shadow-md scale-102 bg-[#fdfbf7]'
                    : 'opacity-85 hover:opacity-100'
                }`}
              >
                {/* Thumbnail Image inside Mini Polaroid */}
                <div className="w-full bg-stone-100 rounded-xl overflow-hidden flex items-center justify-center min-h-[140px] relative border border-stone-200 shadow-inner">
                  <img
                    src={thumb.thumbnailUrl}
                    alt={`Página ${thumb.pageIndex + 1}`}
                    className="max-w-full max-h-[150px] object-contain"
                    style={{
                      transform: `rotate(${thumb.rotation || 0}deg)`,
                      transition: 'transform 0.2s',
                    }}
                  />
                  {thumb.rotation !== 0 && (
                    <span className="absolute top-1 right-1 bg-amber-500 text-stone-950 text-[9px] font-black px-1.5 py-0.5 rounded-md shadow-xs">
                      {thumb.rotation}°
                    </span>
                  )}
                </div>

                {/* Page Number on bottom chin */}
                <span className={`text-[11px] font-black ${isSelected ? 'text-amber-900' : 'text-stone-600'}`}>
                  Pág. {thumb.pageIndex + 1}
                </span>
              </div>

              {/* Hover Quick Actions */}
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-stone-900/80 rounded-lg p-1 flex items-center space-x-1 shadow-md z-10">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRotatePage(thumb.pageIndex);
                  }}
                  title="Rotar 90°"
                  className="p-1 text-white hover:text-amber-400 rounded transition-colors"
                >
                  <RotateCw size={12} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
}
