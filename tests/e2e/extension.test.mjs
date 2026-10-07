// End-to-end checks against real Chrome with the unpacked extension loaded.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { PNG } from 'pngjs';
import { launch, findChrome, sleep } from '../../tools/harness.mjs';

const skip = findChrome() ? false : 'Chrome not found (set CHROME_PATH)';
const COUNTER = { x: 790, y: 62, width: 160, height: 66 };
let h;

before(async () => {
  if (!skip) h = await launch();
});
after(async () => {
  if (h) await h.close();
});

async function openPage(theme = 'off') {
  await h.setSettings({ powerMode: true, sound: false, theme });
  const page = await h.browser.newPage();
  await page.goto(h.url);
  await sleep(400);
  return page;
}

async function shot(page, clip) {
  return PNG.sync.read(Buffer.from(await page.screenshot({ clip })));
}

function diff(a, b) {
  let changed = 0;
  for (let i = 0; i < a.data.length; i += 4) {
    const d = Math.abs(a.data[i] - b.data[i]) + Math.abs(a.data[i + 1] - b.data[i + 1]) + Math.abs(a.data[i + 2] - b.data[i + 2]);
    if (d > 60) changed++;
  }
  return changed / (a.data.length / 4);
}

async function counterVisible(page, baseline) {
  await sleep(120);
  return diff(baseline, await shot(page, COUNTER)) > 0.05;
}

test('overlay is click-through and never blocks the page', { skip }, async () => {
  const page = await openPage('farm');
  const info = await page.evaluate(() => {
    const host = document.querySelector('pmc-overlay');
    const cs = getComputedStyle(host);
    const btn = document.getElementById('ping').getBoundingClientRect();
    const hit = document.elementFromPoint(btn.x + 5, btn.y + 5);
    return { pe: cs.pointerEvents, pos: cs.position, hitIsButton: hit.closest('#ping') !== null, btn: { x: btn.x + 5, y: btn.y + 5 } };
  });
  assert.equal(info.pe, 'none');
  assert.equal(info.pos, 'fixed');
  assert.ok(info.hitIsButton, 'button under the ambient band is still hit-testable');
  await page.mouse.click(info.btn.x, info.btn.y);
  assert.equal(await page.$eval('#pings', (el) => el.textContent), '1');
  await page.close();
});

test('ambient band is drawn only in the top 60 px and disappears when Off', { skip }, async () => {
  const page = await openPage('farm');
  await sleep(300);
  const navColor = [0x1e, 0x29, 0x3b];
  const band = await shot(page, { x: 0, y: 0, width: 960, height: 70 });
  const px = (img, x, y) => Array.from(img.data.slice((y * img.width + x) * 4, (y * img.width + x) * 4 + 3));
  assert.notDeepEqual(px(band, 4, 4), navColor, 'farm sky covers the top band');
  assert.deepEqual(px(band, 4, 65), [0xf8, 0xfa, 0xfc], 'below 60 px is untouched page background');
  await h.setSettings({ powerMode: true, sound: false, theme: 'off' });
  await sleep(300);
  const off = await shot(page, { x: 0, y: 0, width: 960, height: 70 });
  assert.deepEqual(px(off, 4, 4), navColor);
  await page.close();
});

test('counter appears at three keyboard hits and resets after 1.5 s idle', { skip }, async () => {
  const page = await openPage();
  const baseline = await shot(page, COUNTER);
  await page.click('#code');
  await page.keyboard.type('ab', { delay: 30 });
  assert.equal(await counterVisible(page, baseline), false, 'two hits: no counter yet');
  await page.keyboard.type('c');
  assert.equal(await counterVisible(page, baseline), true, 'three hits: counter');
  await sleep(1700);
  assert.equal(await counterVisible(page, baseline), false, 'reset after inactivity');
  await page.close();
});

