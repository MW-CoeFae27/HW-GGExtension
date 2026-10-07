/* Developer Power Mode Combo: original pixel art, ambient scenes and chiptune scores. */
(function (root, factory) {
  const isNode = typeof module === 'object' && module.exports;
  const api = factory(isNode ? require('./core.js') : root.PMCCore);
  if (isNode) module.exports = api;
  else root.PMCThemes = api;
})(globalThis, function (Core) {
  'use strict';

  const BAND = Core.LIMITS.bandHeight;
  const TAU = Math.PI * 2;

  // ---- Sprites: one char per pixel, '.' is transparent. Sprites face right. -------------

  function swapRows(base, replacements) {
    const out = base.slice();
    for (const [i, row] of Object.entries(replacements)) out[Number(i)] = row;
    return out;
  }

  function compose(width, height, layers) {
    const grid = Array.from({ length: height }, () => Array(width).fill('.'));
    for (const { rows, x = 0, y = 0 } of layers) {
      rows.forEach((row, ry) => {
        for (let rx = 0; rx < row.length; rx++) {
          if (row[rx] !== '.' && grid[y + ry] && x + rx < width) grid[y + ry][x + rx] = row[rx];
        }
      });
    }
    return grid.map((r) => r.join(''));
  }

  const PUMPKIN = [
    '.....gg.....',
    '......g.....',
    '..oOOOOOOo..',
    '.oOOOoOOOOo.',
    'oOOyOOOOyOOo',
    'oOyyyOOyyyOo',
    'oOOOOOOOOOOo',
    'oOyyyyyyyyOo',
    'oOOyOyyOyOOo',
    '.oOOOoOOOOo.',
    '..oooooooo..',
  ];

  const SLEIGH = [
    '........W.......',
    '.......RR.......',
    '......RRRR......',
    '.....WWWWWW.....',
    '.....SSSSkS.....',
    '.....WWWWWW.....',
    '....RRWWWWRRkk..',
    'PP.RRRRWWRRR....',
    'PPDyyyyyyyyyyyD.',
    'PPDRRRRRRRRRRRD.',
    '.DRRRRRRRRRRRRD.',
    '..DDDDDDDDDDDD..',
    '...y.......y...y',
    '.yyyyyyyyyyyyyy.',
  ];

  const REINDEER_A = [
    '..........t.t.',
    '..........tt.t',
    '...........tt.',
    '..........BBB.',
    '..........BkBB',
    '..........BBBr',
    '.BBBBBBBBBBB..',
    'BBLLLLLLLLBB..',
    '.BBBBBBBBBB...',
    '.BB.B....BB...',
    '.B..B....B.B..',
    '.h..h....h.h..',
  ];
  const REINDEER_B = swapRows(REINDEER_A, {
    9: '.BB......BBB..',
    10: 'B.B.......B.B.',
    11: 'h...........h.',
  });

  function santaFrame(rear, front) {
    return compose(50, 14, [
      { rows: ['n'.repeat(23)], x: 14, y: 6 },
      { rows: SLEIGH, x: 0, y: 0 },
      { rows: rear, x: 20, y: 0 },
      { rows: front, x: 36, y: 0 },
    ]);
  }

  const CRAB_A = [
    'RR..W...W..RR',
    'R.R.k...k.R.R',
    '.RR.R...R.RR.',
    '...RRRRRRR...',
    '..RRRRRRRRR..',
    '.rRRRRRRRRRr.',
    'r.r.r...r.r.r',
    '.r.r.....r.r.',
  ];
  const CRAB_B = swapRows(CRAB_A, {
    0: '.R..W...W..R.',
    1: 'RRR.k...k.RRR',
    6: '.r.r.r.r.r.r.',
    7: 'r.r.......r.r',
  });

  const FISH_A = [
    '....AAAA....',
    'B..AASAAAA..',
    'BBAAASAAWkA.',
    'BBBAASAAAAAA',
    'BBAAaSaaAAA.',
    'B..AaSaaAA..',
    '....AAAA....',
  ];
  const FISH_B = swapRows(FISH_A, {
    1: '.B.AASAAAA..',
    2: '.BAAASAAWkA.',
    4: '.BAAaSaaAAA.',
    5: '.B.AaSaaAA..',
  });

  const OCTOPUS_A = [
    '...PPPPP...',
    '..PPpPPPP..',
    '.PPPPPPpPP.',
    '.PPPPPPPPP.',
    '.PWkPPPWkP.',
    '.PPPPPPPPP.',
    '..PPPPPPP..',
    '.PP.PPP.PP.',
    'P..P.P.P..P',
    'P..P.P.P..P',
    '.P.P...P.P.',
    '..P.....P..',
  ];
  const OCTOPUS_B = swapRows(OCTOPUS_A, {
    7: 'PPP.PPP.PPP',
    8: 'P...P.P...P',
    9: '.P..P.P..P.',
    10: '..P.P.P.P..',
    11: '...........',
  });

  const HORSE_A = [
    '............MM..',
    '...........MHHH.',
    '..........MHHkH.',
    '..........HHHHHn',
    '.........HHHH...',
    'MHHHHHHHHHHH....',
    'M.HHHHHHHHHH....',
    'M.HHHHHHHHHH....',
    '..HH......HH....',
    '..H.H....H.H....',
    '..H..H...H..H...',
    '..k..k...k..k...',
  ];
  const HORSE_B = swapRows(HORSE_A, {
    9: '...HH....HH.....',
    10: '...H.H..H.H.....',
    11: '...k.k..k.k.....',
  });

  const DOG_A = [
    '.........EE..',
    '........DDDD.',
    'T.......DkDDn',
    '.T......DDDD.',
    '..DDDDDDDDD..',
    '..DDDWWWDDD..',
    '..DDDDDDDDD..',
    '..D.D...D.D..',
    '..k.k...k.k..',
  ];
  const DOG_B = swapRows(DOG_A, {
    2: '.T......DkDDn',
    3: 'T.......DDDD.',
    7: '...DD...DD...',
    8: '...kk...kk...',
  });

  const KITTY_A = [
    '........C.C',
    '........CCC',
    'T.......CgC',
    'T.......CCC',
    '.T.CCCCCCC.',
    '.TCCCCCCCC.',
    '..CCCCCCCC.',
    '..C.C..C.C.',
    '..C.C..C.C.',
  ];
  const KITTY_B = swapRows(KITTY_A, {
    2: '.T......CgC',
    3: 'T.......CCC',
    7: '...CC..CC..',
    8: '...C....C..',
  });

  const SPRITES = {
    pumpkin: {
      palette: { g: '#3f8f2f', o: '#c2410c', O: '#f97316', y: '#fde047', Y: '#fff7b0' },
      frames: [PUMPKIN, PUMPKIN.map((r) => r.replace(/y/g, 'Y'))],
    },
    santa: {
      palette: {
        W: '#ffffff', R: '#dc2626', S: '#fcd5b5', k: '#111827', D: '#7f1d1d', y: '#facc15',
        P: '#92400e', B: '#8b5a2b', L: '#c8a27a', t: '#e7cf9f', r: '#ff3b3b', h: '#3b2a1a', n: '#6b4423',
      },
      frames: [santaFrame(REINDEER_A, REINDEER_B), santaFrame(REINDEER_B, REINDEER_A)],
    },
    crab: {
      palette: { R: '#ef4444', r: '#b91c1c', W: '#ffffff', k: '#111827' },
      variants: [{}, { R: '#fb923c', r: '#c2410c' }],
      frames: [CRAB_A, CRAB_B],
    },
    fish: {
      palette: { W: '#ffffff', k: '#0f172a' },
      variants: [
        { A: '#f97316', a: '#fdba74', B: '#ea580c', S: '#ffffff' },
        { A: '#2563eb', a: '#60a5fa', B: '#facc15', S: '#1e3a8a' },
        { A: '#facc15', a: '#fef08a', B: '#f59e0b', S: '#fde047' },
      ],
      frames: [FISH_A, FISH_B],
    },
    octopus: {
      palette: { W: '#ffffff', k: '#111827' },
      variants: [
        { P: '#c026d3', p: '#f0abfc' },
        { P: '#f97316', p: '#fed7aa' },
      ],
      frames: [OCTOPUS_A, OCTOPUS_B],
    },
    horse: {
      palette: { k: '#1f1308', n: '#2b1a10' },
      variants: [
        { H: '#8b5a2b', M: '#3b2414' },
        { H: '#e7e5e4', M: '#a8a29e' },
        { H: '#4b3621', M: '#f5f5f4' },
      ],
      frames: [HORSE_A, HORSE_B],
    },
    dog: {
      palette: { k: '#1f2937', n: '#111111', W: '#fef3c7' },
      variants: [
        { D: '#d4a056', E: '#8a5a2b', T: '#d4a056' },
        { D: '#f5f5f4', E: '#57534e', T: '#f5f5f4' },
      ],
      frames: [DOG_A, DOG_B],
    },
    kitty: {
      palette: { g: '#22c55e' },
      variants: [
        { C: '#9ca3af', T: '#6b7280' },
        { C: '#f59e0b', T: '#d97706' },
        { C: '#374151', T: '#1f2937', g: '#facc15' },
      ],
      frames: [KITTY_A, KITTY_B],
    },
  };

  function renderSprite(spriteId, variant, frame, flip, makeCanvas) {
    const sprite = SPRITES[spriteId];
    const rows = sprite.frames[frame];
    const h = rows.length;
    const w = rows[0].length;
    const palette = Object.assign({}, sprite.palette, sprite.variants ? sprite.variants[variant] : null);
    const canvas = makeCanvas(w, h);
    const c = canvas.getContext('2d');
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const ch = rows[y][flip ? w - 1 - x : x];
        if (ch === '.') continue;
        c.fillStyle = palette[ch];
        c.fillRect(x, y, 1, 1);
      }
    }
    return canvas;
  }

  // ---- Pixel drawing helpers --------------------------------------------------------------

  function rect(c, x, y, w, h, color) {
    c.fillStyle = color;
    c.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  }

  function bands(c, w, colors, y0 = 0, y1 = BAND) {
    const h = (y1 - y0) / colors.length;
    colors.forEach((color, i) => rect(c, 0, y0 + i * h, w, Math.ceil(h), color));
  }

  function disc(c, cx, cy, r, color, cell = 2) {
    c.fillStyle = color;
    for (let y = -r; y <= r; y += cell) {
      for (let x = -r; x <= r; x += cell) {
        if (x * x + y * y <= r * r) c.fillRect(Math.round(cx + x), Math.round(cy + y), cell, cell);
      }
    }
  }

  function repeatX(w, spacing, offset, fn) {
    for (let x = offset; x < w + spacing; x += spacing) fn(x);
  }

  function hills(c, w, base, height, wobble, color) {
    for (let x = 0; x < w; x += 4) {
      const h = Math.round(height + wobble * Math.sin(x * 0.011) + (wobble / 2) * Math.sin(x * 0.037));
      rect(c, x, base - h, 4, h + (BAND - base), color);
    }
  }

  function cloud(c, x, y) {
    rect(c, x, y, 20, 4, '#ffffff');
    rect(c, x + 4, y - 3, 10, 3, '#ffffff');
    rect(c, x + 2, y + 4, 16, 2, '#e0f2fe');
  }

  function stars(c, w, rng, maxY, color) {
    for (let i = 0; i < w / 40; i++) rect(c, rng() * w, rng() * maxY, 1, 1, color);
  }

  function driftingClouds(w, rng) {
    return Array.from({ length: Math.max(2, Math.round(w / 320)) }, () => ({ x: rng() * w, y: 5 + rng() * 10 }));
  }

  function drawClouds(c, w, t, clouds) {
    for (const cl of clouds) cloud(c, ((cl.x + t * 5) % (w + 60)) - 30, cl.y);
  }

  // ---- Theme scenery ---------------------------------------------------------------------

  function pine(c, x, base, s, rng) {
    const lights = ['#ef4444', '#fde047', '#38bdf8', '#f472b6'];
    rect(c, x - 1, base - 4, 3, 4, '#5b3a1e');
    let y = base - 4;
    for (const [tw, th] of [[18, 7], [14, 6], [9, 6]]) {
      const W = Math.round(tw * s);
      const H = Math.round(th * s);
      for (let r = 0; r < H; r++) {
        const rw = Math.max(2, Math.round(2 + ((W - 2) * r) / Math.max(1, H - 1)));
        rect(c, x + 0.5 - rw / 2, y - H + r, rw, 1, r === 0 ? '#f8fafc' : '#166534');
      }
      rect(c, x - W / 4 + rng() * (W / 2), y - 2, 1, 1, lights[Math.floor(rng() * lights.length)]);
      y -= Math.round(H * 0.6);
    }
    rect(c, x, y - 3, 1, 3, '#fde047');
    rect(c, x - 1, y - 2, 3, 1, '#fde047');
  }

  function barn(c, x) {
    for (let r = 0; r < 9; r++) rect(c, x + 17 - (r * 2 + 2), 14 + r, (r * 2 + 2) * 2, 1, '#7f1d1d');
    rect(c, x, 22, 34, 20, '#b91c1c');
    rect(c, x + 14, 24, 6, 4, '#fde68a');
    rect(c, x + 10, 29, 14, 13, '#fef2f2');
    rect(c, x + 11, 30, 12, 12, '#991b1b');
    for (let i = 0; i < 12; i++) {
      rect(c, x + 11 + i, 30 + i, 1, 1, '#fef2f2');
      rect(c, x + 22 - i, 30 + i, 1, 1, '#fef2f2');
    }
  }

  function umbrella(c, x) {
    rect(c, x, 28, 2, 28, '#78350f');
    for (let r = 0; r < 8; r++) {
      const width = 6 + r * 4;
      for (let col = 0; col < width; col++) {
        const color = Math.floor(col / 4) % 2 ? '#ef4444' : '#ffffff';
        rect(c, x + 1 - width / 2 + col, 20 + r, 1, 1, color);
      }
    }
  }

  function palm(c, x) {
    for (let i = 0; i < 10; i++) rect(c, x + Math.round(i * 0.7), 54 - i * 3, 4, 3, i % 2 ? '#a16207' : '#854d0e');
    const tx = x + 8;
    const ty = 24;
    for (const [dx, dy] of [[-12, 4], [-8, 2], [8, 2], [12, 4], [0, -3]]) {
      const steps = 6;
      for (let s = 0; s <= steps; s++) {
        rect(c, tx + (dx * s) / steps, ty + (dy * s) / steps + (s > 3 ? s - 3 : 0), 3, 2, '#16a34a');
      }
    }
    rect(c, tx - 1, ty + 2, 3, 3, '#713f12');
    rect(c, tx + 2, ty + 3, 3, 3, '#713f12');
  }

  const THEMES = {
    halloween: {
      id: 'halloween',
      name: 'Halloween',
      maxActors: 5,
      initialActors: 2,
      gap: [1.6, 3.4],
      actors: [{ sprite: 'pumpkin', weight: 1, scale: [2, 3], speed: [28, 48], groundY: 58, motion: { type: 'hop', amp: 10, freq: 0.8 }, fps: 3 }],
      drawStatic(c, w, rng) {
        bands(c, w, ['#140a2b', '#1d0f3d', '#28154f', '#351b60']);
        stars(c, w, rng, 36, '#e9d5ff');
        const mx = Math.round(w * 0.78);
        disc(c, mx, 16, 12, 'rgba(254,243,199,0.18)');
        disc(c, mx, 16, 9, '#fde68a');
        disc(c, mx - 3, 13, 2, '#eab308');
        disc(c, mx + 3, 19, 2, '#eab308');
        hills(c, w, 52, 6, 3, '#0b0616');
        repeatX(w, 230, 70, (x) => {
          rect(c, x, 43, 10, 13, '#4c4a63');
          rect(c, x + 1, 41, 8, 2, '#4c4a63');
          rect(c, x + 2, 40, 6, 1, '#4c4a63');
          rect(c, x + 4, 44, 2, 7, '#2f2d40');
          rect(c, x + 2, 46, 6, 2, '#2f2d40');
        });
        repeatX(w, 470, 180, (x) => {
          rect(c, x, 24, 3, 32, '#0b0616');
          rect(c, x - 8, 32, 9, 2, '#0b0616');
          rect(c, x - 9, 28, 2, 5, '#0b0616');
          rect(c, x + 3, 29, 8, 2, '#0b0616');
          rect(c, x + 10, 25, 2, 5, '#0b0616');
          rect(c, x + 1, 20, 2, 5, '#0b0616');
        });
      },
      initDynamic(w, rng) {
        return { twinkles: Array.from({ length: 10 }, () => ({ x: rng() * w, y: 2 + rng() * 30, p: rng() * TAU })) };
      },
      drawDynamic(c, w, t, dyn) {
        for (const s of dyn.twinkles) {
          c.globalAlpha = 0.3 + 0.7 * Math.abs(Math.sin(t * 1.7 + s.p));
          rect(c, s.x - 1, s.y, 3, 1, '#f5d0fe');
          rect(c, s.x, s.y - 1, 1, 3, '#f5d0fe');
        }
        c.globalAlpha = 0.16;
        for (let x = ((t * 9) % 120) - 120; x < w; x += 120) rect(c, x, 47, 70, 3, '#c4b5fd');
        c.globalAlpha = 1;
      },
      song: {
        bpm: 92, leadWave: 'triangle', bassWave: 'square', leadGain: 0.55, bassGain: 0.18, perc: null,
        lead: [69, 0, 72, 0, 76, 0, 75, 0, 74, 0, 72, 0, 71, 0, 0, 0, 69, 0, 72, 0, 76, 0, 77, 0, 76, 0, 75, 0, 72, 0, 0, 0],
        bass: [45, 0, 0, 0, 45, 0, 0, 0, 44, 0, 0, 0, 44, 0, 0, 0, 43, 0, 0, 0, 43, 0, 0, 0, 40, 0, 0, 0, 40, 0, 0, 0],
      },
    },

    christmas: {
      id: 'christmas',
      name: 'Christmas',
      maxActors: 2,
      initialActors: 1,
      gap: [3, 6],
      actors: [{ sprite: 'santa', weight: 1, scale: [2], speed: [60, 80], yRange: [4, 10], motion: { type: 'bob', amp: 3, freq: 0.7 }, fps: 6 }],
      drawStatic(c, w, rng) {
        bands(c, w, ['#0a1430', '#0f1f47', '#162c5e', '#1f3b75']);
        stars(c, w, rng, 30, '#dbeafe');
        hills(c, w, 50, 6, 3, '#b9cbe8');
        rect(c, 0, 53, w, 7, '#eef4ff');
        repeatX(w, 560, 300, (x) => {
          rect(c, x, 38, 26, 15, '#7c2d12');
          for (let r = 0; r < 7; r++) rect(c, x - 3 + r * 2, 37 - r, 32 - r * 4, 1, '#f8fafc');
          rect(c, x + 19, 27, 4, 6, '#57534e');
          rect(c, x + 4, 42, 6, 6, '#fde047');
          rect(c, x + 16, 44, 6, 9, '#451a03');
        });
        repeatX(w, 150, 40, (x) => pine(c, x, 54, rng() < 0.5 ? 1 : 1.35, rng));
      },
      initDynamic(w, rng) {
        return {
          flakes: Array.from({ length: Math.min(60, Math.round(w / 30)) }, () => ({
            x: rng() * w, y: rng() * BAND, v: 6 + rng() * 10, p: rng() * TAU, s: rng() < 0.3 ? 2 : 1,
          })),
        };
      },
      drawDynamic(c, w, t, dyn) {
        c.fillStyle = '#ffffff';
        for (const f of dyn.flakes) {
          const y = (f.y + f.v * t) % BAND;
          const x = (((f.x + Math.sin(t * 0.9 + f.p) * 4) % w) + w) % w;
          c.fillRect(Math.round(x), Math.round(y), f.s, f.s);
        }
      },
      song: {
        bpm: 132, leadWave: 'square', bassWave: 'triangle', leadGain: 0.28, bassGain: 0.55, perc: 'bell', percEvery: 2,
        lead: [76, 76, 79, 0, 76, 74, 72, 0, 74, 74, 77, 0, 74, 72, 71, 0, 72, 76, 79, 81, 79, 77, 76, 74, 72, 0, 79, 0, 72, 0, 0, 0],
        bass: [48, 0, 55, 0, 48, 0, 55, 0, 43, 0, 50, 0, 43, 0, 50, 0, 45, 0, 52, 0, 41, 0, 48, 0, 43, 0, 50, 0, 48, 0, 0, 0],
      },
    },

    beach: {
      id: 'beach',
      name: 'Beach Vacation',
      maxActors: 5,
      initialActors: 2,
      gap: [1.4, 3],
      actors: [{ sprite: 'crab', weight: 1, scale: [2], speed: [22, 40], groundY: 58, motion: { type: 'hop', amp: 1, freq: 4 }, fps: 8 }],
      drawStatic(c, w, rng) {
        bands(c, w, ['#7dd3fc', '#9adcfd', '#b6e6fe'], 0, 28);
        const sx = Math.round(w * 0.9);
        disc(c, sx, 11, 11, 'rgba(253,224,71,0.25)');
        disc(c, sx, 11, 7, '#fde047');
        rect(c, 0, 28, w, 4, '#38bdf8');
        rect(c, 0, 32, w, 4, '#0ea5e9');
        rect(c, 0, 36, w, 3, '#0284c7');
        rect(c, 0, 39, w, 21, '#fcd9a0');
        for (let i = 0; i < w / 6; i++) rect(c, rng() * w, 41 + rng() * 18, 1, 1, '#e9b872');
        repeatX(w, 520, 140, (x) => umbrella(c, x));
        repeatX(w, 700, 430, (x) => palm(c, x));
        repeatX(w, 260, 210, (x) => {
          rect(c, x, 50, 5, 1, '#f97316');
          rect(c, x + 2, 48, 1, 5, '#f97316');
        });
      },
      initDynamic(w, rng) {
        return {
          clouds: driftingClouds(w, rng),
          sparkles: Array.from({ length: 12 }, () => ({ x: rng() * w, y: 29 + rng() * 9, p: rng() * TAU })),
        };
      },
      drawDynamic(c, w, t, dyn) {
        drawClouds(c, w, t, dyn.clouds);
        for (const s of dyn.sparkles) {
          c.globalAlpha = Math.max(0, Math.sin(t * 2.2 + s.p));
          rect(c, s.x, s.y, 2, 1, '#f0f9ff');
        }
        c.globalAlpha = 0.85;
        const shift = (t * 14) % 26;
        for (let x = shift - 26; x < w; x += 26) rect(c, x, 38, 12, 2, '#f0f9ff');
        c.globalAlpha = 1;
      },
      song: {
        bpm: 112, leadWave: 'sine', bassWave: 'triangle', leadGain: 0.6, bassGain: 0.55, perc: 'shaker', percEvery: 1,
        lead: [72, 0, 77, 79, 0, 81, 0, 79, 77, 0, 74, 0, 72, 0, 0, 0, 74, 0, 77, 0, 79, 81, 0, 84, 81, 0, 79, 77, 0, 74, 77, 0],
        bass: [41, 0, 0, 48, 0, 0, 41, 0, 46, 0, 0, 53, 0, 0, 46, 0, 43, 0, 0, 50, 0, 0, 43, 0, 48, 0, 0, 55, 0, 0, 48, 0],
      },
    },

    sea: {
      id: 'sea',
      name: 'Sea Life',
      maxActors: 5,
      initialActors: 3,
      gap: [1.2, 2.8],
      actors: [
        { sprite: 'fish', weight: 3, scale: [2], speed: [30, 60], yRange: [6, 34], motion: { type: 'bob', amp: 3, freq: 0.6 }, fps: 5 },
        { sprite: 'octopus', weight: 1, scale: [2], speed: [12, 20], yRange: [10, 22], motion: { type: 'bob', amp: 6, freq: 0.3 }, fps: 2 },
      ],
      drawStatic(c, w, rng) {
        bands(c, w, ['#38bdf8', '#0ea5e9', '#0284c7', '#0369a1', '#075985']);
        c.fillStyle = 'rgba(255,255,255,0.08)';
        repeatX(w, 160, 20, (x) => {
          c.beginPath();
          c.moveTo(x, 0);
          c.lineTo(x + 18, 0);
          c.lineTo(x + 50, BAND);
          c.lineTo(x + 26, BAND);
          c.closePath();
          c.fill();
        });
        for (let x = 0; x < w; x += 4) {
          const h = 5 + Math.round(2 * Math.sin(x * 0.05));
          rect(c, x, BAND - h, 4, h, '#e7c98a');
        }
        for (let i = 0; i < w / 10; i++) rect(c, rng() * w, 55 + rng() * 5, 1, 1, '#c8a764');
        repeatX(w, 340, 120, (x) => {
          rect(c, x, 50, 14, 6, '#64748b');
          rect(c, x + 3, 47, 8, 3, '#94a3b8');
        });
        repeatX(w, 270, 230, (x) => {
          rect(c, x, 44, 2, 12, '#fb7185');
          rect(c, x - 4, 46, 4, 2, '#fb7185');
          rect(c, x - 4, 42, 2, 4, '#fb7185');
          rect(c, x + 2, 48, 4, 2, '#fb7185');
          rect(c, x + 4, 44, 2, 4, '#fb7185');
        });
      },
      initDynamic(w, rng) {
        const weeds = [];
        repeatX(w, 70, 30 + rng() * 20, (x) => weeds.push({ x, h: 6 + Math.floor(rng() * 5), p: rng() * TAU }));
        return {
          weeds,
          bubbles: Array.from({ length: 12 }, () => ({ x: rng() * w, y: rng() * 64, v: 8 + rng() * 10, p: rng() * TAU })),
        };
      },
      drawDynamic(c, w, t, dyn) {
        for (const wd of dyn.weeds) {
          for (let i = 0; i < wd.h; i++) {
            const sway = Math.round(Math.sin(t * 1.4 + wd.p + i * 0.5) * 2 * (i / wd.h));
            rect(c, wd.x + sway, BAND - 4 - i * 3, 3, 3, i % 2 ? '#16a34a' : '#22c55e');
          }
        }
        c.fillStyle = 'rgba(224,242,254,0.75)';
        for (const b of dyn.bubbles) {
          const y = BAND - ((b.y + b.v * t) % 64);
          const x = b.x + Math.sin(t * 2 + b.p) * 2;
          c.fillRect(Math.round(x), Math.round(y), 2, 2);
          c.fillRect(Math.round(x) + 2, Math.round(y) - 2, 1, 1);
        }
      },
      song: {
        bpm: 76, leadWave: 'sine', bassWave: 'sine', leadGain: 0.55, bassGain: 0.7, perc: null,
        lead: [62, 69, 74, 69, 65, 69, 72, 69, 62, 69, 74, 76, 77, 76, 74, 69, 60, 67, 72, 67, 64, 67, 71, 67, 62, 69, 74, 76, 74, 72, 69, 0],
        bass: [38, 0, 0, 0, 0, 0, 0, 0, 41, 0, 0, 0, 0, 0, 0, 0, 36, 0, 0, 0, 0, 0, 0, 0, 38, 0, 0, 0, 0, 0, 0, 0],
      },
    },

    farm: {
      id: 'farm',
      name: 'Animal Farm',
      maxActors: 5,
      initialActors: 3,
      gap: [1.4, 3],
      actors: [
        { sprite: 'horse', weight: 1, scale: [2], speed: [45, 65], groundY: 58, motion: { type: 'hop', amp: 2, freq: 3 }, fps: 8 },
        { sprite: 'dog', weight: 1, scale: [2], speed: [38, 58], groundY: 58, motion: { type: 'hop', amp: 2, freq: 4 }, fps: 9 },
        { sprite: 'kitty', weight: 1, scale: [2], speed: [22, 34], groundY: 58, motion: null, fps: 6 },
      ],
      drawStatic(c, w, rng) {
        bands(c, w, ['#7cc4fa', '#94d0fb', '#addcfc'], 0, 34);
        disc(c, Math.round(w * 0.93), 10, 6, '#fde047');
        hills(c, w, 36, 5, 4, '#86efac');
        rect(c, 0, 36, w, 8, '#4ade80');
        rect(c, 0, 44, w, 16, '#22c55e');
        for (let i = 0; i < w / 8; i++) rect(c, rng() * w, 45 + rng() * 14, 2, 2, '#15803d');
        repeatX(w, 640, 40, (x) => barn(c, x));
        repeatX(w, 22, 0, (x) => rect(c, x, 33, 3, 11, '#a16207'));
        rect(c, 0, 35, w, 2, '#ca8a04');
        rect(c, 0, 40, w, 2, '#ca8a04');
        repeatX(w, 640, 330, (x) => {
          rect(c, x, 38, 14, 7, '#facc15');
          rect(c, x + 2, 35, 10, 3, '#fde047');
          rect(c, x + 3, 40, 8, 1, '#ca8a04');
        });
      },
      initDynamic(w, rng) {
        return { clouds: driftingClouds(w, rng) };
      },
      drawDynamic(c, w, t, dyn) {
        drawClouds(c, w, t, dyn.clouds);
      },
      song: {
        bpm: 120, leadWave: 'square', bassWave: 'triangle', leadGain: 0.25, bassGain: 0.6, perc: 'tick', percEvery: 2,
        lead: [67, 71, 74, 71, 72, 0, 71, 69, 67, 0, 64, 0, 66, 0, 62, 0, 67, 71, 74, 79, 78, 76, 74, 72, 71, 69, 67, 66, 67, 0, 0, 0],
        bass: [43, 0, 50, 0, 48, 0, 50, 0, 43, 0, 50, 0, 38, 0, 45, 0, 43, 0, 50, 0, 48, 0, 52, 0, 50, 0, 45, 0, 43, 0, 50, 0],
      },
    },
  };

  const THEME_MENU = [
    { id: 'farm', name: 'Animal Farm' },
    { id: 'beach', name: 'Beach Vacation' },
    { id: 'halloween', name: 'Halloween' },
    { id: 'christmas', name: 'Christmas' },
    { id: 'sea', name: 'Sea Life' },
    { id: 'off', name: 'Off' },
  ];

  // ---- Scene: ambient actors that spawn, move with delta time, and respawn ---------------

  function pickWeighted(list, rng) {
    const total = list.reduce((sum, item) => sum + item.weight, 0);
    let roll = rng() * total;
    for (const item of list) {
      roll -= item.weight;
      if (roll < 0) return item;
    }
    return list[list.length - 1];
  }

  function lerp(a, b, k) {
    return a + (b - a) * k;
  }

  function motionOffset(a) {
    const m = a.kind.motion;
    if (!m) return 0;
    if (m.type === 'hop') return -Math.abs(Math.sin(a.phase)) * m.amp;
    return Math.sin(a.phase) * m.amp;
  }

  function createScene(themeId, options = {}) {
    const theme = THEMES[themeId];
    if (!theme) return null;
    const rng = options.rng || Math.random;
    const makeCanvas = options.makeCanvas;
    const spawner = Core.createSpawner({ max: theme.maxActors, minGap: theme.gap[0], maxGap: theme.gap[1], rng });
    const actors = [];
    const cache = new Map();
    let width = Math.max(1, Math.round(options.width || 1));
    let bg = null;
    let dyn = null;
    let t = 0;
    let spawned = 0;

    function rebuild() {
      bg = null;
      dyn = theme.initDynamic ? theme.initDynamic(width, Core.seededRandom(width)) : null;
    }

    function spawn(slot, slots) {
      if (actors.length >= theme.maxActors) return;
      const kind = pickWeighted(theme.actors, rng);
      const sprite = SPRITES[kind.sprite];
      const scale = kind.scale[Math.floor(rng() * kind.scale.length)];
      const sw = sprite.frames[0][0].length * scale;
      const sh = sprite.frames[0].length * scale;
      const dir = rng() < 0.5 ? 1 : -1;
      const x = slots ? ((slot + 0.2 + rng() * 0.6) / slots) * width - sw / 2 : dir > 0 ? -sw : width;
      const top = kind.groundY != null ? kind.groundY - sh : lerp(kind.yRange[0], kind.yRange[1], rng());
      actors.push({
        kind, scale, sw, sh, dir, x, top,
        speed: lerp(kind.speed[0], kind.speed[1], rng()),
        phase: rng() * TAU,
        frame: 0,
        ft: rng() / kind.fps,
        variant: sprite.variants ? Math.floor(rng() * sprite.variants.length) : 0,
      });
      spawned += 1;
    }

    function image(a) {
      const key = `${a.kind.sprite}|${a.variant}|${a.frame}|${a.dir < 0 ? 1 : 0}`;
      let canvas = cache.get(key);
      if (!canvas) {
        canvas = renderSprite(a.kind.sprite, a.variant, a.frame, a.dir < 0, makeCanvas);
        cache.set(key, canvas);
      }
      return canvas;
    }

    rebuild();
    const initial = Math.min(theme.maxActors, options.initialActors ?? theme.initialActors);
    for (let i = 0; i < initial; i++) spawn(i, initial);
    spawner.reset(theme.gap[0]);

    return {
      id: themeId,
      get actorCount() {
        return actors.length;
      },
      get spawnedTotal() {
        return spawned;
      },
      bounds() {
        return actors.map((a) => ({ x: a.x, y: a.top + motionOffset(a), w: a.sw, h: a.sh }));
      },
      resize(w) {
        const next = Math.max(1, Math.round(w));
        if (next !== width) {
          width = next;
          rebuild();
        }
      },
      update(dt) {
        t += dt;
        for (let i = actors.length - 1; i >= 0; i--) {
          const a = actors[i];
          a.x += a.dir * a.speed * dt;
          a.phase += dt * (a.kind.motion ? a.kind.motion.freq : 1) * TAU;
          a.ft += dt;
          const frameTime = 1 / a.kind.fps;
          if (a.ft >= frameTime) {
            a.ft %= frameTime;
            a.frame = (a.frame + 1) % SPRITES[a.kind.sprite].frames.length;
          }
          if ((a.dir > 0 && a.x > width + 2) || (a.dir < 0 && a.x < -a.sw - 2)) {
            if (options.wrap) a.x = a.dir > 0 ? -a.sw : width;
            else actors.splice(i, 1);
          }
        }
        if (!options.wrap && spawner.tick(dt, actors.length)) spawn(0, 0);
      },
      draw(c) {
        if (!bg) {
          bg = makeCanvas(width, BAND);
          theme.drawStatic(bg.getContext('2d'), width, Core.seededRandom(1234 + width));
        }
        c.drawImage(bg, 0, 0);
        if (theme.drawDynamic) theme.drawDynamic(c, width, t, dyn);
        for (const a of actors) c.drawImage(image(a), Math.round(a.x), Math.round(a.top + motionOffset(a)), a.sw, a.sh);
      },
    };
  }

  // ---- Arcade pixel font (3x5 digits) for the combo counter -----------------------------

  const FONT = {
    0: ['111', '101', '101', '101', '111'],
    1: ['010', '110', '010', '010', '111'],
    2: ['111', '001', '111', '100', '111'],
    3: ['111', '001', '111', '001', '111'],
    4: ['101', '101', '111', '001', '001'],
    5: ['111', '100', '111', '001', '111'],
    6: ['111', '100', '111', '101', '111'],
    7: ['111', '001', '010', '010', '010'],
    8: ['111', '101', '111', '101', '111'],
    9: ['111', '101', '111', '001', '111'],
    C: ['111', '100', '100', '100', '111'],
    O: ['111', '101', '101', '101', '111'],
    M: ['10001', '11011', '10101', '10001', '10001'],
    B: ['110', '101', '110', '101', '110'],
    X: ['101', '101', '010', '101', '101'],
    F: ['111', '100', '110', '100', '100'],
    '!': ['1', '1', '1', '0', '1'],
  };

  function measureText(text, scale) {
    let w = 0;
    for (const ch of text) w += ((FONT[ch] ? FONT[ch][0].length : 3) + 1) * scale;
    return Math.max(0, w - scale);
  }

  function drawText(c, text, x, y, scale, color) {
    c.fillStyle = color;
    let cx = Math.round(x);
    for (const ch of text) {
      const glyph = FONT[ch];
      if (glyph) {
        for (let r = 0; r < glyph.length; r++) {
          for (let col = 0; col < glyph[r].length; col++) {
            if (glyph[r][col] === '1') c.fillRect(cx + col * scale, Math.round(y) + r * scale, scale, scale);
          }
        }
      }
      cx += ((glyph ? glyph[0].length : 3) + 1) * scale;
    }
  }

  return {
    BAND,
    SPRITES,
    THEMES,
    THEME_MENU,
    FONT,
    renderSprite,
    createScene,
    measureText,
    drawText,
  };
});
