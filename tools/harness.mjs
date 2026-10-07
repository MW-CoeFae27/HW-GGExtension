// Launches Chrome with the unpacked extension and serves the local demo page.
import http from 'node:http';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

export const ROOT = fileURLToPath(new URL('..', import.meta.url));
export const EXTENSION_DIR = fileURLToPath(new URL('../extension', import.meta.url));
const DEMO = fileURLToPath(new URL('./demo.html', import.meta.url));

const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
].filter(Boolean);

export function findChrome() {
  return CHROME_CANDIDATES.find((p) => fs.existsSync(p)) || null;
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function launch({ viewport = { width: 960, height: 400 } } = {}) {
  const executablePath = findChrome();
  if (!executablePath) throw new Error('Chrome not found. Set CHROME_PATH.');

  const server = http.createServer((req, res) => {
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    res.end(fs.readFileSync(DEMO));
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const url = `http://127.0.0.1:${server.address().port}/`;

  const browser = await puppeteer.launch({
    executablePath,
    headless: true,
    pipe: true,
    enableExtensions: true,
    defaultViewport: viewport,
    args: ['--mute-audio', '--force-device-scale-factor=1', '--hide-scrollbars'],
  });
  const extensionId = await browser.installExtension(EXTENSION_DIR);
  const popupUrl = `chrome-extension://${extensionId}/popup/popup.html`;

  const settingsPage = await browser.newPage();
  await settingsPage.goto(popupUrl);

  return {
    browser,
    url,
    popupUrl,
    async setSettings(settings) {
      await settingsPage.evaluate((s) => chrome.storage.local.set({ pmcSettings: s }), settings);
    },
    async getSettings() {
      return settingsPage.evaluate(() => chrome.storage.local.get('pmcSettings').then((r) => r.pmcSettings));
    },
    async getOwner() {
      return settingsPage.evaluate(() => chrome.storage.local.get('pmcAudioOwner').then((r) => r.pmcAudioOwner));
    },
    async close() {
      await browser.close();
      server.close();
    },
  };
}
