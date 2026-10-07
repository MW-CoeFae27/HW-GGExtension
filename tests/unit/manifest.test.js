const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const EXT = path.join(__dirname, '..', '..', 'extension');
const manifest = JSON.parse(fs.readFileSync(path.join(EXT, 'manifest.json'), 'utf8'));

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => (d.isDirectory() ? walk(path.join(dir, d.name)) : [path.join(dir, d.name)]));
}

test('manifest is MV3, content-script only, with no background worker', () => {
  assert.equal(manifest.manifest_version, 3);
  assert.equal(manifest.background, undefined);
  assert.deepEqual(manifest.permissions, ['storage']);
  assert.equal(manifest.host_permissions, undefined);
  assert.equal(manifest.update_url, undefined);
  const [cs] = manifest.content_scripts;
  assert.deepEqual(cs.matches, ['http://*/*', 'https://*/*']);
  assert.equal(cs.all_frames, false);
});

test('every file referenced by the manifest and popup is bundled', () => {
  const refs = [
    ...manifest.content_scripts[0].js,
    manifest.action.default_popup,
    ...Object.values(manifest.icons),
    ...Object.values(manifest.action.default_icon),
  ];
  const popup = fs.readFileSync(path.join(EXT, manifest.action.default_popup), 'utf8');
  for (const [, src] of popup.matchAll(/(?:src|href)="([^"]+)"/g)) refs.push(path.join('popup', src));
  for (const ref of refs) assert.ok(fs.existsSync(path.join(EXT, ref)), ref);
});

test('extension code has no network, logging, remote or eval paths', () => {
  const banned = [/\bfetch\s*\(/, /XMLHttpRequest/, /WebSocket/, /sendBeacon/, /EventSource/, /\bconsole\./, /\beval\s*\(/, /new Function/, /https?:\/\/(?!www\.w3\.org)/, /localStorage/, /indexedDB/];
  for (const file of walk(EXT).filter((f) => /\.(js|html|css)$/.test(f))) {
    const src = fs.readFileSync(file, 'utf8');
    for (const re of banned) assert.ok(!re.test(src), `${path.relative(EXT, file)} matches ${re}`);
  }
});

test('typed values never reach storage: only settings and the audio-owner id are written', () => {
  for (const file of walk(EXT).filter((f) => f.endsWith('.js'))) {
    const src = fs.readFileSync(file, 'utf8');
    for (const [call] of src.matchAll(/storage\.local\.set\([^)]*\)/g)) {
      assert.match(call, /\[Core\.STORAGE_KEY\]: settings|\[OWNER_KEY\]: instanceId/, `${path.basename(file)}: ${call}`);
    }
  }
});

test('the overlay is click-through, isolated and never transforms the page', () => {
  const src = fs.readFileSync(path.join(EXT, 'src', 'content.js'), 'utf8');
  assert.match(src, /'pointer-events': 'none'/);
  assert.match(src, /attachShadow\(\{ mode: 'closed' \}\)/);
  assert.match(src, /passive: true/);
  assert.ok(!/preventDefault|stopPropagation|stopImmediatePropagation/.test(src));
  assert.ok(!/(document\.body|documentElement)\.style/.test(src), 'page elements are never styled');
  assert.equal((src.match(/requestAnimationFrame\(frame\)/g) || []).length, 2, 'single self-scheduling loop');
});
