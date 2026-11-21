#!/usr/bin/env node
/* Link check for the static site.
 *
 * 1. Every relative href/src on every page must lead to a file, and a #anchor
 *    to an id on the target page.
 * 2. Every link to one of my GitHub repos must name a repo in repos.json (the
 *    public, non-fork snapshot the deploy workflow writes), so a renamed or
 *    private repo fails the deploy instead of sending a visitor to a 404.
 *    Skipped with a note when repos.json is missing (local run before a deploy).
 *
 *   node tools/check-links.js [site dir]   → exit 0 clean, exit 1 on a broken link
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(process.argv[2] || path.join(__dirname, '..'));
const OWNER = 'AungKaung1928';
const ATTR = /\s(?:href|src)=(?:"([^"]*)"|'([^']*)'|([^\s>"']+))/g;
const ID = /\sid=(?:"([^"]*)"|'([^']*)'|([^\s>"']+))/g;

const pages = ['.', 'projects']
  .flatMap((dir) => (fs.existsSync(path.join(ROOT, dir)) ? fs.readdirSync(path.join(ROOT, dir)).map((f) => path.join(dir, f)) : []))
  .filter((f) => f.endsWith('.html'));
const values = (re, text) => [...text.matchAll(re)].map((m) => m[1] ?? m[2] ?? m[3]);
const ids = new Map();
const idsOf = (file) => {
  if (!ids.has(file)) ids.set(file, new Set(values(ID, fs.readFileSync(file, 'utf8'))));
  return ids.get(file);
};

const reposFile = path.join(ROOT, 'repos.json');
const repos = fs.existsSync(reposFile) ? new Set(JSON.parse(fs.readFileSync(reposFile, 'utf8')).map((r) => r.name)) : null;
const repoLink = new RegExp(`^https://github\\.com/${OWNER}/([A-Za-z0-9._-]+?)(?:\\.git)?(?:[/#?].*)?$`);

const broken = [];
for (const page of pages) {
  const html = fs.readFileSync(path.join(ROOT, page), 'utf8');
  for (const raw of values(ATTR, html)) {
    const ref = raw.replace(/&amp;/g, '&');
    const repo = ref.match(repoLink);
    if (repo) {
      if (repos && !repos.has(repo[1])) broken.push(`${page}: ${ref} (not a public repo in repos.json)`);
      continue;
    }
    if (/^([a-z][a-z0-9+.-]*:|\/\/)/i.test(ref)) continue; // external, mailto:, data:, javascript:
    const [file, anchor] = ref.split('#');
    const clean = decodeURIComponent(file.split('?')[0]);
    let target = clean ? path.join(clean.startsWith('/') ? ROOT : path.dirname(path.join(ROOT, page)), clean) : path.join(ROOT, page);
    if (fs.existsSync(target) && fs.statSync(target).isDirectory()) target = path.join(target, 'index.html');
    if (!fs.existsSync(target)) broken.push(`${page}: ${ref} (missing file)`);
    else if (anchor && target.endsWith('.html') && !idsOf(target).has(decodeURIComponent(anchor))) broken.push(`${page}: ${ref} (missing anchor)`);
  }
}

console.log(`check-links: ${pages.length} pages${repos ? `, ${repos.size} public repos` : ', repos.json missing: repo links not checked'}`);
for (const b of broken) console.log(`  broken: ${b}`);
console.log(broken.length ? `${broken.length} broken link(s)` : 'no broken links');
process.exit(broken.length ? 1 : 0);
