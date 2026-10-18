import { createWorker } from 'tesseract.js';

export interface OcrProgress {
  status: string;
  progress: number; // 0 to 1
}

export interface OcrResult {
  text: string;
  confidence: number;
  lines: { text: string; confidence: number }[];
}

/**
 * Performs client-side Optical Character Recognition on a Canvas or Image
 */
export async function performOcr(
  imageSource: HTMLCanvasElement | HTMLImageElement | Blob | string,
  lang: 'spa' | 'eng' | 'spa+eng' = 'spa+eng',
  onProgress?: (progress: OcrProgress) => void
): Promise<OcrResult> {
  const worker = await createWorker(lang, 1, {
    logger: (m) => {
      if (onProgress && m.status) {
        onProgress({
          status: m.status === 'recognizing text' ? 'Reconociendo texto...' : 'Cargando modelos OCR...',
          progress: m.progress || 0,
        });
      }
    },
  });

  try {
    const { data } = await worker.recognize(imageSource);
    await worker.terminate();

    const lines = ((data as any).lines || []).map((l: any) => ({
      text: l.text.trim(),
      confidence: l.confidence,
    }));

    return {
      text: data.text.trim(),
      confidence: data.confidence,
      lines,
    };
  } catch (err) {
    await worker.terminate();
    throw err;
  }
}
