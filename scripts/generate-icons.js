import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

async function generateIcons() {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: 'new',
    args: ['--no-sandbox'],
  });

  const page = await browser.newPage();

  const iconSvg = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { margin: 0; padding: 0; background: transparent; display: flex; align-items: center; justify-content: center; width: 512px; height: 512px; }
        .icon {
          width: 512px;
          height: 512px;
          background: linear-gradient(145deg, #1e293b, #0f172a);
          border-radius: 110px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          box-shadow: 0 20px 40px rgba(0,0,0,0.4);
          position: relative;
          overflow: hidden;
        }
        .tape {
          position: absolute;
          top: 20px;
          width: 140px;
          height: 36px;
          background: rgba(251, 191, 36, 0.85);
          border-radius: 4px;
        }
        .logo-box {
          width: 220px;
          height: 220px;
          background: #f8fafc;
          border-radius: 48px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 12px 24px rgba(0,0,0,0.25);
          margin-top: 20px;
        }
        .text {
          font-family: system-ui, -apple-system, sans-serif;
          font-weight: 900;
          font-size: 88px;
          color: #d97706;
          letter-spacing: -2px;
        }
        .title {
          font-family: system-ui, -apple-system, sans-serif;
          font-weight: 800;
          font-size: 40px;
          color: #f8fafc;
          margin-top: 24px;
          letter-spacing: -1px;
        }
      </style>
    </head>
    <body>
      <div class="icon">
        <div class="tape"></div>
        <div class="logo-box">
          <span class="text">PDF</span>
        </div>
        <span class="title">Studio Pro</span>
      </div>
    </body>
    </html>
  `;

  await page.setContent(iconSvg);
  await page.setViewport({ width: 512, height: 512 });

  const publicDir = path.resolve('public');
  if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });

  await page.screenshot({ path: path.join(publicDir, 'icon-512.png'), omitBackground: true });
  console.log('Saved: public/icon-512.png');

  await page.setViewport({ width: 192, height: 192 });
  await page.screenshot({ path: path.join(publicDir, 'icon-192.png'), omitBackground: true });
  console.log('Saved: public/icon-192.png');

  await browser.close();
}

generateIcons().catch(console.error);
