#!/usr/bin/env node
/*
 * WCAG 2.x contrast of the colour tokens in style.css, light and dark themes.
 * Text tokens must reach AA for body text (4.5:1) on every background they sit on.
 * Exit 1 on any pair below its minimum.
 */
'use strict';
const fs = require('fs');
const path = require('path');

const css = fs.readFileSync(path.join(__dirname, '..', 'style.css'), 'utf8');

// The first block that defines --bg is the light theme, the second the dark theme.
const blocks = [...css.matchAll(/\{([^{}]*--bg:[^{}]*)\}/g)].map(m => m[1]);
if (blocks.length < 2) { console.error('check-contrast: expected light and dark token blocks'); process.exit(1); }

const tokens = block => Object.fromEntries(
  [...block.matchAll(/--([a-z0-9-]+):\s*(#[0-9a-fA-F]{6})\s*;/g)].map(m => [m[1], m[2]]));

const lum = hex => {
  const c = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map(v => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

// [foreground, background, minimum]
const PAIRS = [];
for (const fg of ['ink', 'ink-2', 'ink-3', 'accent', 'accent-hover'])
  for (const bg of ['bg', 'surface', 'surface-2', 'fig-bg']) PAIRS.push([fg, bg, 4.5]);
PAIRS.push(['on-accent', 'accent', 4.5]);

let bad = 0;
['light', 'dark'].forEach((theme, i) => {
  const t = tokens(blocks[i]);
  for (const [fg, bg, min] of PAIRS) {
    if (!t[fg] || !t[bg]) { console.error(`${theme}: missing --${t[fg] ? bg : fg}`); bad++; continue; }
    const r = ratio(t[fg], t[bg]);
    if (r < min) { console.error(`${theme}: --${fg} ${t[fg]} on --${bg} ${t[bg]} = ${r.toFixed(2)} < ${min}`); bad++; }
    else if (process.argv.includes('-v')) console.log(`${theme}: --${fg} on --${bg} = ${r.toFixed(2)}`);
  }
});
if (bad) { console.error(`check-contrast: ${bad} pair(s) below AA`); process.exit(1); }
console.log(`check-contrast: ${PAIRS.length * 2} pairs pass AA (light + dark)`);
