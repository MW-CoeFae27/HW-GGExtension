/* Developer Power Mode Combo: DOM-free logic shared by the content script, popup and tests. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.PMCCore = api;
})(globalThis, function () {
  'use strict';

  const THEME_IDS = Object.freeze(['farm', 'beach', 'halloween', 'christmas', 'sea', 'off']);
  const DEFAULT_SETTINGS = Object.freeze({ powerMode: true, sound: true, pushPage: true, theme: 'farm' });
  const STORAGE_KEY = 'pmcSettings';

  const LIMITS = Object.freeze({
    bandHeight: 60,
    maxParticles: 150,
    maxBlots: 24,
    fps: 30,
    comboResetMs: 1500,
    sparkAt: 3,
    celebrateEvery: 10,
  });

  function normalizeSettings(raw) {
    const s = raw && typeof raw === 'object' ? raw : {};
    return {
      powerMode: typeof s.powerMode === 'boolean' ? s.powerMode : DEFAULT_SETTINGS.powerMode,
      sound: typeof s.sound === 'boolean' ? s.sound : DEFAULT_SETTINGS.sound,
      pushPage: typeof s.pushPage === 'boolean' ? s.pushPage : DEFAULT_SETTINGS.pushPage,
      theme: THEME_IDS.includes(s.theme) ? s.theme : DEFAULT_SETTINGS.theme,
    };
  }

  // ---- Editor classification -------------------------------------------------

  const TEXT_INPUT_TYPES = new Set(['text', 'search', 'email', 'url', 'tel']);

  function isMasked(el) {
    const view = el.ownerDocument && el.ownerDocument.defaultView;
    if (!view || typeof view.getComputedStyle !== 'function') return false;
    const security = view.getComputedStyle(el).webkitTextSecurity;
    return !!security && security !== 'none';
  }

  /** Returns the editor element that owns `el` (input, textarea or contenteditable host), or null. */
  function resolveEditor(el) {
    if (!el || el.nodeType !== 1) return null;
    const tag = String(el.tagName || '').toUpperCase();
    if (tag === 'INPUT') {
      const type = String(el.type || 'text').toLowerCase();
      if (!TEXT_INPUT_TYPES.has(type) || el.readOnly || el.disabled) return null;
      if (/password/i.test(String(el.autocomplete || '')) || isMasked(el)) return null;
      return el;
    }
    if (tag === 'TEXTAREA') {
      return el.readOnly || el.disabled || isMasked(el) ? null : el;
    }
    if (el.isContentEditable) {
      let host = el;
      while (host.parentElement && host.parentElement.isContentEditable) host = host.parentElement;
      return host;
    }
    return null;
  }

  // ---- Keyboard edit tracking --------------------------------------------------

  const COUNTED_INPUT_TYPES = new Set([
    'insertText',
    'insertLineBreak',
    'insertParagraph',
    'deleteContentBackward',
    'deleteContentForward',
  ]);
  const EDIT_KEYS = new Set(['Backspace', 'Delete', 'Enter']);

  function isEditKey(key) {
    return typeof key === 'string' && (EDIT_KEYS.has(key) || Array.from(key).length === 1);
  }

  function isShortcut(e) {
    // AltGr reports Ctrl+Alt on Windows but produces ordinary characters.
    if (e.altGraph) return !!e.metaKey;
    return !!(e.ctrlKey || e.metaKey || e.altKey);
  }

  /**
   * A hit is only confirmed when a trusted, non-shortcut edit key is followed by a
   * trusted `input` event of an allowed type on the same editor. IME compositions
   * count once, on a non-empty compositionend after trusted composition input.
   */
  function createEditTracker(options = {}) {
    const windowMs = options.windowMs ?? 1000;
    let pending = null;
    let composing = false;
    let composedTrusted = false;

    return {
      get composing() {
        return composing;
      },
      keydown(e) {
        pending = null;
        if (!e.isTrusted || e.isComposing || composing || e.key === 'Process') return;
        if (e.editorId == null || isShortcut(e) || !isEditKey(e.key)) return;
        pending = { editorId: e.editorId, time: e.time };
      },
      input(e) {
        if (composing || e.isComposing) {
          if (composing && e.isTrusted && e.inputType === 'insertCompositionText') composedTrusted = true;
          return false;
        }
        if (!e.isTrusted) return false;
        const p = pending;
        pending = null;
        if (!COUNTED_INPUT_TYPES.has(e.inputType)) return false;
        return !!p && p.editorId === e.editorId && e.time - p.time <= windowMs;
      },
      compositionStart(e) {
        pending = null;
        if (!e || !e.isTrusted) return;
        composing = true;
        composedTrusted = false;
      },
      // Chrome may report compositionend itself as untrusted, so trust comes from the composition's input events.
      compositionEnd(e) {
        const counted = composing && composedTrusted && !!e.hasData && e.editorId != null;
        composing = false;
        composedTrusted = false;
        pending = null;
        return counted;
      },
      reset() {
        pending = null;
        composing = false;
        composedTrusted = false;
      },
    };
  }

  // ---- Combo counter -------------------------------------------------------------

  function createCombo(options = {}) {
    const resetMs = options.resetMs ?? LIMITS.comboResetMs;
    const sparkAt = options.sparkAt ?? LIMITS.sparkAt;
    const every = options.celebrateEvery ?? LIMITS.celebrateEvery;
    let count = 0;
    let last = -Infinity;
    let editorId = null;

    return {
      get count() {
        return count;
      },
      get editorId() {
        return editorId;
      },
      hit(id, now) {
        if (id !== editorId || now - last >= resetMs) count = 0;
        editorId = id;
        count += 1;
        last = now;
        return { count, sparks: count >= sparkAt, celebrate: count % every === 0 };
      },
      changeEditor(id) {
        if (id === editorId) return false;
        editorId = id;
        const had = count > 0;
        count = 0;
        return had;
      },
      tick(now) {
        if (count > 0 && now - last >= resetMs) {
          count = 0;
          return true;
        }
        return false;
      },
      reset() {
        count = 0;
      },
    };
  }

  // ---- Capped pools, frame limiter, spawner -----------------------------------------

  function createPool(max) {
    const items = [];
    return {
      items,
      max,
      get size() {
        return items.length;
      },
      add(item) {
        if (items.length >= max) items.shift();
        items.push(item);
        return item;
      },
      /** Calls fn for each item; items for which fn returns false are removed. */
      update(fn) {
        let w = 0;
        for (let i = 0; i < items.length; i++) {
          if (fn(items[i]) !== false) items[w++] = items[i];
        }
        items.length = w;
      },
      clear() {
        items.length = 0;
      },
    };
  }

  /** Returns -1 to skip a frame, otherwise the clamped delta time in seconds. */
  function createFrameLimiter(fps = LIMITS.fps, maxDt = 0.1) {
    const interval = 1000 / fps;
    const slack = 2;
    let last = null;
    return {
      next(now) {
        if (last === null) {
          last = now;
          return 0;
        }
        const elapsed = now - last;
        if (elapsed < interval - slack) return -1;
        last = now;
        return Math.min(elapsed / 1000, maxDt);
      },
      reset() {
        last = null;
      },
    };
  }

  function createSpawner({ max, minGap, maxGap, rng = Math.random }) {
    let timer = 0;
    return {
      tick(dt, active) {
        timer -= dt;
        if (active >= max || timer > 0) return false;
        timer = minGap + rng() * (maxGap - minGap);
        return true;
      },
      reset(delay = 0) {
        timer = delay;
      },
    };
  }

  function seededRandom(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  return {
    THEME_IDS,
    DEFAULT_SETTINGS,
    STORAGE_KEY,
    LIMITS,
    normalizeSettings,
    resolveEditor,
    isEditKey,
    isShortcut,
    createEditTracker,
    createCombo,
    createPool,
    createFrameLimiter,
    createSpawner,
    seededRandom,
  };
});
