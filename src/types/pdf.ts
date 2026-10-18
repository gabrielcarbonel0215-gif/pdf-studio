export type ToolType =
  | 'select'
  | 'text'
  | 'font_matcher'
  | 'replace_text'
  | 'rectangle'
  | 'circle'
  | 'line'
  | 'arrow'
  | 'highlight'
  | 'draw'
  | 'signature'
  | 'stamp'
  | 'image'
  | 'watermark'
  | 'page_number';

export type StandardFontFamily = 'Helvetica' | 'Times-Roman' | 'Courier';

export interface DetectedFontInfo {
  originalFontName: string;
  matchedFamily: StandardFontFamily;
  fallbackFontFamily: string;
  fontSize: number; // in PDF points
  fontWeight: 'normal' | 'bold';
  fontStyle: 'normal' | 'italic';
  color: string; // hex
  text: string;
  x: number; // PDF points coordinates
  y: number; // PDF points coordinates
  width: number;
  height: number;
  rotation: number;
}

export interface BaseElement {
  id: string;
  pageIndex: number;
  x: number; // in PDF points (from bottom-left in PDF coords or translated)
  y: number;
  width: number;
  height: number;
  rotation?: number;
  opacity?: number;
}

export interface TextElement extends BaseElement {
  type: 'text';
  text: string;
  fontFamily: StandardFontFamily;
  fontSize: number;
  fontWeight: 'normal' | 'bold';
  fontStyle: 'normal' | 'italic';
  underline?: boolean;
  color: string; // hex
  backgroundColor?: string; // hex or transparent
  backgroundOpacity?: number;
  alignment: 'left' | 'center' | 'right';
  isCoveringOldText?: boolean;
}

export interface ShapeElement extends BaseElement {
  type: 'rectangle' | 'circle' | 'line' | 'arrow' | 'highlight';
  strokeColor: string;
  fillColor?: string;
  strokeWidth: number;
  isFilled?: boolean;
}

export interface DrawElement extends BaseElement {
  type: 'draw';
  points: { x: number; y: number }[];
  color: string;
  strokeWidth: number;
}

export interface SignatureElement extends BaseElement {
  type: 'signature';
  imageDataUrl: string;
}

export interface StampElement extends BaseElement {
  type: 'stamp';
  text: string;
  variant: 'approved' | 'confidential' | 'copy' | 'paid' | 'void' | 'draft' | 'reviewed' | 'custom';
  color: string;
  borderWidth: number;
}

export interface ImageElement extends BaseElement {
  type: 'image';
  imageDataUrl: string;
}

export type AnnotationElement =
  | TextElement
  | ShapeElement
  | DrawElement
  | SignatureElement
  | StampElement
  | ImageElement;

export interface WatermarkConfig {
  enabled: boolean;
  text: string;
  fontFamily: StandardFontFamily;
  fontSize: number;
  color: string;
  opacity: number;
  rotation: number; // in degrees
  tiled: boolean;
  pages: 'all' | 'first' | 'custom';
  customPages?: string;
}

export interface PageNumberConfig {
  enabled: boolean;
  format: 'page_of_total' | 'page_only' | 'doc_page' | 'custom';
  customFormat?: string; // e.g. "Página {n} de {total}"
  position: 'bottom-center' | 'bottom-right' | 'bottom-left' | 'top-center' | 'top-right' | 'top-left';
  fontSize: number;
  color: string;
  fontFamily: StandardFontFamily;
  startNumber: number;
  margin: number;
}

export interface PageThumbnail {
  pageIndex: number;
  thumbnailUrl: string;
  width: number;
  height: number;
  rotation: number;
}

export interface DocumentMetadata {
  title?: string;
  author?: string;
  subject?: string;
  keywords?: string;
  creator?: string;
  producer?: string;
  creationDate?: string;
  modificationDate?: string;
}
