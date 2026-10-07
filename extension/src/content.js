/* Developer Power Mode Combo: content script. Never stores, logs or transmits typed text. */
(() => {
  'use strict';

  const Core = globalThis.PMCCore;
  const Themes = globalThis.PMCThemes;
  if (!Core || !Themes || globalThis.__pmcActive) return;
  globalThis.__pmcActive = true;

  const L = Core.LIMITS;
  const BAND = L.bandHeight;
  const SHAKE_TIME = 0.32;
  const NEON = ['#22d3ee', '#e879f9', '#a3e635', '#fde047', '#f472b6'];
  const MIRROR_PROPS = [
    'boxSizing', 'width', 'height', 'overflowX', 'overflowY',
    'borderTopWidth', 'borderRightWidth', 'borderBottomWidth', 'borderLeftWidth', 'borderStyle',
    'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
    'fontStyle', 'fontVariant', 'fontWeight', 'fontStretch', 'fontSize', 'lineHeight', 'fontFamily',
    'textAlign', 'textTransform', 'textIndent', 'letterSpacing', 'wordSpacing', 'tabSize', 'direction',
  ];

  let settings = Core.normalizeSettings(null);
  const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  let reducedMotion = motionQuery.matches;

  const tracker = Core.createEditTracker();
  const combo = Core.createCombo();
  const particles = Core.createPool(L.maxParticles);
  const blots = Core.createPool(L.maxBlots);
  const limiter = Core.createFrameLimiter(L.fps);
  const music = globalThis.PMCAudio ? globalThis.PMCAudio.createMusicPlayer() : null;

  const editorIds = new WeakMap();
  let nextEditorId = 1;
  let lastEditor = null;

  let host = null;
  let canvas = null;
  let ctx = null;
  let mirror = null;
  let viewW = 0;
  let viewH = 0;
  let scene = null;
  let rafId = 0;
  let fullDirty = false;
  let shakeLeft = 0;
  let counterPulse = 0;
  let counterAlpha = 0;
  let shownCount = 0;

  const makeCanvas = (w, h) => {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    return c;
  };

  function editorIdOf(el) {
    let id = editorIds.get(el);
    if (!id) {
      id = nextEditorId++;
      editorIds.set(el, id);
    }
    return id;
  }

  function targetOf(e) {
    const path = typeof e.composedPath === 'function' ? e.composedPath() : null;
    return (path && path[0]) || e.target;
  }

  // ---- Isolated, click-through overlay ----------------------------------------------------

  function ensureOverlay() {
    const parent = document.documentElement;
    if (!parent) return false;
    if (!host) {
      host = document.createElement('pmc-overlay');
      host.setAttribute('aria-hidden', 'true');
      const style = {
        all: 'initial', position: 'fixed', top: '0', left: '0', width: '100%', height: '100%',
        margin: '0', padding: '0', border: '0', 'pointer-events': 'none', 'z-index': '2147483647',
        contain: 'strict', display: 'block', background: 'transparent', transform: 'none', opacity: '1',
      };
      for (const [k, v] of Object.entries(style)) host.style.setProperty(k, v, 'important');
      const root = host.attachShadow({ mode: 'closed' });
      canvas = document.createElement('canvas');
      canvas.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none;image-rendering:pixelated;';
      mirror = document.createElement('div');
      mirror.style.cssText = 'position:absolute;left:-10000px;top:0;visibility:hidden;pointer-events:none;overflow:hidden;';
      root.append(canvas, mirror);
      ctx = canvas.getContext('2d');
    }
    if (!host.isConnected) parent.appendChild(host);
    resize();
    return true;
  }

  function resize() {
    if (!canvas) return;
    viewW = document.documentElement.clientWidth || window.innerWidth;
    viewH = window.innerHeight;
    if (canvas.width !== viewW || canvas.height !== viewH) {
      canvas.width = viewW;
      canvas.height = viewH;
    }
    if (scene) scene.resize(viewW);
    fullDirty = true;
  }

  // ---- Caret position (text is copied only transiently into a hidden mirror) -----------------

  function caretPoint(el) {
    const rect = el.getBoundingClientRect();
    const fallback = { x: Math.min(rect.right - 8, rect.left + 16), y: rect.top + Math.min(rect.height / 2, 14) };
    try {
      if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
        const pos = el.selectionEnd;
        if (typeof pos !== 'number') return fallback;
        const cs = getComputedStyle(el);
        const ms = mirror.style;
        for (const p of MIRROR_PROPS) ms[p] = cs[p];
        const single = el.tagName === 'INPUT';
        ms.whiteSpace = single ? 'pre' : 'pre-wrap';
        ms.overflowWrap = single ? 'normal' : 'break-word';
        mirror.textContent = el.value.slice(0, pos);
        const marker = document.createElement('span');
        marker.textContent = '\u200b';
        mirror.appendChild(marker);
        const x = rect.left + marker.offsetLeft - el.scrollLeft;
        const y = single ? rect.top + rect.height / 2 : rect.top + marker.offsetTop - el.scrollTop + marker.offsetHeight / 2;
        return { x: Math.max(rect.left, Math.min(rect.right, x)), y: Math.max(rect.top, Math.min(rect.bottom, y)) };
      }
      const sel = document.getSelection();
      if (sel && sel.rangeCount) {
        const range = sel.getRangeAt(0).cloneRange();
        range.collapse(false);
        const box = range.getClientRects()[0] || range.getBoundingClientRect();
        if (box && (box.width || box.height)) return { x: box.right, y: box.top + box.height / 2 };
      }
    } finally {
      if (mirror) mirror.textContent = '';
    }
    return fallback;
  }

  // ---- Effects --------------------------------------------------------------------------

  function spawnSparks(p, n) {
    for (let i = 0; i < n; i++) {
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.4;
      const speed = 50 + Math.random() * 130;
      const life = 0.45 + Math.random() * 0.45;
      particles.add({
        x: p.x, y: p.y,
        vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
        life, max: life,
        size: Math.random() < 0.4 ? 3 : 2,
        color: NEON[(Math.random() * NEON.length) | 0],
      });
    }
  }

  function spawnBlot(p) {
    const drops = [];
    const count = 4 + ((Math.random() * 3) | 0);
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const d = 8 + Math.random() * 14;
      drops.push({ dx: Math.cos(a) * d, dy: Math.sin(a) * d, r: 2 + ((Math.random() * 3) | 0) });
    }
    blots.add({ x: p.x, y: p.y, r: 5 + ((Math.random() * 4) | 0), drops, life: 1.8, max: 1.8, color: NEON[(Math.random() * NEON.length) | 0] });
  }

  function pixelDisc(cx, cy, r) {
    for (let y = -r; y <= r; y += 2) {
      for (let x = -r; x <= r; x += 2) {
        if (x * x + y * y <= r * r) ctx.fillRect(Math.round(cx + x), Math.round(cy + y), 2, 2);
      }
    }
  }

  function tierColor(count) {
    if (count >= 50) return '#f472b6';
    if (count >= 25) return '#fde047';
    if (count >= 10) return '#a3e635';
    return '#22d3ee';
  }

  function drawCounter(dt) {
    if (combo.count >= L.sparkAt) {
      shownCount = combo.count;
      counterAlpha = 1;
    } else if (counterAlpha > 0) {
      counterAlpha = reducedMotion ? 0 : Math.max(0, counterAlpha - dt * 2.5);
    }
    if (counterAlpha <= 0) return false;

    const scale = !reducedMotion && counterPulse > 0.5 ? 6 : 5;
    const num = 'X' + shownCount;
    const label = 'COMBO';
    const numW = Themes.measureText(num, scale);
    const labW = Themes.measureText(label, 2);
    const right = viewW - 18;
    const top = BAND + 10;
    const boxW = Math.max(numW, labW) + 16;

    ctx.globalAlpha = 0.6 * counterAlpha;
    ctx.fillStyle = '#0b0b1a';
    ctx.fillRect(right - boxW + 8, top - 6, boxW, 5 * scale + 30);
    ctx.globalAlpha = counterAlpha;
    Themes.drawText(ctx, label, right - labW, top, 2, '#f0abfc');
    Themes.drawText(ctx, num, right - numW + 2, top + 16, scale, '#3b0764');
    Themes.drawText(ctx, num, right - numW, top + 14, scale, tierColor(shownCount));
    ctx.globalAlpha = 1;
    return true;
  }

  function registerHit(el) {
    const now = performance.now();
    const id = editorIdOf(el);
    const result = combo.hit(id, now);
    lastEditor = el;
    if (!ensureOverlay()) return;
    counterPulse = 1;
    if (result.sparks && !reducedMotion) {
      const p = caretPoint(el);
      spawnSparks(p, result.celebrate ? 30 : 4 + Math.min(6, result.count >> 3));
      if (result.count % 5 === 0) spawnBlot(p);
      if (result.celebrate) shakeLeft = SHAKE_TIME;
    }
    ensureLoop();
  }

  // ---- Single animation loop ----------------------------------------------------------------

  function ambientNeedsLoop() {
    return !!scene && (!reducedMotion || (settings.sound && !!music));
  }

  function effectsActive() {
    return combo.count > 0 || particles.size > 0 || blots.size > 0 || shakeLeft > 0 || counterAlpha > 0;
  }

  function wantsLoop() {
    return !document.hidden && !!host && (ambientNeedsLoop() || effectsActive());
  }

  function ensureLoop() {
    if (rafId || !wantsLoop()) return;
    if (!host.isConnected) ensureOverlay();
    rafId = requestAnimationFrame(frame);
  }

  function frame(now) {
    rafId = 0;
    if (music) music.pump();
    const dt = limiter.next(now);
    if (dt >= 0) render(dt, now);
    if (wantsLoop()) {
      rafId = requestAnimationFrame(frame);
    } else {
      limiter.reset();
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
      fullDirty = false;
    }
  }

  function render(dt, now) {
    combo.tick(now);
    shakeLeft = Math.max(0, shakeLeft - dt);
    counterPulse = Math.max(0, counterPulse - dt * 4);

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (fullDirty) ctx.clearRect(0, 0, canvas.width, canvas.height);
    else ctx.clearRect(0, 0, viewW, BAND + 8);
    ctx.imageSmoothingEnabled = false;

    let ox = 0;
    let oy = 0;
    if (shakeLeft > 0) {
      const k = shakeLeft / SHAKE_TIME;
      ox = Math.round((Math.random() * 2 - 1) * 7 * k);
      oy = Math.round((Math.random() * 2 - 1) * 4 * k);
    }

    if (scene && !reducedMotion) {
      scene.update(dt);
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, viewW, BAND);
      ctx.clip();
      ctx.setTransform(1, 0, 0, 1, ox, oy);
      scene.draw(ctx);
      ctx.restore();
    }

    ctx.setTransform(1, 0, 0, 1, ox, oy);
    let drewEffects = false;

    if (blots.size) {
      drewEffects = true;
      blots.update((b) => {
        b.life -= dt;
        if (b.life <= 0) return false;
        ctx.globalAlpha = 0.4 * (b.life / b.max);
        ctx.fillStyle = b.color;
        pixelDisc(b.x, b.y, b.r);
        for (const d of b.drops) pixelDisc(b.x + d.dx, b.y + d.dy, d.r);
        return true;
      });
    }

    if (particles.size) {
      drewEffects = true;
      particles.update((p) => {
        p.life -= dt;
        if (p.life <= 0) return false;
        p.vy += 380 * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        const a = p.life / p.max;
        const x = Math.round(p.x);
        const y = Math.round(p.y);
        ctx.globalAlpha = a;
        ctx.fillStyle = p.color;
        ctx.fillRect(x, y, p.size, p.size);
        if (p.size > 2) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(x + 1, y + 1, 1, 1);
        }
        return true;
      });
    }

    ctx.globalAlpha = 1;
    if (drawCounter(dt)) drewEffects = true;
    fullDirty = drewEffects || ox !== 0 || oy !== 0;
  }

  // ---- Settings, audio, visibility --------------------------------------------------------------

  function updateMusic() {
    if (!music) return;
    if (scene && settings.sound && !document.hidden) music.play(Themes.THEMES[scene.id].song);
    else music.pause();
  }

  function applySettings(next) {
    settings = next;
    if (!settings.powerMode) {
      combo.reset();
      tracker.reset();
      particles.clear();
      blots.clear();
      shakeLeft = 0;
      counterAlpha = 0;
    }
    const sceneId = scene ? scene.id : 'off';
    if (settings.theme !== sceneId) {
      scene = null;
      if (settings.theme !== 'off' && ensureOverlay()) {
        scene = Themes.createScene(settings.theme, { width: viewW, makeCanvas });
      }
      fullDirty = true;
    }
    updateMusic();
    ensureLoop();
  }

  // ---- Input listeners (passive; never alter the page's events) ------------------------------------

  function onKeyDown(e) {
    if (!settings.powerMode) return;
    const el = Core.resolveEditor(targetOf(e));
    tracker.keydown({
      isTrusted: e.isTrusted,
      key: e.key,
      ctrlKey: e.ctrlKey,
      metaKey: e.metaKey,
      altKey: e.altKey,
      altGraph: typeof e.getModifierState === 'function' && e.getModifierState('AltGraph'),
      isComposing: e.isComposing,
      editorId: el ? editorIdOf(el) : null,
      time: e.timeStamp,
    });
  }

  function onInput(e) {
    if (!settings.powerMode) return;
    const el = Core.resolveEditor(targetOf(e));
    if (!el) return;
    const hit = tracker.input({
      isTrusted: e.isTrusted,
      inputType: e.inputType,
      isComposing: e.isComposing,
      editorId: editorIdOf(el),
      time: e.timeStamp,
    });
    if (hit) registerHit(el);
  }

  function onCompositionStart(e) {
    tracker.compositionStart({ isTrusted: e.isTrusted });
  }

  function onCompositionEnd(e) {
    if (!settings.powerMode) return;
    const el = Core.resolveEditor(targetOf(e));
    const hit = tracker.compositionEnd({
      hasData: typeof e.data === 'string' && e.data.length > 0,
      editorId: el ? editorIdOf(el) : null,
    });
    if (hit && el) registerHit(el);
  }

  function onFocusIn(e) {
    const el = Core.resolveEditor(targetOf(e));
    if (!el || el === lastEditor) return;
    lastEditor = el;
    tracker.reset();
    combo.changeEditor(editorIdOf(el));
    ensureLoop();
  }

  const listen = { capture: true, passive: true };
  document.addEventListener('keydown', onKeyDown, listen);
  document.addEventListener('input', onInput, listen);
  document.addEventListener('compositionstart', onCompositionStart, listen);
  document.addEventListener('compositionend', onCompositionEnd, listen);
  document.addEventListener('focusin', onFocusIn, listen);
  window.addEventListener('resize', () => host && resize(), { passive: true });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = 0;
      limiter.reset();
    } else {
      fullDirty = true;
      ensureLoop();
    }
    updateMusic();
  });

  motionQuery.addEventListener('change', (e) => {
    reducedMotion = e.matches;
    particles.clear();
    blots.clear();
    shakeLeft = 0;
    fullDirty = true;
    ensureLoop();
  });

  try {
    chrome.storage.local
      .get(Core.STORAGE_KEY)
      .then((res) => applySettings(Core.normalizeSettings(res[Core.STORAGE_KEY])))
      .catch(() => applySettings(Core.normalizeSettings(null)));
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === 'local' && changes[Core.STORAGE_KEY]) {
        applySettings(Core.normalizeSettings(changes[Core.STORAGE_KEY].newValue));
      }
    });
  } catch {
    applySettings(Core.normalizeSettings(null));
  }
})();
