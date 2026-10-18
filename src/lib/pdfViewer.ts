import * as pdfjsLib from 'pdfjs-dist';
import { extractFontInfoFromTextItem, groupTextItemsIntoLines } from './fontDetector';
import { DetectedFontInfo, PageThumbnail } from '../types/pdf';

// Configure pdfjs worker
try {
  // Use unpkg or cdnjs fallback to guarantee worker loads reliably in any Vite/extension environment
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version || '4.0.379'}/pdf.worker.min.mjs`;
} catch (e) {
  console.warn('PDF.js worker setup fallback:', e);
}

export interface RenderPageResult {
  width: number;
  height: number;
  originalWidth: number;
  originalHeight: number;
  scale: number;
}

export async function loadPdfJsDocument(source: File | ArrayBuffer | Uint8Array) {
  let data: ArrayBuffer;
  if (source instanceof File) {
    data = await source.arrayBuffer();
  } else if (source instanceof Uint8Array) {
    data = source.buffer.slice(source.byteOffset, source.byteOffset + source.byteLength) as ArrayBuffer;
  } else {
    data = source;
  }

  const loadingTask = pdfjsLib.getDocument({
    data,
    cMapUrl: `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version || '4.0.379'}/cmaps/`,
    cMapPacked: true,
  });

  return await loadingTask.promise;
}

/**
 * Renders a PDF page to an HTMLCanvasElement with high DPI support
 */
export async function renderPageToCanvas(
  pdfDoc: any,
  pageNumber: number,
  canvas: HTMLCanvasElement,
  scale: number = 1.5,
  rotationOffset: number = 0
): Promise<RenderPageResult> {
  const page = await pdfDoc.getPage(pageNumber);
  const viewport = page.getViewport({ scale, rotation: (page.rotate + rotationOffset) % 360 });

  const unscaledViewport = page.getViewport({ scale: 1.0, rotation: 0 });

  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) throw new Error('Could not get canvas context');

  // Handle device pixel ratio for crystal clear rendering
  const outputScale = window.devicePixelRatio || 1;
  canvas.width = Math.floor(viewport.width * outputScale);
  canvas.height = Math.floor(viewport.height * outputScale);
  if (!canvas.style.width || canvas.style.width.endsWith('px')) {
    canvas.style.width = `${Math.floor(viewport.width)}px`;
    canvas.style.height = `${Math.floor(viewport.height)}px`;
  }

  const transform = outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : undefined;

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Cancel any ongoing render task on this canvas
  if ((canvas as any)._currentRenderTask) {
    try {
      (canvas as any)._currentRenderTask.cancel();
    } catch (e) {
      // ignore
    }
    (canvas as any)._currentRenderTask = null;
  }

  const renderContext = {
    canvasContext: ctx,
    transform,
    viewport,
  };

  const renderTask = page.render(renderContext);
  (canvas as any)._currentRenderTask = renderTask;

  try {
    await renderTask.promise;
  } catch (err: any) {
    if (err?.name === 'RenderingCancelledException' || err?.message?.includes('cancelled')) {
      // Gracefully handle cancelled render
      return {
        width: viewport.width,
        height: viewport.height,
        originalWidth: unscaledViewport.width,
        originalHeight: unscaledViewport.height,
        scale,
      };
    }
    throw err;
  } finally {
    if ((canvas as any)._currentRenderTask === renderTask) {
      (canvas as any)._currentRenderTask = null;
    }
  }

  return {
    width: viewport.width,
    height: viewport.height,
    originalWidth: unscaledViewport.width,
    originalHeight: unscaledViewport.height,
    scale,
  };
}

/**
 * Generates lightweight thumbnails for all pages of a PDF
 */
export async function generateThumbnails(
  pdfDoc: any,
  maxDimension: number = 160,
  pageRotations: Record<number, number> = {}
): Promise<PageThumbnail[]> {
  const thumbnails: PageThumbnail[] = [];
  const numPages = pdfDoc.numPages;

  for (let i = 1; i <= numPages; i++) {
    const page = await pdfDoc.getPage(i);
    const rotation = pageRotations[i - 1] ?? 0;
    const initialViewport = page.getViewport({ scale: 1.0, rotation: (page.rotate + rotation) % 360 });

    const scale = maxDimension / Math.max(initialViewport.width, initialViewport.height);
    const viewport = page.getViewport({ scale, rotation: (page.rotate + rotation) % 360 });

    const canvas = document.createElement('canvas');
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);
    const ctx = canvas.getContext('2d');

    if (ctx) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      await page.render({ canvasContext: ctx, viewport }).promise;
      thumbnails.push({
        pageIndex: i - 1,
        thumbnailUrl: canvas.toDataURL('image/jpeg', 0.8),
        width: viewport.width,
        height: viewport.height,
        rotation: (page.rotate + rotation) % 360,
      });
    }
  }

  return thumbnails;
}

/**
 * Extracts text items with their spatial positions and font characteristics for a specific page
 */
export async function extractPageTextItems(pdfDoc: any, pageNumber: number): Promise<DetectedFontInfo[]> {
  try {
    const page = await pdfDoc.getPage(pageNumber);
    const viewport = page.getViewport({ scale: 1.0, rotation: 0 });
    const textContent = await page.getTextContent();
    const styles = textContent.styles || {};

    const items: DetectedFontInfo[] = [];

    for (const item of textContent.items) {
      if ('str' in item && item.str.trim().length > 0) {
        const fontInfo = extractFontInfoFromTextItem(item, styles, viewport.height);
        items.push(fontInfo);
      }
    }

    return groupTextItemsIntoLines(items);
  } catch (error) {
    console.error('Error extracting text items:', error);
    return [];
  }
}

/**
 * Extracts all selectable text from the PDF as plain text with page headers
 */
export async function extractAllTextFromPdf(pdfDoc: any): Promise<{ pageNumber: number; text: string }[]> {
  const result: { pageNumber: number; text: string }[] = [];
  const numPages = pdfDoc.numPages;

  for (let i = 1; i <= numPages; i++) {
    const page = await pdfDoc.getPage(i);
    const textContent = await page.getTextContent();
    let lastY: number | null = null;
    let pageText = '';

    for (const item of textContent.items) {
      if ('str' in item) {
        const currentY = item.transform[5];
        if (lastY !== null && Math.abs(currentY - lastY) > 5) {
          pageText += '\n';
        } else if (pageText.length > 0 && !pageText.endsWith(' ') && !pageText.endsWith('\n')) {
          pageText += ' ';
        }
        pageText += item.str;
        lastY = currentY;
      }
    }

    result.push({
      pageNumber: i,
      text: pageText.trim(),
    });
  }

  return result;
}
