import React, { useState } from 'react';
import { DetectedFontInfo, TextElement } from '../../types/pdf';

interface FontMatcherOverlayProps {
  textItems: DetectedFontInfo[];
  scale: number;
  originalHeight: number;
  onDirectEditText: (replacementElement: TextElement) => void;
  pageIndex: number;
  active: boolean;
}

export default function FontMatcherOverlay({
  textItems,
  scale,
  originalHeight,
  onDirectEditText,
  pageIndex,
  active,
}: FontMatcherOverlayProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (!active || textItems.length === 0) return null;

  const handleTextClick = (item: DetectedFontInfo) => {
    // In PDF coordinates, item.y is distance from bottom.
    // Convert to top-left coordinate system:
    const topY = Math.max(0, originalHeight - item.y - item.height);

    // Build immediate replacement element with exact matched font and size
    const newElement: TextElement = {
      id: Math.random().toString(36).substring(7),
      type: 'text',
      pageIndex,
      x: Math.round(item.x),
      y: Math.round(topY),
      width: Math.max(Math.round(item.width + 8), 60),
      height: Math.max(Math.round(item.height + 4), Math.round(item.fontSize * 1.3), 20),
      text: item.text,
      fontFamily: item.matchedFamily,
      fontSize: Math.max(8, Math.round(item.fontSize)),
      fontWeight: item.fontWeight,
      fontStyle: item.fontStyle,
      color: item.color || '#000000',
      backgroundColor: '#ffffff', // Covers the text behind cleanly
      backgroundOpacity: 1,
      alignment: 'left',
      isCoveringOldText: true,
    };

    onDirectEditText(newElement);
  };

  return (
    <div className="absolute inset-0 pointer-events-auto z-15">
      {textItems.map((item, idx) => {
        const topY = (originalHeight - item.y - item.height) * scale;
        const leftX = item.x * scale;
        const width = Math.max(item.width * scale, 18);
        const height = Math.max(item.height * scale, 16);
        const isHovered = hoveredIdx === idx;

        return (
          <div
            key={idx}
            onClick={(e) => {
              e.stopPropagation();
              handleTextClick(item);
            }}
            onTouchEnd={(e) => {
              e.stopPropagation();
              handleTextClick(item);
            }}
            onMouseEnter={() => setHoveredIdx(idx)}
            onMouseLeave={() => setHoveredIdx(null)}
            className={`absolute cursor-pointer transition-all duration-75 rounded-xs ${
              isHovered
                ? 'bg-amber-500/20 ring-1 ring-amber-500/80'
                : 'hover:bg-amber-500/15 active:bg-amber-500/30'
            }`}
            style={{
              left: `${leftX}px`,
              top: `${topY}px`,
              width: `${width}px`,
              height: `${height}px`,
            }}
            title="Toca para editar este texto"
          />
        );
      })}
    </div>
  );
}
