import {
  PDFDocument,
  rgb,
  degrees,
  StandardFonts,
  PDFPage,
  PDFFont,
  degrees as pdfDegrees,
} from 'pdf-lib';
import JSZip from 'jszip';
import {
  AnnotationElement,
  DocumentMetadata,
  PageNumberConfig,
  StandardFontFamily,
  TextElement,
  WatermarkConfig,
} from '../types/pdf';

/**
 * Converts a hex color string (#rrggbb or #rrggbbaa) to PDF-lib rgb
 */
export function hexToRgb(hex: string) {
  let cleanHex = hex.replace('#', '');
  if (cleanHex.length === 3) {
    cleanHex = cleanHex
      .split('')
      .map((c) => c + c)
      .join('');
  }
  const r = parseInt(cleanHex.substring(0, 2), 16) / 255 || 0;
  const g = parseInt(cleanHex.substring(2, 4), 16) / 255 || 0;
  const b = parseInt(cleanHex.substring(4, 6), 16) / 255 || 0;
  return rgb(r, g, b);
}

/**
 * Helper to download any byte buffer as a file
 */
export function downloadFile(bytes: Uint8Array | Blob, filename: string, mimeType: string = 'application/pdf') {
  const blob = bytes instanceof Blob ? bytes : new Blob([bytes], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Parses page range strings like "1-3, 5, 8-10" into 0-indexed page numbers
 */
export function parsePageRanges(rangeStr: string, totalPages: number): number[] {
  if (!rangeStr || !rangeStr.trim()) {
    return Array.from({ length: totalPages }, (_, i) => i);
  }
  const parts = rangeStr.split(',').map((s) => s.trim()).filter(Boolean);
  const pageIndices = new Set<number>();

  for (const part of parts) {
    if (part.includes('-')) {
      const [startStr, endStr] = part.split('-');
      const start = Math.max(1, parseInt(startStr, 10) || 1);
      const end = Math.min(totalPages, parseInt(endStr, 10) || totalPages);
      for (let i = start; i <= end; i++) {
        pageIndices.add(i - 1);
      }
    } else {
      const num = parseInt(part, 10);
      if (!isNaN(num) && num >= 1 && num <= totalPages) {
        pageIndices.add(num - 1);
      }
    }
  }

  return Array.from(pageIndices).sort((a, b) => a - b);
}

/**
 * Merges multiple PDFs with optional page ranges for each file
 */
export async function mergePdfs(
  items: { file: File; pageRanges?: string }[]
): Promise<Uint8Array> {
  const mergedPdf = await PDFDocument.create();

  for (const item of items) {
    const arrayBuffer = await item.file.arrayBuffer();
    const sourcePdf = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
    const totalPages = sourcePdf.getPageCount();
    const targetIndices = parsePageRanges(item.pageRanges || '', totalPages);

    const copiedPages = await mergedPdf.copyPages(sourcePdf, targetIndices);
    copiedPages.forEach((page) => mergedPdf.addPage(page));
  }

  return await mergedPdf.save();
}

/**
 * Extracts specific pages into a single PDF
 */
export async function extractPages(file: File, pageIndices: number[]): Promise<Uint8Array> {
  const arrayBuffer = await file.arrayBuffer();
  const sourcePdf = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
  const newPdf = await PDFDocument.create();
  const validIndices = pageIndices.filter((idx) => idx >= 0 && idx < sourcePdf.getPageCount());

  const copiedPages = await newPdf.copyPages(sourcePdf, validIndices);
  copiedPages.forEach((page) => newPdf.addPage(page));

  return await newPdf.save();
}

/**
 * Splits each page into its own individual PDF and packs them into a ZIP
 */
export async function splitPdfToZip(file: File, pageIndices?: number[]): Promise<Blob> {
  const arrayBuffer = await file.arrayBuffer();
  const sourcePdf = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
  const totalPages = sourcePdf.getPageCount();
  const indices = pageIndices && pageIndices.length > 0 ? pageIndices : Array.from({ length: totalPages }, (_, i) => i);

  const zip = new JSZip();
  const baseName = file.name.replace(/\.[^/.]+$/, '');

  for (let i = 0; i < indices.length; i++) {
    const pageIndex = indices[i];
    const singlePdf = await PDFDocument.create();
    const [copiedPage] = await singlePdf.copyPages(sourcePdf, [pageIndex]);
    singlePdf.addPage(copiedPage);
    const bytes = await singlePdf.save();
    const filename = `${baseName}_pagina_${pageIndex + 1}.pdf`;
    zip.file(filename, bytes);
  }

  return await zip.generateAsync({ type: 'blob' });
}

/**
 * Splits PDF by custom range groups (e.g. ["1-3", "4-7", "8-10"]) into a ZIP
 */
export async function splitPdfByRangeGroups(file: File, rangeGroups: string[]): Promise<Blob> {
  const arrayBuffer = await file.arrayBuffer();
  const sourcePdf = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
  const totalPages = sourcePdf.getPageCount();

  const zip = new JSZip();
  const baseName = file.name.replace(/\.[^/.]+$/, '');

  for (let idx = 0; idx < rangeGroups.length; idx++) {
    const rangeStr = rangeGroups[idx].trim();
    if (!rangeStr) continue;
    const indices = parsePageRanges(rangeStr, totalPages);
    if (indices.length === 0) continue;

    const partPdf = await PDFDocument.create();
    const copiedPages = await partPdf.copyPages(sourcePdf, indices);
    copiedPages.forEach((page) => partPdf.addPage(page));
    const bytes = await partPdf.save();
    const filename = `${baseName}_parte_${idx + 1}_(pag_${rangeStr.replace(/,/g, '_')}).pdf`;
    zip.file(filename, bytes);
  }

  return await zip.generateAsync({ type: 'blob' });
}

/**
 * Organizes pages (reordering, rotation, deletion, duplication, blank pages)
 */
export interface PageOrganizeAction {
  id: string;
  sourcePageIndex: number | 'blank';
  rotation: number; // 0, 90, 180, 270
}

export async function organizePdfPages(
  file: File,
  actions: PageOrganizeAction[]
): Promise<Uint8Array> {
  const arrayBuffer = await file.arrayBuffer();
  const sourcePdf = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
  const newPdf = await PDFDocument.create();

  // Get default page size from original document if available
  const defaultPage = sourcePdf.getPageCount() > 0 ? sourcePdf.getPage(0) : null;
  const defaultWidth = defaultPage ? defaultPage.getWidth() : 595.28;
  const defaultHeight = defaultPage ? defaultPage.getHeight() : 841.89;

  for (const action of actions) {
    if (action.sourcePageIndex === 'blank') {
      const blankPage = newPdf.addPage([defaultWidth, defaultHeight]);
      if (action.rotation) {
        blankPage.setRotation(pdfDegrees(action.rotation));
      }
    } else {
      const pageIndex = action.sourcePageIndex;
      if (pageIndex >= 0 && pageIndex < sourcePdf.getPageCount()) {
        const [copiedPage] = await newPdf.copyPages(sourcePdf, [pageIndex]);
        const currentRotation = copiedPage.getRotation().angle;
        const totalRotation = (currentRotation + action.rotation) % 360;
        copiedPage.setRotation(pdfDegrees(totalRotation));
        newPdf.addPage(copiedPage);
      }
    }
  }

  return await newPdf.save();
}

/**
 * Resolves standard PDF font object based on family and styles
 */
function resolvePdfFont(
  pdfDoc: PDFDocument,
  fontFamily: StandardFontFamily = 'Helvetica',
  isBold: boolean = false,
  isItalic: boolean = false
): Promise<PDFFont> {
  let fontName: StandardFonts = StandardFonts.Helvetica;

  if (fontFamily === 'Times-Roman') {
    if (isBold && isItalic) fontName = StandardFonts.TimesRomanBoldItalic;
    else if (isBold) fontName = StandardFonts.TimesRomanBold;
    else if (isItalic) fontName = StandardFonts.TimesRomanItalic;
    else fontName = StandardFonts.TimesRoman;
  } else if (fontFamily === 'Courier') {
    if (isBold && isItalic) fontName = StandardFonts.CourierBoldOblique;
    else if (isBold) fontName = StandardFonts.CourierBold;
    else if (isItalic) fontName = StandardFonts.CourierOblique;
    else fontName = StandardFonts.Courier;
  } else {
    // Helvetica
    if (isBold && isItalic) fontName = StandardFonts.HelveticaBoldOblique;
    else if (isBold) fontName = StandardFonts.HelveticaBold;
    else if (isItalic) fontName = StandardFonts.HelveticaOblique;
    else fontName = StandardFonts.Helvetica;
  }

  return pdfDoc.embedFont(fontName);
}

/**
 * Applies all user visual edits (text boxes, shapes, drawings, stamps, signatures, images, watermarks, numbering)
 * to a PDF file and exports the new PDF bytes.
 */
export async function applyStudioEditsToPdf(
  source: File | Uint8Array,
  annotationsByPage: Record<number, AnnotationElement[]>,
  watermarkConfig?: WatermarkConfig,
  pageNumberConfig?: PageNumberConfig,
  pageRotations: Record<number, number> = {}
): Promise<Uint8Array> {
  const arrayBuffer = source instanceof File ? await source.arrayBuffer() : source;
  const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
  const pages = pdfDoc.getPages();
  const totalPages = pages.length;

  // Apply page rotations if any
  for (let i = 0; i < totalPages; i++) {
    const rot = pageRotations[i];
    if (rot) {
      const page = pages[i];
      const cur = page.getRotation().angle;
      page.setRotation(pdfDegrees((cur + rot) % 360));
    }
  }

  // Pre-embed common fonts
  const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

  // 1. Process annotations page by page
  for (let pageIdx = 0; pageIdx < totalPages; pageIdx++) {
    const page = pages[pageIdx];
    const { width: pageWidth, height: pageHeight } = page.getSize();
    const elements = annotationsByPage[pageIdx] || [];

    for (const el of elements) {
      // In PDF-lib, Y is 0 at the BOTTOM of the page.
      // Our UI coordinates are normalized from TOP-LEFT of page in PDF points:
      // pdfY = pageHeight - el.y - el.height
      const pdfX = el.x;
      const pdfY = pageHeight - el.y - el.height;

      if (el.type === 'text') {
        const textEl = el as TextElement;
        const font = await resolvePdfFont(
          pdfDoc,
          textEl.fontFamily,
          textEl.fontWeight === 'bold',
          textEl.fontStyle === 'italic'
        );

        // Draw background box if specified (e.g. for white-out or redaction)
        if (textEl.backgroundColor && textEl.backgroundColor !== 'transparent') {
          page.drawRectangle({
            x: pdfX,
            y: pdfY,
            width: textEl.width,
            height: textEl.height,
            color: hexToRgb(textEl.backgroundColor),
            opacity: textEl.backgroundOpacity ?? 1,
          });
        }

        // Draw text lines (multiline support)
        const lines = textEl.text.split('\n');
        const lineHeight = textEl.fontSize * 1.25;
        const fontColor = hexToRgb(textEl.color || '#000000');

        lines.forEach((line, lineIdx) => {
          if (!line) return;
          const lineWidth = font.widthOfTextAtSize(line, textEl.fontSize);
          let startX = pdfX;
          if (textEl.alignment === 'center') {
            startX = pdfX + (textEl.width - lineWidth) / 2;
          } else if (textEl.alignment === 'right') {
            startX = pdfX + (textEl.width - lineWidth);
          }

          // PDF text drawing baseline Y
          const textY = pageHeight - el.y - (lineIdx + 1) * lineHeight + textEl.fontSize * 0.25;

          page.drawText(line, {
            x: startX,
            y: textY,
            size: textEl.fontSize,
            font,
            color: fontColor,
            opacity: textEl.opacity ?? 1,
          });

          // Draw underline if enabled
          if (textEl.underline) {
            const lineThickness = Math.max(0.8, textEl.fontSize * 0.07);
            const underlineY = textY - textEl.fontSize * 0.12;
            page.drawLine({
              start: { x: startX, y: underlineY },
              end: { x: startX + lineWidth, y: underlineY },
              color: fontColor,
              thickness: lineThickness,
              opacity: textEl.opacity ?? 1,
            });
          }
        });
      } else if (el.type === 'rectangle' || el.type === 'highlight') {
        const shape = el;
        const isHighlight = shape.type === 'highlight';
        page.drawRectangle({
          x: pdfX,
          y: pdfY,
          width: shape.width,
          height: shape.height,
          color: shape.fillColor ? hexToRgb(shape.fillColor) : undefined,
          borderColor: isHighlight ? undefined : hexToRgb(shape.strokeColor),
          borderWidth: isHighlight ? 0 : shape.strokeWidth,
          opacity: isHighlight ? 0.35 : shape.opacity ?? 1,
        });
      } else if (el.type === 'circle') {
        const shape = el;
        const radiusX = shape.width / 2;
        const radiusY = shape.height / 2;
        page.drawEllipse({
          x: pdfX + radiusX,
          y: pdfY + radiusY,
          xScale: radiusX,
          yScale: radiusY,
          color: shape.fillColor ? hexToRgb(shape.fillColor) : undefined,
          borderColor: hexToRgb(shape.strokeColor),
          borderWidth: shape.strokeWidth,
          opacity: shape.opacity ?? 1,
        });
      } else if (el.type === 'line' || el.type === 'arrow') {
        const shape = el;
        page.drawLine({
          start: { x: pdfX, y: pdfY + shape.height },
          end: { x: pdfX + shape.width, y: pdfY },
          color: hexToRgb(shape.strokeColor),
          thickness: shape.strokeWidth,
          opacity: shape.opacity ?? 1,
        });
      } else if (el.type === 'signature' || el.type === 'image') {
        const imgEl = el;
        try {
          let embeddedImage;
          if (imgEl.imageDataUrl.startsWith('data:image/png')) {
            embeddedImage = await pdfDoc.embedPng(imgEl.imageDataUrl);
          } else {
            embeddedImage = await pdfDoc.embedJpg(imgEl.imageDataUrl);
          }

          page.drawImage(embeddedImage, {
            x: pdfX,
            y: pdfY,
            width: imgEl.width,
            height: imgEl.height,
            opacity: imgEl.opacity ?? 1,
          });
        } catch (err) {
          console.error('Error embedding image in PDF:', err);
        }
      } else if (el.type === 'stamp') {
        const stamp = el;
        const stampFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
        const stampColor = hexToRgb(stamp.color || '#dc2626');

        // Draw outer stamp border
        page.drawRectangle({
          x: pdfX,
          y: pdfY,
          width: stamp.width,
          height: stamp.height,
          borderColor: stampColor,
          borderWidth: stamp.borderWidth || 3,
          color: rgb(1, 1, 1),
          opacity: 0.9,
        });

        // Draw inner border for official seal look
        page.drawRectangle({
          x: pdfX + 3,
          y: pdfY + 3,
          width: Math.max(1, stamp.width - 6),
          height: Math.max(1, stamp.height - 6),
          borderColor: stampColor,
          borderWidth: 1,
          opacity: 0.8,
        });

        const stampText = stamp.text.toUpperCase();
        const stampFontSize = Math.min(stamp.height * 0.45, 20);
        const textWidth = stampFont.widthOfTextAtSize(stampText, stampFontSize);

        page.drawText(stampText, {
          x: pdfX + (stamp.width - textWidth) / 2,
          y: pdfY + (stamp.height - stampFontSize) / 2 + 2,
          size: stampFontSize,
          font: stampFont,
          color: stampColor,
        });
      }
    }

    // 2. Apply watermark if enabled
    if (watermarkConfig && watermarkConfig.enabled && watermarkConfig.text.trim()) {
      let applyToThisPage = true;
      if (watermarkConfig.pages === 'first' && pageIdx !== 0) applyToThisPage = false;
      if (watermarkConfig.pages === 'custom' && watermarkConfig.customPages) {
        const allowedPages = parsePageRanges(watermarkConfig.customPages, totalPages);
        if (!allowedPages.includes(pageIdx)) applyToThisPage = false;
      }

      if (applyToThisPage) {
        const wmFont = await resolvePdfFont(pdfDoc, watermarkConfig.fontFamily, true);
        const wmSize = watermarkConfig.fontSize || 48;
        const wmColor = hexToRgb(watermarkConfig.color || '#94a3b8');
        const textWidth = wmFont.widthOfTextAtSize(watermarkConfig.text, wmSize);

        if (watermarkConfig.tiled) {
          // Tiled repeating watermark
          for (let x = 50; x < pageWidth; x += textWidth + 100) {
            for (let y = 50; y < pageHeight; y += 150) {
              page.drawText(watermarkConfig.text, {
                x,
                y,
                size: wmSize * 0.6,
                font: wmFont,
                color: wmColor,
                opacity: watermarkConfig.opacity || 0.15,
                rotate: pdfDegrees(watermarkConfig.rotation || -30),
              });
            }
          }
        } else {
          // Single large center watermark
          page.drawText(watermarkConfig.text, {
            x: (pageWidth - textWidth) / 2,
            y: pageHeight / 2,
            size: wmSize,
            font: wmFont,
            color: wmColor,
            opacity: watermarkConfig.opacity || 0.2,
            rotate: pdfDegrees(watermarkConfig.rotation || -45),
          });
        }
      }
    }

    // 3. Apply Page Numbering if enabled
    if (pageNumberConfig && pageNumberConfig.enabled) {
      const pnFont = await resolvePdfFont(pdfDoc, pageNumberConfig.fontFamily);
      const currentNumber = pageIdx + (pageNumberConfig.startNumber || 1);
      let numText = '';

      if (pageNumberConfig.format === 'page_of_total') {
        numText = `Página ${currentNumber} de ${totalPages}`;
      } else if (pageNumberConfig.format === 'doc_page') {
        numText = `Doc - ${currentNumber}`;
      } else if (pageNumberConfig.format === 'custom' && pageNumberConfig.customFormat) {
        numText = pageNumberConfig.customFormat
          .replace('{n}', currentNumber.toString())
          .replace('{total}', totalPages.toString());
      } else {
        numText = `${currentNumber}`;
      }

      const pnSize = pageNumberConfig.fontSize || 10;
      const textWidth = pnFont.widthOfTextAtSize(numText, pnSize);
      const margin = pageNumberConfig.margin || 30;
      let pnX = (pageWidth - textWidth) / 2;
      let pnY = margin;

      if (pageNumberConfig.position.includes('top')) {
        pnY = pageHeight - margin;
      }
      if (pageNumberConfig.position.includes('left')) {
        pnX = margin;
      } else if (pageNumberConfig.position.includes('right')) {
        pnX = pageWidth - textWidth - margin;
      }

      page.drawText(numText, {
        x: pnX,
        y: pnY,
        size: pnSize,
        font: pnFont,
        color: hexToRgb(pageNumberConfig.color || '#475569'),
      });
    }
  }

  return await pdfDoc.save();
}

/**
 * Flattens annotations and form fields into static vector page content
 */
export async function flattenPdf(file: File): Promise<Uint8Array> {
  const arrayBuffer = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
  const form = pdfDoc.getForm();
  try {
    form.flatten();
  } catch (e) {
    // PDF might not have interactive form fields
  }
  return await pdfDoc.save({ useObjectStreams: true });
}

/**
 * Optimizes a PDF by stripping redundant metadata, compressing object streams,
 * and rebuilding cross-reference tables without rasterizing or destroying vector text.
 */
export async function optimizePdf(
  file: File,
  stripMetadata: boolean = false
): Promise<Uint8Array> {
  const arrayBuffer = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });

  if (stripMetadata) {
    pdfDoc.setTitle('');
    pdfDoc.setAuthor('');
    pdfDoc.setSubject('');
    pdfDoc.setKeywords([]);
    pdfDoc.setProducer('PDF Studio Pro');
    pdfDoc.setCreator('PDF Studio Pro');
  }

  // Save with optimized object streams and compressed tables
  return await pdfDoc.save({
    useObjectStreams: true,
    addDefaultPage: false,
    objectsPerTick: 50,
  });
}

