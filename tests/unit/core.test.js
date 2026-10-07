const test = require('node:test');
const assert = require('node:assert/strict');
const Core = require('../../extension/src/core.js');

const key = (k, extra = {}) => ({ isTrusted: true, key: k, editorId: 1, time: 0, ...extra });
const input = (inputType, extra = {}) => ({ isTrusted: true, inputType, isComposing: false, editorId: 1, time: 5, ...extra });

test('resolveEditor accepts ordinary text fields and rejects passwords and other inputs', () => {
  for (const type of ['text', 'search', 'email', 'url', 'tel']) {
    const el = { nodeType: 1, tagName: 'INPUT', type };
    assert.equal(Core.resolveEditor(el), el, type);
  }
  for (const type of ['password', 'number', 'checkbox', 'date', 'hidden']) {
    assert.equal(Core.resolveEditor({ nodeType: 1, tagName: 'INPUT', type }), null, type);
  }
  assert.equal(Core.resolveEditor({ nodeType: 1, tagName: 'INPUT', type: 'text', autocomplete: 'current-password' }), null);
  assert.equal(Core.resolveEditor({ nodeType: 1, tagName: 'INPUT', type: 'text', readOnly: true }), null);
  assert.equal(Core.resolveEditor({ nodeType: 1, tagName: 'TEXTAREA', disabled: true }), null);
  const area = { nodeType: 1, tagName: 'TEXTAREA' };
  assert.equal(Core.resolveEditor(area), area);
  assert.equal(Core.resolveEditor({ nodeType: 1, tagName: 'DIV', isContentEditable: false }), null);
  assert.equal(Core.resolveEditor(null), null);
});

test('resolveEditor maps nested contenteditable nodes to their editing host', () => {
  const host = { nodeType: 1, tagName: 'DIV', isContentEditable: true, parentElement: { isContentEditable: false } };
  const child = { nodeType: 1, tagName: 'B', isContentEditable: true, parentElement: host };
  assert.equal(Core.resolveEditor(child), host);
});

test('resolveEditor rejects text inputs masked with -webkit-text-security', () => {
  const el = { nodeType: 1, tagName: 'INPUT', type: 'text', ownerDocument: { defaultView: { getComputedStyle: () => ({ webkitTextSecurity: 'disc' }) } } };
  assert.equal(Core.resolveEditor(el), null);
});

test('a trusted edit key followed by a matching input event is one hit', () => {
  const t = Core.createEditTracker();
  t.keydown(key('a'));
  assert.equal(t.input(input('insertText')), true);
  assert.equal(t.input(input('insertText')), false, 'one keydown confirms at most one edit');
  t.keydown(key('Backspace'));
  assert.equal(t.input(input('deleteContentBackward')), true);
  t.keydown(key('Enter'));
  assert.equal(t.input(input('insertLineBreak')), true);
});

test('shortcuts, paste, drops, undo and untrusted or programmatic changes are not counted', () => {
  const t = Core.createEditTracker();
  t.keydown(key('v', { ctrlKey: true }));
  assert.equal(t.input(input('insertFromPaste')), false);
  t.keydown(key('z', { metaKey: true }));
  assert.equal(t.input(input('historyUndo')), false);
  t.keydown(key('Backspace', { ctrlKey: true }));
  assert.equal(t.input(input('deleteWordBackward')), false);
  assert.equal(t.input(input('insertText')), false, 'no keydown: programmatic execCommand');
  t.keydown(key('a', { isTrusted: false }));
  assert.equal(t.input(input('insertText')), false, 'synthetic keydown');
  t.keydown(key('a'));
  assert.equal(t.input(input('insertText', { isTrusted: false })), false, 'synthetic input');
  t.keydown(key('a'));
  assert.equal(t.input(input('insertFromDrop')), false);
  t.keydown(key('ArrowLeft'));
  assert.equal(t.input(input('insertText')), false);
});

test('AltGr characters count, plain Alt shortcuts do not', () => {
  const t = Core.createEditTracker();
  t.keydown(key('@', { ctrlKey: true, altKey: true, altGraph: true }));
  assert.equal(t.input(input('insertText')), true);
  t.keydown(key('f', { altKey: true }));
  assert.equal(t.input(input('insertText')), false);
});

test('edits must land on the same editor and within the confirmation window', () => {
  const t = Core.createEditTracker({ windowMs: 1000 });
  t.keydown(key('a', { editorId: 1 }));
  assert.equal(t.input(input('insertText', { editorId: 2 })), false);
  t.keydown(key('a', { time: 0 }));
  assert.equal(t.input(input('insertText', { time: 2000 })), false);
  t.keydown(key('a', { editorId: null }));
  assert.equal(t.input(input('insertText')), false, 'keydown outside an editor');
});

