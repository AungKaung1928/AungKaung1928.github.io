#!/usr/bin/env node
/*
 * The README stays a short note about the site (his ask 2026-11-23): no photo or
 * screenshot, no clone / quick-start steps. The site is his portfolio, not a project to clone.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const md = fs.readFileSync(path.join(__dirname, '..', 'README.md'), 'utf8');
const bad = [
  [/<img\b|!\[[^\]]*\]\(/i, 'an image (no photo or screenshot in this README)'],
  [/git clone|quick start|http\.server/i, 'clone / run steps (the site is not meant to be cloned)'],
];
const hits = bad.filter(([re]) => re.test(md)).map(([, why]) => why);
if (hits.length) { console.error('check-readme: README has ' + hits.join('; ')); process.exit(1); }
console.log(`check-readme: README ${md.split('\n').length} lines, no image, no clone steps`);