/**
 * Updates document metadata (Title, Author, Subject, Keywords, Creator, Producer)
 */
export async function updatePdfMetadata(
  file: File,
  metadata: DocumentMetadata
): Promise<Uint8Array> {
  const arrayBuffer = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });

  if (metadata.title !== undefined) pdfDoc.setTitle(metadata.title);
  if (metadata.author !== undefined) pdfDoc.setAuthor(metadata.author);
  if (metadata.subject !== undefined) pdfDoc.setSubject(metadata.subject);
  if (metadata.keywords !== undefined) {
    const kw = Array.isArray(metadata.keywords) ? metadata.keywords : metadata.keywords.split(',').map((k) => k.trim());
    pdfDoc.setKeywords(kw);
  }
  if (metadata.creator !== undefined) pdfDoc.setCreator(metadata.creator);
  if (metadata.producer !== undefined) pdfDoc.setProducer(metadata.producer);

  pdfDoc.setModificationDate(new Date());

  return await pdfDoc.save();
}

/**
 * Converts images (JPG/PNG/WebP) to a formatted PDF document
 */
export interface ImageToPdfOptions {
  pageSize: 'a4' | 'letter' | 'fit';
  orientation: 'portrait' | 'landscape' | 'auto';
  margin: number; // in points
}

export async function convertImagesToPdf(
  imageFiles: File[],
  options: ImageToPdfOptions
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();

  const standardSizes = {
    a4: { width: 595.28, height: 841.89 },
    letter: { width: 612.0, height: 792.0 },
  };

  for (const imgFile of imageFiles) {
    const arrayBuffer = await imgFile.arrayBuffer();
    let embeddedImg;

    if (imgFile.type.includes('png')) {
      embeddedImg = await pdfDoc.embedPng(arrayBuffer);
    } else {
      // For JPG / WebP, convert to standard JPG image buffer if needed
      try {
        embeddedImg = await pdfDoc.embedJpg(arrayBuffer);
      } catch (err) {
        // Fallback for WebP or other formats via HTML Canvas
        const dataUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(imgFile);
        });
        const img = new Image();
        img.src = dataUrl;
        await new Promise((res) => {
          img.onload = res;
        });
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d')!;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        const jpegDataUrl = canvas.toDataURL('image/jpeg', 0.95);
        embeddedImg = await pdfDoc.embedJpg(jpegDataUrl);
      }
    }

    const imgWidth = embeddedImg.width;
    const imgHeight = embeddedImg.height;

    let targetWidth: number;
    let targetHeight: number;

    if (options.pageSize === 'fit') {
      targetWidth = imgWidth + options.margin * 2;
      targetHeight = imgHeight + options.margin * 2;
    } else {
      const baseSize = standardSizes[options.pageSize];
      const isImgLandscape = imgWidth > imgHeight;

      if (
        options.orientation === 'landscape' ||
        (options.orientation === 'auto' && isImgLandscape)
      ) {
        targetWidth = Math.max(baseSize.width, baseSize.height);
        targetHeight = Math.min(baseSize.width, baseSize.height);
      } else {
        targetWidth = Math.min(baseSize.width, baseSize.height);
        targetHeight = Math.max(baseSize.width, baseSize.height);
      }
    }

    const page = pdfDoc.addPage([targetWidth, targetHeight]);
    const availWidth = targetWidth - options.margin * 2;
    const availHeight = targetHeight - options.margin * 2;

    const scale = Math.min(availWidth / imgWidth, availHeight / imgHeight);
    const scaledWidth = imgWidth * scale;
    const scaledHeight = imgHeight * scale;

    const posX = (targetWidth - scaledWidth) / 2;
    const posY = (targetHeight - scaledHeight) / 2;

    page.drawImage(embeddedImg, {
      x: posX,
      y: posY,
      width: scaledWidth,
      height: scaledHeight,
    });
  }

  return await pdfDoc.save();
}

