// Captures real screenshots and an animated GIF of the extension running in Chrome.
// Usage: npm run capture   (writes into docs/)
import fs from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';
import gifenc from 'gifenc';
import { launch, sleep, ROOT } from './harness.mjs';

const { GIFEncoder, quantize, applyPalette } = gifenc;
const OUT = path.join(ROOT, 'docs');
const THEMES = [
  ['farm', 'const herd = await barn.open();'],
  ['beach', 'vacation.mode = "sideways";'],
  ['halloween', 'if (pumpkin.lit) boo();'],
  ['christmas', 'sleigh.deliver(gifts, 24);'],
  ['sea', 'ocean.swim({ octopus: 8 });'],
];

fs.mkdirSync(OUT, { recursive: true });

async function clearEditors(page) {
  await page.$eval('#code', (el) => {
    el.value = '';
  });
}

async function screenshots(h) {
  const page = await h.browser.newPage();
  await page.goto(h.url);
  for (const [theme, text] of THEMES) {
    await h.setSettings({ powerMode: true, sound: true, theme });
    await clearEditors(page);
    await sleep(2600);
    await page.click('#code');
    await page.keyboard.type(text, { delay: 45 });
    await sleep(40);
    await page.screenshot({ path: path.join(OUT, `theme-${theme}.png`), clip: { x: 0, y: 0, width: 960, height: 300 } });
    console.log('captured', theme);
  }
  await page.close();
}

async function popup(h) {
  await h.setSettings({ powerMode: true, sound: true, theme: 'farm' });
  const page = await h.browser.newPage();
  await page.setViewport({ width: 340, height: 600 });
  await page.goto(h.popupUrl);
  await sleep(800);
  const height = await page.evaluate(() => Math.ceil(document.body.getBoundingClientRect().bottom));
  await page.screenshot({ path: path.join(OUT, 'popup.png'), clip: { x: 0, y: 0, width: 340, height } });
  await page.close();
  console.log('captured popup');
}

async function gif(h) {
  const page = await h.browser.newPage();
  await page.setViewport({ width: 720, height: 260 });
  await page.goto(h.url);
  const clip = { x: 0, y: 0, width: 720, height: 220 };
  const frames = [];
  const grab = async () => frames.push(PNG.sync.read(Buffer.from(await page.screenshot({ clip }))));

  for (const [theme, text] of THEMES) {
    await h.setSettings({ powerMode: true, sound: true, theme });
    await clearEditors(page);
    await sleep(1700);
    await grab();
    await page.click('#code');
    for (let i = 0; i < text.length; i += 2) {
      await page.keyboard.type(text.slice(i, i + 2), { delay: 20 });
      await grab();
    }
    for (let i = 0; i < 3; i++) {
      await sleep(90);
      await grab();
    }
  }
  await page.close();

  const encoder = GIFEncoder();
  for (const { data, width, height } of frames) {
    const palette = quantize(data, 128);
    encoder.writeFrame(applyPalette(data, palette), width, height, { palette, delay: 110 });
  }
  encoder.finish();
  fs.writeFileSync(path.join(OUT, 'demo.gif'), encoder.bytes());
  console.log(`captured demo.gif (${frames.length} frames)`);
}

const h = await launch();
try {
  await screenshots(h);
  await popup(h);
  await gif(h);
} finally {
  await h.close();
}
