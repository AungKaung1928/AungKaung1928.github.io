// check-og.js: every page (redirect stubs excepted) has a link card: og:image pointing at a file in this repo that is a
// 1200x630 JPEG, plus twitter:card summary_large_image.
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..'), base = 'https://aungkaung1928.github.io/';
const pages = ['index.html', ...fs.readdirSync(path.join(root, 'projects')).filter(f => f.endsWith('.html')).map(f => 'projects/' + f)];
function jpegSize(buf) {  // width/height from the first SOF marker
  if (buf[0] !== 0xff || buf[1] !== 0xd8) return null;
  for (let i = 2; i + 9 < buf.length;) {
    if (buf[i] !== 0xff) return null;
    const m = buf[i + 1], len = buf.readUInt16BE(i + 2);
    if (m >= 0xc0 && m <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(m)) return [buf.readUInt16BE(i + 7), buf.readUInt16BE(i + 5)];
    i += 2 + len;
  }
  return null;
}
let bad = 0;
for (const p of pages) {
  const s = fs.readFileSync(path.join(root, p), 'utf8');
  if (s.includes('http-equiv="refresh"')) continue;
  const img = (s.match(/property="og:image" content="([^"]+)"/) || [])[1];
  const errs = [];
  if (!/name="twitter:card" content="summary_large_image"/.test(s)) errs.push('twitter:card is not summary_large_image');
  if (!img || !img.startsWith(base)) errs.push('og:image missing or not on this site');
  else {
    const f = path.join(root, img.slice(base.length));
    if (!fs.existsSync(f)) errs.push(`${img.slice(base.length)} does not exist`);
    else { const sz = jpegSize(fs.readFileSync(f)); if (!sz || sz[0] !== 1200 || sz[1] !== 630) errs.push(`${img.slice(base.length)} is ${sz ? sz.join('x') : 'not a JPEG'}, want 1200x630`); }
  }
  bad += errs.length; console.log(`${errs.length ? 'FAIL' : 'ok  '} ${p}${errs.length ? ': ' + errs.join('; ') : ''}`);
}
console.log(bad ? `check-og: ${bad} problems` : 'check-og: ok');
process.exit(bad ? 1 : 0);
