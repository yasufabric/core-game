import { readFileSync, writeFileSync } from 'fs';

const type = process.argv[2] || 'patch';

const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
let [maj, min, patch] = pkg.version.split('.').map(Number);
if      (type === 'major') { maj++; min = 0; patch = 0; }
else if (type === 'minor') { min++; patch = 0; }
else                       { patch++; }
pkg.version = `${maj}.${min}.${patch}`;
writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');

const html = readFileSync('index.html', 'utf8');
writeFileSync('index.html', html.replace(/v\d+\.\d+\.\d+/, 'v' + pkg.version));

console.log(`bumped to v${pkg.version}`);