test('IME composition counts once on commit and never double counts', () => {
  const t = Core.createEditTracker();
  t.keydown(key('Process'));
  t.compositionStart({ isTrusted: true });
  t.keydown(key('n', { isComposing: true }));
  assert.equal(t.input(input('insertCompositionText', { isComposing: true })), false);
  t.keydown(key('i', { isComposing: true }));
  assert.equal(t.input(input('insertCompositionText', { isComposing: true })), false);
  assert.equal(t.compositionEnd({ hasData: true, editorId: 1 }), true);
  assert.equal(t.input(input('insertCompositionText')), false, 'trailing composition input');
  assert.equal(t.input(input('insertText')), false, 'no pending keydown after commit');
  assert.equal(t.compositionEnd({ hasData: true, editorId: 1 }), false, 'duplicate end');
});

test('cancelled or synthetic compositions do not count', () => {
  const t = Core.createEditTracker();
  t.compositionStart({ isTrusted: true });
  t.input(input('insertCompositionText', { isComposing: true }));
  assert.equal(t.compositionEnd({ hasData: false, editorId: 1 }), false, 'cancelled');
  t.compositionStart({ isTrusted: false });
  assert.equal(t.compositionEnd({ hasData: true, editorId: 1 }), false, 'synthetic start/end');
  t.compositionStart({ isTrusted: true });
  t.input(input('insertCompositionText', { isComposing: true, isTrusted: false }));
  assert.equal(t.compositionEnd({ hasData: true, editorId: 1 }), false, 'only synthetic composition input');
});

test('combo shows sparks from three hits and celebrates every ten', () => {
  const c = Core.createCombo();
  const results = [];
  for (let i = 0; i < 20; i++) results.push(c.hit(1, i * 100));
  assert.deepEqual(results.slice(0, 3).map((r) => r.sparks), [false, false, true]);
  assert.deepEqual(
    results.filter((r) => r.celebrate).map((r) => r.count),
    [10, 20],
  );
});

test('combo resets after 1.5 s of inactivity', () => {
  const c = Core.createCombo();
  c.hit(1, 0);
  c.hit(1, 100);
  assert.equal(c.tick(1599), false);
  assert.equal(c.count, 2);
  assert.equal(c.tick(1600), true);
  assert.equal(c.count, 0);
  c.hit(1, 2000);
  assert.equal(c.hit(1, 3600).count, 1, 'a late hit starts a new combo even without tick');
});

test('combo resets when changing editors', () => {
  const c = Core.createCombo();
  c.hit(1, 0);
  c.hit(1, 10);
  assert.equal(c.changeEditor(1), false);
  assert.equal(c.count, 2);
  assert.equal(c.changeEditor(2), true);
  assert.equal(c.count, 0);
  c.hit(2, 20);
  assert.equal(c.hit(3, 30).count, 1, 'hit on another editor restarts');
});

test('pools never exceed their caps (150 particles, 24 ink blots)', () => {
  assert.equal(Core.LIMITS.maxParticles, 150);
  assert.equal(Core.LIMITS.maxBlots, 24);
  const p = Core.createPool(Core.LIMITS.maxParticles);
  for (let i = 0; i < 1000; i++) p.add({ i });
  assert.equal(p.size, 150);
  assert.equal(p.items[149].i, 999, 'oldest items are evicted first');
  p.update((it) => it.i % 2 === 0);
  assert.equal(p.size, 75);
});

test('frame limiter renders near 30 FPS on 60, 120 and 144 Hz displays', () => {
  for (const hz of [60, 120, 144]) {
    const lim = Core.createFrameLimiter(30);
    let renders = 0;
    for (let i = 0; i <= hz * 10; i++) if (lim.next((i * 1000) / hz) >= 0) renders++;
    const fps = renders / 10;
    assert.ok(fps >= 27 && fps <= 31, `${hz} Hz -> ${fps} fps`);
  }
});

test('frame limiter clamps long gaps so delta-time movement cannot jump', () => {
  const lim = Core.createFrameLimiter(30);
  lim.next(0);
  assert.equal(lim.next(5000), 0.1);
});

test('spawner respects the active cap and its gap timer', () => {
  const s = Core.createSpawner({ max: 2, minGap: 1, maxGap: 1, rng: () => 0 });
  assert.equal(s.tick(0.1, 0), true);
  assert.equal(s.tick(0.5, 1), false);
  assert.equal(s.tick(0.6, 1), true);
  assert.equal(s.tick(5, 2), false, 'full');
});

test('settings normalize to safe defaults', () => {
  assert.deepEqual(Core.normalizeSettings(undefined), { powerMode: true, sound: true, theme: 'farm' });
  assert.deepEqual(Core.normalizeSettings({ powerMode: 'yes', sound: false, theme: 'mars' }), { powerMode: true, sound: false, theme: 'farm' });
  for (const id of Core.THEME_IDS) assert.equal(Core.normalizeSettings({ theme: id }).theme, id);
});
