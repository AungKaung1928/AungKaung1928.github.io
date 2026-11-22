// check-names.js: project names in page text, chat answers and chat worker are spelled the way the projects spell them.
// Fails on "ROS2" / "MoveIt2" used as a word (identifiers such as ros2_control or file names are not matched).
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const files = ['index.html', 'chat.js', 'worker/worker.js', ...fs.readdirSync(path.join(root, 'projects')).filter(f => f.endsWith('.html')).map(f => 'projects/' + f)];
const rules = [[/\bROS2(?![\w-])/g, 'ROS 2'], [/\bMoveIt2(?![\w-])/g, 'MoveIt 2']];
let bad = 0;
for (const f of files) {
  fs.readFileSync(path.join(root, f), 'utf8').split('\n').forEach((line, i) => {
    for (const [re, want] of rules) for (const m of line.matchAll(re)) { bad++; console.log(`${f}:${i + 1}: "${m[0]}" -> "${want}"`); }
  });
}
console.log(bad ? `check-names: ${bad} misspelled names` : `check-names: ok (${files.length} files)`);
process.exit(bad ? 1 : 0);
