import { DetectedFontInfo, StandardFontFamily } from '../types/pdf';

interface FontMatchResult {
  matchedFamily: StandardFontFamily;
  fallbackFontFamily: string;
  fontWeight: 'normal' | 'bold';
  fontStyle: 'normal' | 'italic';
  confidence: number;
  displayName: string;
}

/**
 * Analyzes a raw font name string and/or style object from PDF.js to determine
 * the closest standard PDF font and formatting (bold, italic, serif, sans-serif, monospace).
 */
export function matchFont(
  rawFontName: string = '',
  fontFamilyFromStyle: string = '',
  fontObj: any = {}
): FontMatchResult {
  const fontNameStr = fontObj.name || fontObj.fontFamily || '';
  const combined = `${rawFontName} ${fontFamilyFromStyle} ${fontNameStr}`.toLowerCase();

  // Detect bold
  const isBold =
    fontObj.bold === true ||
    fontObj.black === true ||
    fontObj.fontWeight === 'bold' ||
    (typeof fontObj.fontWeight === 'number' && fontObj.fontWeight >= 600) ||
    combined.includes('bold') ||
    combined.includes('black') ||
    combined.includes('heavy') ||
    combined.includes('semi-bold') ||
    combined.includes('semibold') ||
    combined.includes('w6') ||
    combined.includes('w7') ||
    combined.includes('w8') ||
    combined.includes('w9') ||
    combined.includes('700') ||
    combined.includes('800') ||
    combined.includes('900');

  // Detect italic
  const isItalic =
    fontObj.italic === true ||
    combined.includes('italic') ||
    combined.includes('oblique') ||
    combined.includes('slanted') ||
    combined.includes('kursiv');

  // Detect Monospace / Typewriter
  const isMonospace =
    fontObj.monospace === true ||
    combined.includes('courier') ||
    combined.includes('mono') ||
    combined.includes('consolas') ||
    combined.includes('menlo') ||
    combined.includes('typewriter') ||
    combined.includes('ocr');

  // Detect Sans-Serif explicitly first so "sans-serif" does not falsely match "serif"
  const isSans =
    combined.includes('sans') ||
    combined.includes('helvetica') ||
    combined.includes('arial') ||
    combined.includes('verdana') ||
    combined.includes('tahoma') ||
    combined.includes('trebuchet') ||
    combined.includes('calibri') ||
    combined.includes('segoe') ||
    combined.includes('inter') ||
    combined.includes('roboto');

  // Detect Serif (strictly excluding sans-serif)
  const isSerif =
    !isSans &&
    (fontObj.serif === true ||
      combined.includes('times') ||
      combined.includes('roman') ||
      combined.includes('georgia') ||
      combined.includes('garamond') ||
      combined.includes('cambria') ||
      combined.includes('baskerville') ||
      combined.includes('palatino') ||
      (combined.includes('serif') && !combined.includes('sans')));

  if (isMonospace) {
    return {
      matchedFamily: 'Courier',
      fallbackFontFamily: 'Courier New, Courier, monospace',
      fontWeight: isBold ? 'bold' : 'normal',
      fontStyle: isItalic ? 'italic' : 'normal',
      confidence: 0.95,
      displayName: `Courier ${isBold ? 'Bold' : ''} ${isItalic ? 'Italic' : ''}`.trim(),
    };
  }

  if (isSerif) {
    return {
      matchedFamily: 'Times-Roman',
      fallbackFontFamily: 'Times New Roman, Times, serif',
      fontWeight: isBold ? 'bold' : 'normal',
      fontStyle: isItalic ? 'italic' : 'normal',
      confidence: 0.9,
      displayName: `Times New Roman ${isBold ? 'Bold' : ''} ${isItalic ? 'Italic' : ''}`.trim(),
    };
  }

  // Default to Sans-Serif (Helvetica/Arial)
  return {
    matchedFamily: 'Helvetica',
    fallbackFontFamily: 'Arial, Helvetica, sans-serif',
    fontWeight: isBold ? 'bold' : 'normal',
    fontStyle: isItalic ? 'italic' : 'normal',
    confidence: 0.9,
    displayName: `Helvetica / Arial ${isBold ? 'Bold' : ''} ${isItalic ? 'Italic' : ''}`.trim(),
  };
}

