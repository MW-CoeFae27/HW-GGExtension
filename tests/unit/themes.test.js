const test = require('node:test');
const assert = require('node:assert/strict');
const Core = require('../../extension/src/core.js');
const Themes = require('../../extension/src/themes.js');

const EXPECTED = {
  halloween: ['pumpkin'],
  christmas: ['santa'],
  beach: ['crab'],
  sea: ['fish', 'octopus'],
  farm: ['horse', 'dog', 'kitty'],
};

test('the five themes exist with the requested characters', () => {
  assert.deepEqual(Object.keys(Themes.THEMES).sort(), Object.keys(EXPECTED).sort());
  for (const [id, sprites] of Object.entries(EXPECTED)) {
    assert.deepEqual(Themes.THEMES[id].actors.map((a) => a.sprite), sprites, id);
  }
  assert.deepEqual(Themes.THEME_MENU.map((m) => m.id).sort(), [...Core.THEME_IDS].sort());
});

test('every sprite frame is rectangular and uses only palette colours', () => {
  for (const [id, sprite] of Object.entries(Themes.SPRITES)) {
    const w = sprite.frames[0][0].length;
    const h = sprite.frames[0].length;
    assert.ok(sprite.frames.length >= 2, `${id} is animated`);
    const palettes = sprite.variants ? sprite.variants.map((v) => ({ ...sprite.palette, ...v })) : [sprite.palette];
    for (const frame of sprite.frames) {
      assert.equal(frame.length, h, `${id} height`);
      for (const row of frame) {
        assert.equal(row.length, w, `${id} row "${row}"`);
        for (const ch of row) {
          if (ch === '.') continue;
          for (const pal of palettes) assert.ok(pal[ch], `${id} colour "${ch}"`);
        }
      }
    }
  }
});

test('actors always stay inside the top 60 px band', () => {
  for (const theme of Object.values(Themes.THEMES)) {
    const scene = Themes.createScene(theme.id, { width: 1280, rng: Core.seededRandom(9) });
    for (let i = 0; i < 30 * 90; i++) {
      scene.update(1 / 30);
      for (const b of scene.bounds()) {
        assert.ok(b.y >= 0 && b.y + b.h <= Themes.BAND, `${theme.id} actor y=${b.y} h=${b.h}`);
      }
    }
  }
});

test('scenes respawn forever without overcrowding', () => {
  for (const theme of Object.values(Themes.THEMES)) {
    const scene = Themes.createScene(theme.id, { width: 1280, rng: Core.seededRandom(3) });
    let max = 0;
    for (let i = 0; i < 30 * 180; i++) {
      scene.update(1 / 30);
      max = Math.max(max, scene.actorCount);
    }
    assert.ok(max <= theme.maxActors && theme.maxActors <= 5, `${theme.id} max ${max}`);
    assert.ok(scene.spawnedTotal > theme.maxActors, `${theme.id} respawned (${scene.spawnedTotal})`);
    assert.ok(scene.actorCount > 0 || theme.id === 'christmas', `${theme.id} still populated`);
  }
});

test('movement is delta-time based (same distance at 30 and 60 FPS)', () => {
  const positions = [15, 30, 60].map((fps) => {
    const scene = Themes.createScene('beach', { width: 100000, rng: Core.seededRandom(1), initialActors: 1 });
    for (let i = 0; i < fps * 2; i++) scene.update(1 / fps);
    return scene.bounds()[0].x;
  });
  assert.ok(Math.abs(positions[0] - positions[2]) < 0.001 && Math.abs(positions[1] - positions[2]) < 0.001);
});

test('each theme has a valid looping score', () => {
  for (const theme of Object.values(Themes.THEMES)) {
    const s = theme.song;
    assert.ok(s.bpm >= 60 && s.bpm <= 180, theme.id);
    assert.equal(s.lead.length, s.bass.length, theme.id);
    for (const n of [...s.lead, ...s.bass]) assert.ok(n === 0 || (Number.isInteger(n) && n >= 21 && n <= 108), `${theme.id} note ${n}`);
    for (const wave of [s.leadWave, s.bassWave]) assert.ok(['sine', 'square', 'triangle', 'sawtooth'].includes(wave));
  }
  const tunes = Object.values(Themes.THEMES).map((t) => t.song.lead.join());
  assert.equal(new Set(tunes).size, tunes.length, 'each theme has its own melody');
});

test('music position follows the wall clock so pages and tabs rejoin in step', () => {
  require('../../extension/src/audio.js');
  const { clockOffset } = globalThis.PMCAudio;
  const loop = 10.4;
  const t = 1_760_000_000_123;
  assert.equal(clockOffset(loop, t), clockOffset(loop, t), 'two pages at the same moment agree');
  assert.ok(Math.abs(clockOffset(loop, t + 2500) - ((clockOffset(loop, t) + 2.5) % loop)) < 1e-6, 'advances in real time');
  for (let i = 0; i < 100; i++) {
    const o = clockOffset(loop, t + i * 977);
    assert.ok(o >= 0 && o < loop);
  }
});

test('counter font glyphs are rectangular and cover the counter text', () => {
  for (const [ch, glyph] of Object.entries(Themes.FONT)) {
    assert.equal(glyph.length, 5, ch);
    for (const row of glyph) assert.equal(row.length, glyph[0].length, ch);
  }
  for (const ch of 'COMBOX0123456789') assert.ok(Themes.FONT[ch], ch);
  assert.equal(Themes.measureText('X12', 5), 3 * 4 * 5 - 5);
});
