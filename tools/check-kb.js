#!/usr/bin/env node
/* Drift check: every fact printed on index.html must also appear in the chat
 * knowledge base.
 *
 * The chat answers are hand-written, not derived from the page, so editing
 * index.html alone leaves the widget telling a recruiter something stale.
 * This script catches that. It does not check the reverse for prose — the KB
 * deliberately says more than the page — but it does flag a project title or
 * repo URL the KB still mentions after the page dropped it.
 *
 *   node tools/check-kb.js        → exit 0 clean, exit 1 on drift
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

const html = read('index.html');
const targets = [
    { file: 'chat.js', text: read('chat.js'), required: true },
    { file: 'worker/worker.js', text: read('worker/worker.js'), required: true },
];

/* ── Pull the facts out of the page ──────────────────────────────── */

function decode(s) {
    return s
        .replace(/&amp;/g, '&')
        .replace(/&gt;/g, '>')
        .replace(/&lt;/g, '<')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&nbsp;/g, ' ');
}

const norm = (s) => decode(s).replace(/\s+/g, ' ').trim().toLowerCase();

function all(re, s, group = 1) {
    return [...s.matchAll(re)].map((m) => decode(m[group]).replace(/\s+/g, ' ').trim());
}

const facts = [];
const push = (kind, value, note) => facts.push({ kind, value, note });

// Project cards: title, tech tags, repo link.
const cards = all(/<article class="project-card">([\s\S]*?)<\/article>/g, html);
cards.forEach((card, i) => {
    const label = `project ${String(i + 1).padStart(2, '0')}`;
    const title = all(/<h3>(.*?)<\/h3>/g, card)[0];
    if (title) push('project title', title, label);
    for (const tech of all(/<li>(.*?)<\/li>/g, all(/<ul class="project-tech">([\s\S]*?)<\/ul>/g, card)[0] || '')) {
        push('project tech', tech, `${label} — ${title || '?'}`);
    }
    const repo = all(/href="(https:\/\/github\.com\/[^"]+)"/g, card)[0];
    if (repo) push('repo url', repo, label);
});

// Skills grid: every listed item.
const skills = all(/<div class="skills-grid">([\s\S]*?)<\/div>\s*<\/div>\s*<\/section>/g, html)[0]
    || all(/<div class="skills-grid">([\s\S]*?)<\/section>/g, html)[0]
    || '';
for (const group of all(/<h3>(.*?)<\/h3>/g, skills)) push('skill group', group, 'skills');
for (const item of all(/<li>(.*?)<\/li>/g, skills)) push('skill', item, 'skills');

// Contact details.
for (const mail of all(/mailto:([^"?]+)/g, html)) push('email', mail, 'contact');

if (!cards.length) {
    console.error('check-kb: found no .project-card in index.html — markup changed, update this script.');
    process.exit(2);
}

/* ── Compare ─────────────────────────────────────────────────────── */

// Tech names and skill items appear inside prose, so match on the normalised
// substring. A project title is matched the same way; the KB is expected to
// name it verbatim at least once.
const missing = [];
for (const target of targets) {
    const hay = norm(target.text);
    for (const f of facts) {
        if (!hay.includes(norm(f.value))) missing.push({ ...f, file: target.file });
    }
}

// Reverse: a repo URL or project title the KB still names but the page dropped.
const pageRepos = new Set(facts.filter((f) => f.kind === 'repo url').map((f) => norm(f.value)));
const stale = [];
for (const target of targets) {
    for (const url of all(/(https:\/\/github\.com\/AungKaung1928\/[A-Za-z0-9._-]+)/g, target.text)) {
        const u = norm(url.replace(/[.,)]+$/, ''));
        if (u !== 'https://github.com/aungkaung1928' && !pageRepos.has(u)) {
            stale.push({ file: target.file, url });
        }
    }
}

/* ── Report ──────────────────────────────────────────────────────── */

const width = (rows, key) => rows.reduce((m, r) => Math.max(m, r[key].length), 0);

console.log(`check-kb: ${facts.length} facts from index.html vs ${targets.map((t) => t.file).join(', ')}`);

if (missing.length) {
    console.log('\nMISSING from the knowledge base:');
    const w = width(missing, 'kind');
    for (const m of missing) {
        console.log(`  ${m.file.padEnd(16)} ${m.kind.padEnd(w)}  ${m.value}   (${m.note})`);
    }
}

if (stale.length) {
    console.log('\nSTALE — named in the KB, gone from index.html:');
    for (const s of new Set(stale.map((s) => `  ${s.file.padEnd(16)} ${s.url}`))) console.log(s);
}

if (!missing.length && !stale.length) {
    console.log('no drift — every page fact is covered');
    process.exit(0);
}

console.log(`\n${missing.length} missing, ${new Set(stale.map((s) => s.url)).size} stale.`);
console.log('Fix: update TOPICS in chat.js and PROFILE in worker/worker.js, or tell Claude to sync the KB.');
process.exit(1);
