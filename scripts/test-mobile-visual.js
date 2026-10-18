import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

async function createSamplePdf(outputPath) {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]);
  const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

  page.drawText('EXPEDIENTE: 11141-2023-0-1801-JR-PE-01', {
    x: 50,
    y: 780,
    size: 14,
    font: font,
    color: rgb(0, 0, 0),
  });

  page.drawText('ESPECIALISTA: DR. FELIBERTO CONDORI QUISPE', {
    x: 50,
    y: 750,
    size: 12,
    font: regularFont,
    color: rgb(0, 0, 0),
  });

  const pdfBytes = await pdfDoc.save();
  fs.writeFileSync(outputPath, pdfBytes);
}

async function run() {
  const samplePdfPath = path.resolve('sample_test.pdf');
  await createSamplePdf(samplePdfPath);

  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  // 1. Desktop Test
  const desktopPage = await browser.newPage();
  await desktopPage.setViewport({ width: 1440, height: 900 });
  await desktopPage.goto('https://pdf-studio-polaroid.surge.sh', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 1000));
  await desktopPage.screenshot({ path: 'live_desktop_hub.png' });
  console.log('Saved: live_desktop_hub.png');

  // 2. Mobile Test
  const mobilePage = await browser.newPage();
  await mobilePage.setViewport({
    width: 390,
    height: 844,
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 2,
  });

  await mobilePage.goto('https://pdf-studio-polaroid.surge.sh', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 1000));
  await mobilePage.screenshot({ path: 'live_mobile_hub.png' });
  console.log('Saved: live_mobile_hub.png');

  // Upload file on mobile to test editor
  const fileInput = await mobilePage.$('input[type="file"]');
  if (fileInput) {
    await fileInput.uploadFile(samplePdfPath);
    await mobilePage.waitForSelector('canvas', { timeout: 15000 });
    await new Promise(r => setTimeout(r, 2000));
    await mobilePage.screenshot({ path: 'live_mobile_editor_loaded.png' });
    console.log('Saved: live_mobile_editor_loaded.png');
  }

  await browser.close();
  console.log('=== VERIFICATION COMPLETED ===');
}

run().catch(console.error);
