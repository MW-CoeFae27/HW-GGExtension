/* Developer Power Mode Combo: settings popup. */
(() => {
  'use strict';

  const Core = globalThis.PMCCore;
  const Themes = globalThis.PMCThemes;
  const PREVIEW_W = 160;
  const PREVIEW_H = Themes.BAND;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const powerMode = document.getElementById('powerMode');
  const sound = document.getElementById('sound');
  const grid = document.getElementById('themeGrid');
  let settings = Core.normalizeSettings(null);

  const makeCanvas = (w, h) => {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    return c;
  };

  const previews = Themes.THEME_MENU.map((meta, i) => {
    const label = document.createElement('label');
    label.className = 'theme';
    const input = document.createElement('input');
    input.type = 'radio';
    input.name = 'theme';
    input.value = meta.id;
    const canvas = makeCanvas(PREVIEW_W, PREVIEW_H);
    canvas.setAttribute('aria-hidden', 'true');
    const name = document.createElement('span');
    name.textContent = meta.name;
    label.append(input, canvas, name);
    grid.append(label);
    input.addEventListener('change', () => {
      if (input.checked) save({ theme: meta.id });
    });
    const scene =
      meta.id === 'off'
        ? null
        : Themes.createScene(meta.id, { width: PREVIEW_W, makeCanvas, rng: Core.seededRandom(31 + i), wrap: true });
    return { input, ctx: canvas.getContext('2d'), scene };
  });

  function drawPreviews(dt) {
    for (const p of previews) {
      p.ctx.imageSmoothingEnabled = false;
      if (p.scene) {
        p.scene.update(dt);
        p.scene.draw(p.ctx);
      } else {
        p.ctx.fillStyle = '#1e1b3a';
        p.ctx.fillRect(0, 0, PREVIEW_W, PREVIEW_H);
        const w = Themes.measureText('OFF', 6);
        Themes.drawText(p.ctx, 'OFF', (PREVIEW_W - w) / 2, 15, 6, '#64748b');
      }
    }
  }

  let last = 0;
  function loop(now) {
    if (now - last >= 66) {
      drawPreviews(last ? Math.min(0.1, (now - last) / 1000) : 0);
      last = now;
    }
    requestAnimationFrame(loop);
  }
  drawPreviews(0.5);
  if (!reducedMotion) requestAnimationFrame(loop);

  function render() {
    powerMode.checked = settings.powerMode;
    sound.checked = settings.sound;
    for (const p of previews) p.input.checked = p.input.value === settings.theme;
  }

  function save(patch) {
    settings = Core.normalizeSettings(Object.assign({}, settings, patch));
    render();
    chrome.storage.local.set({ [Core.STORAGE_KEY]: settings });
  }

  powerMode.addEventListener('change', () => save({ powerMode: powerMode.checked }));
  sound.addEventListener('change', () => save({ sound: sound.checked }));

  render();
  chrome.storage.local.get(Core.STORAGE_KEY).then((res) => {
    settings = Core.normalizeSettings(res[Core.STORAGE_KEY]);
    render();
  });
})();
