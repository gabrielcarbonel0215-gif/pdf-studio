import { PDFDocument, rgb } from 'pdf-lib';

export async function mergePdfs(files: File[]): Promise<Uint8Array> {
  const mergedPdf = await PDFDocument.create();
  for (const file of files) {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await PDFDocument.load(arrayBuffer);
    const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
    copiedPages.forEach((page) => mergedPdf.addPage(page));
  }
  return await mergedPdf.save();
}

export async function extractPages(file: File, pageNumbers: number[]): Promise<Uint8Array> {
  // pageNumbers should be 0-indexed
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await PDFDocument.load(arrayBuffer);
  const newPdf = await PDFDocument.create();
  const copiedPages = await newPdf.copyPages(pdf, pageNumbers);
  copiedPages.forEach((page) => newPdf.addPage(page));
  return await newPdf.save();
}

export async function getPdfPageData(file: File, pageIndex: number) {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await PDFDocument.load(arrayBuffer);
  const page = pdf.getPages()[pageIndex];
  const { width, height } = page.getSize();
  
  const newPdf = await PDFDocument.create();
  const [copiedPage] = await newPdf.copyPages(pdf, [pageIndex]);
  newPdf.addPage(copiedPage);
  const bytes = await newPdf.save();
  
  return { bytes, width, height };
}

export async function applyTextToPageBytes(
  bytes: Uint8Array, 
  text: string, 
  x: number, 
  y: number, 
  size: number,
  addWhiteBackground: boolean
): Promise<Uint8Array> {
  const pdf = await PDFDocument.load(bytes);
  const page = pdf.getPages()[0];
  
  if (addWhiteBackground && text.trim()) {
    const width = text.length * (size * 0.55);
    const height = size * 1.2;
    page.drawRectangle({
      x: x,
      y: y - size * 0.2, // Adjust Y slightly to cover descenders
      width: width,
      height: height,
      color: rgb(1, 1, 1),
    });
  }

  if (text.trim()) {
    page.drawText(text, {
      x,
      y,
      size,
      color: rgb(0, 0, 0),
    });
  }
  return await pdf.save();
}

export async function addTextToPdf(
  file: File, 
  text: string, 
  pageIndex: number, 
  x: number, 
  y: number, 
  size: number,
  addWhiteBackground: boolean = false
): Promise<Uint8Array> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await PDFDocument.load(arrayBuffer);
  const pages = pdf.getPages();
  if (pageIndex >= 0 && pageIndex < pages.length) {
    const page = pages[pageIndex];
    
    if (addWhiteBackground) {
      // Estimate width and height based on text length and size (very basic estimation)
      const width = text.length * (size * 0.5);
      const height = size * 1.2;
      page.drawRectangle({
        x: x,
        y: y - size * 0.2, // Adjust Y slightly to cover descenders
        width: width,
        height: height,
        color: rgb(1, 1, 1),
      });
    }

    page.drawText(text, {
      x,
      y,
      size,
      color: rgb(0, 0, 0),
    });
  }
  return await pdf.save();
}

export function downloadPdf(bytes: Uint8Array, filename: string) {
  const blob = new Blob([bytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function getPdfPageCount(file: File): Promise<number> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await PDFDocument.load(arrayBuffer);
  return pdf.getPageCount();
}