/**
 * Creates a formatted PDF document from plain text or notes
 */
export async function convertTextToPdf(
  text: string,
  title: string = 'Documento de Texto'
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const pageWidth = 595.28; // A4
  const pageHeight = 841.89;
  const margin = 50;
  const contentWidth = pageWidth - margin * 2;
  const fontSize = 11;
  const lineHeight = fontSize * 1.5;

  let currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
  let currentY = pageHeight - margin;

  // Title
  if (title) {
    currentPage.drawText(title, {
      x: margin,
      y: currentY - 18,
      size: 18,
      font: boldFont,
      color: rgb(0.1, 0.1, 0.2),
    });
    currentY -= 40;
  }

  // Draw separator
  currentPage.drawLine({
    start: { x: margin, y: currentY },
    end: { x: pageWidth - margin, y: currentY },
    thickness: 1,
    color: rgb(0.8, 0.8, 0.8),
  });
  currentY -= 20;

  const paragraphs = text.split('\n');

  for (const para of paragraphs) {
    if (!para.trim()) {
      currentY -= lineHeight * 0.75;
      continue;
    }

    const words = para.split(' ');
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const testWidth = font.widthOfTextAtSize(testLine, fontSize);

      if (testWidth <= contentWidth) {
        currentLine = testLine;
      } else {
        if (currentY - lineHeight < margin) {
          currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
          currentY = pageHeight - margin;
        }

        currentPage.drawText(currentLine, {
          x: margin,
          y: currentY,
          size: fontSize,
          font,
          color: rgb(0.15, 0.15, 0.15),
        });
        currentY -= lineHeight;
        currentLine = word;
      }
    }

    if (currentLine) {
      if (currentY - lineHeight < margin) {
        currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
        currentY = pageHeight - margin;
      }
      currentPage.drawText(currentLine, {
        x: margin,
        y: currentY,
        size: fontSize,
        font,
        color: rgb(0.15, 0.15, 0.15),
      });
      currentY -= lineHeight;
    }
  }

  return await pdfDoc.save();
}