test('passwords, programmatic and synthetic edits are ignored', { skip }, async () => {
  const page = await openPage();
  const baseline = await shot(page, COUNTER);
  await page.click('#secret');
  await page.keyboard.type('hunter2-secret', { delay: 20 });
  assert.equal(await counterVisible(page, baseline), false, 'password field');
  await page.evaluate(() => {
    const title = document.getElementById('title');
    title.focus();
    for (let i = 0; i < 5; i++) document.execCommand('insertText', false, 'x');
    for (let i = 0; i < 5; i++) {
      title.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', bubbles: true }));
      title.dispatchEvent(new InputEvent('input', { inputType: 'insertText', data: 'a', bubbles: true }));
    }
    document.getElementById('code').value = 'programmatic value';
  });
  assert.equal(await counterVisible(page, baseline), false, 'programmatic/synthetic');
  await page.click('#code');
  await page.keyboard.down('Control');
  await page.keyboard.press('a');
  await page.keyboard.press('c');
  await page.keyboard.press('v');
  await page.keyboard.up('Control');
  assert.equal(await counterVisible(page, baseline), false, 'shortcuts');
  await page.close();
});

test('changing editors resets the combo', { skip }, async () => {
  const page = await openPage();
  const baseline = await shot(page, COUNTER);
  await page.click('#code');
  await page.keyboard.type('ab');
  await page.click('#notes-box');
  await page.keyboard.type('c');
  assert.equal(await counterVisible(page, baseline), false);
  await page.keyboard.type('de');
  assert.equal(await counterVisible(page, baseline), true, 'contenteditable counts too');
  await page.close();
});

test('IME composition counts once per commit', { skip }, async () => {
  const page = await openPage();
  const baseline = await shot(page, COUNTER);
  const cdp = await page.createCDPSession();
  await page.click('#title');
  await page.keyboard.type('a');
  for (const text of ['k', 'ka', 'かな']) {
    await cdp.send('Input.imeSetComposition', { text, selectionStart: text.length, selectionEnd: text.length });
  }
  await cdp.send('Input.insertText', { text: 'かな' });
  assert.equal(await counterVisible(page, baseline), false, 'a + one composition = 2 hits');
  await page.keyboard.type('b');
  assert.equal(await counterVisible(page, baseline), true, 'third hit shows the counter');
  assert.equal(await page.$eval('#title', (el) => el.value), 'aかなb');
  await page.close();
});

test('celebration shakes only the overlay, never the page', { skip }, async () => {
  const page = await openPage('sea');
  await page.click('#code');
  await page.keyboard.type('celebrate!', { delay: 25 });
  const samples = [];
  for (let i = 0; i < 6; i++) {
    samples.push(
      await page.evaluate(() => [
        getComputedStyle(document.documentElement).transform,
        getComputedStyle(document.body).transform,
        document.documentElement.getAttribute('style'),
        document.body.getAttribute('style'),
        scrollX,
        scrollY,
      ]),
    );
    await sleep(40);
  }
  for (const s of samples) assert.deepEqual(s, ['none', 'none', null, null, 0, 0]);
  assert.equal(await page.$eval('#code', (el) => el.value), 'celebrate!');
  await page.close();
});

test('reduced motion keeps a static counter and no ambient animation', { skip }, async () => {
  const page = await openPage('farm');
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  await sleep(200);
  const band = await shot(page, { x: 0, y: 0, width: 8, height: 8 });
  assert.deepEqual(Array.from(band.data.slice(0, 3)), [0x1e, 0x29, 0x3b], 'no ambient band');
  const baseline = await shot(page, COUNTER);
  await page.click('#code');
  await page.keyboard.type('abc');
  assert.equal(await counterVisible(page, baseline), true);
  await page.close();
});

test('popup persists settings in chrome.storage.local', { skip }, async () => {
  await h.setSettings({ powerMode: true, sound: true, theme: 'farm' });
  const popup = await h.browser.newPage();
  await popup.goto(h.popupUrl);
  await sleep(200);
  assert.equal(await popup.$eval('#powerMode', (el) => el.checked), true);
  await popup.click('label:has(#sound)');
  await popup.click('label:has(input[value="halloween"])');
  await sleep(100);
  assert.deepEqual(await h.getSettings(), { powerMode: true, sound: false, theme: 'halloween' });
  await popup.reload();
  await sleep(200);
  assert.equal(await popup.$eval('#sound', (el) => el.checked), false);
  assert.equal(await popup.$eval('input[value="halloween"]', (el) => el.checked), true);
  await popup.close();
});