/**
 * Normalizes text items from PDF.js page.getTextContent() into structured DetectedFontInfo
 */
export function extractFontInfoFromTextItem(
  item: any,
  styles: Record<string, any> = {},
  pageHeight: number
): DetectedFontInfo {
  const fontObj = styles[item.fontName] || {};
  const rawFontName = fontObj.fontFamily || item.fontName || '';
  const match = matchFont(item.fontName, fontObj.fontFamily, fontObj);

  const transform = item.transform || [12, 0, 0, 12, 0, 0];
  const scaleX = transform[0];
  const skewY = transform[1];
  const transX = transform[4];
  const transY = transform[5];

  // Font size in points
  const calculatedFontSize = Math.round(Math.hypot(scaleX, skewY) * 10) / 10 || item.height || 12;

  // Rotation in degrees
  const angle = Math.round(Math.atan2(skewY, scaleX) * (180 / Math.PI));

  return {
    originalFontName: rawFontName || item.fontName || 'Desconocida',
    matchedFamily: match.matchedFamily,
    fallbackFontFamily: match.fallbackFontFamily,
    fontSize: Math.max(6, calculatedFontSize),
    fontWeight: match.fontWeight,
    fontStyle: match.fontStyle,
    color: '#000000', // standard text in PDFs is usually black unless specified
    text: item.str || '',
    x: transX,
    y: transY,
    width: item.width || calculatedFontSize * (item.str?.length || 1) * 0.5,
    height: item.height || calculatedFontSize * 1.15,
    rotation: angle,
  };
}

/**
 * Groups adjacent text fragments on the same baseline into complete, readable lines of text
 */
export function groupTextItemsIntoLines(items: DetectedFontInfo[]): DetectedFontInfo[] {
  if (items.length === 0) return [];

  // Sort top-to-bottom (higher Y to lower Y in PDF coords), then left-to-right (lower X to higher X)
  const sorted = [...items].sort((a, b) => {
    if (Math.abs(a.y - b.y) > 4) {
      return b.y - a.y; // Higher Y first
    }
    return a.x - b.x; // Left to right
  });

  const lines: DetectedFontInfo[] = [];
  let currentLine: DetectedFontInfo | null = null;

  for (const item of sorted) {
    if (!item.text.trim()) continue;

    if (!currentLine) {
      currentLine = { ...item };
      continue;
    }

    // Check if on the same horizontal baseline (within 5 points)
    const isSameBaseline = Math.abs(currentLine.y - item.y) <= 5;
    const isCloseHorizontally =
      item.x >= currentLine.x - 4 &&
      item.x - (currentLine.x + currentLine.width) <= Math.max(item.fontSize * 2.0, 35);

    if (isSameBaseline && isCloseHorizontally) {
      const needsSpace = !currentLine.text.endsWith(' ') && !item.text.startsWith(' ');
      currentLine.text = currentLine.text + (needsSpace ? ' ' : '') + item.text;
      currentLine.width = Math.max(currentLine.width, item.x + item.width - currentLine.x);
      currentLine.height = Math.max(currentLine.height, item.height);
      currentLine.fontSize = Math.max(currentLine.fontSize, item.fontSize);
      // Keep font family of the longest fragment
      if (item.text.length > currentLine.text.length / 2) {
        currentLine.matchedFamily = item.matchedFamily;
        currentLine.fontWeight = item.fontWeight;
        currentLine.fontStyle = item.fontStyle;
      }
    } else {
      lines.push(currentLine);
      currentLine = { ...item };
    }
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
}
