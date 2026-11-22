#!/usr/bin/env node
/*
 * The home page keeps its scroll progress: a bar under the header and a % badge
 * (his ask 2026-11-22: the v3 redesign removed both by accident).
 * Exit 1 when the markup, the script hook or the style is missing.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const html = read('index.html'), js = read('script.js'), css = read('style.css');
const need = [
  ['index.html: progress bar inside the header', /<header>[\s\S]*?id="progress-bar"[\s\S]*?<\/header>/.test(html)],
  ['index.html: % badge', /id="scroll-percentage"/.test(html)],
  ['script.js: bar width follows the scroll', /progressBar[\s\S]{0,80}style\.width\s*=/.test(js)],
  ['script.js: badge text follows the scroll', /scrollPercentage\.textContent\s*=/.test(js)],
  ['style.css: bar styled', /#progress-bar\s*\{[^}]*background/.test(css)],
  ['style.css: badge styled', /#scroll-percentage\s*\{[^}]*position:\s*fixed/.test(css)],
];
const bad = need.filter(([, ok]) => !ok);
for (const [name] of bad) console.error('check-scroll: missing ' + name);
if (bad.length) process.exit(1);
console.log('check-scroll: bar + badge present');
