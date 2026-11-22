#!/usr/bin/env node
/*
 * The hero name stays medium (his ask 2026-11-22: "too big, make it medium";
 * v3 had it up to 6.25rem = 100 px). The largest size in its clamp() must be <= 3.5rem.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const css = fs.readFileSync(path.join(__dirname, '..', 'style.css'), 'utf8');
const m = css.match(/\.hero-name\s*\{[^}]*font-size:\s*clamp\(([^;]*)\);/);
if (!m) { console.error('check-hero: .hero-name font-size clamp() not found'); process.exit(1); }
const max = m[1].split(',').pop().trim();
const rem = max.endsWith('rem') ? parseFloat(max) : max.endsWith('px') ? parseFloat(max) / 16 : NaN;
if (!(rem <= 3.5)) { console.error(`check-hero: hero name max ${max} > 3.5rem (he wants it medium)`); process.exit(1); }
console.log(`check-hero: hero name max ${max}`);
