#!/usr/bin/env node
/* Behaviour check for the conversation layer in chat.js (no browser needed).
 * Runs the pure part of chat.js (knowledge base, matcher, conversation)
 * on scripted conversations, including the one that used to loop on the
 * same fallback.   node tools/check-chat.js  → exit 0 clean, exit 1 on failure */
const fs = require('fs');
const path = require('path');
const src = fs.readFileSync(path.join(__dirname, '..', 'chat.js'), 'utf8');
const cut = src.indexOf('/* ── Answer rendering');
if (cut < 0) { console.error('marker "Answer rendering" not found in chat.js'); process.exit(1); }
const api = new Function(src.slice(0, cut) + '\nreturn { converse, newContext, localAnswer, fixTypos, PLAIN, HINTS, TOPICS };')();

let bad = 0;
const check = (name, ok, got) => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${ok ? '' : '   got: ' + JSON.stringify(got).slice(0, 220)}`); if (!ok) bad++; };
const talk = (lines) => { const ctx = api.newContext(); return lines.map((l) => (Array.isArray(l) ? api.converse(l[0], ctx, l[1]) : api.converse(l, ctx))); };

// 1. The screenshot conversation: hi → what do i ask → dun get it
let r = talk(['hi', 'what do i ask', 'dun get it']);
check('greeting offers hints', r[0].hints && r[0].hints.length === 3, r[0]);
check('"what do i ask" is understood as stuck', r[1].hints && r[1].hints.length === 3 && !/did not catch/i.test(r[1].text), r[1]);
check('"dun get it" after no topic is not the same reply twice', r[2].text !== r[1].text && r[2].hints && r[2].hints.length > 0, r[2]);

// 2. Misses escalate and never repeat the same text
r = talk(['asdf qwerty', 'zzz blorp', 'florb snark', 'gloop']);
check('miss 1 has 3 hints', r[0].hints.length === 3, r[0]);
check('miss 2 explains simply', r[1].text.includes(api.PLAIN.who), r[1]);
check('miss 3 offers email', /@/.test(r[2].text), r[2]);
check('no two consecutive identical replies', r.every((x, i) => i === 0 || x.text !== r[i - 1].text), r.map((x) => x.text.slice(0, 40)));

// 3. Context: simpler / more on the last topic
r = talk(['tell me about the biped', "i don't get it", 'more']);
check('biped answered without hints', /344\.8/.test(r[0].text) && !r[0].hints, r[0]);
check('"don\'t get it" gives the plain version of the biped', r[1].text.includes(api.PLAIN.duck), r[1]);
check('"more" after a short answer gives the long one', r[2].text.length > r[0].text.length, r[2]);

// 4. Typos, tapped hints, thanks, honest not-covered
check('typo "projetcs" finds projects', api.localAnswer('show me the projetcs').topic === 'projects', api.localAnswer('show me the projetcs'));
r = talk([['The robot arm', 'arm'], 'thanks']);
check('tapped hint answers its topic', /0\.77/.test(r[0].text), r[0]);
check('thanks offers 2 fresh hints, not the arm again', r[1].hints.length === 2 && r[1].hints.every((h) => h.topic !== 'arm'), r[1]);
r = talk(['what is his salary']);
check('salary stays an honest "not published"', /not published/i.test(r[0].text), r[0]);
check('every hint topic exists', Object.keys(api.HINTS).every((id) => api.TOPICS.some((t) => t.id === id)), Object.keys(api.HINTS));
check('every plain topic exists', Object.keys(api.PLAIN).every((id) => api.TOPICS.some((t) => t.id === id)), Object.keys(api.PLAIN));
check('Japanese "わからない" is stuck', talk(['わからない'])[0].hints.length === 3, talk(['わからない'])[0]);
check('no em dash in conversation text', !/—/.test(Object.values(api.PLAIN).join(' ') + Object.values(api.HINTS).join(' ')), '');

console.log(bad ? `${bad} chat check(s) failed` : 'chat checks passed');
process.exit(bad ? 1 : 0);
