#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(__dirname, '..', 'dist');

function walkSync(dir) {
  let results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const ent of entries) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) results = results.concat(walkSync(full));
    else if (ent.isFile() && full.endsWith('.js')) results.push(full);
  }
  return results;
}

if (!fs.existsSync(distDir)) {
  console.error('dist directory not found at', distDir);
  process.exit(1);
}

const jsFiles = walkSync(distDir);
const changed = [];

for (const file of jsFiles) {
  let content = fs.readFileSync(file, 'utf8');
  const orig = content;

  // static `from '...'
  content = content.replace(/(\bfrom\s+)(['"])(\.\.?\/[^'\"]+?)(\2)/g, (m, before, quote, rel, quote2) => {
    if (/\.(?:js|mjs|cjs|json|node)$/.test(rel)) return m;
    return `${before}${quote}${rel}.js${quote2}`;
  });

  // dynamic import import('...')
  content = content.replace(/(import\(\s*)(['"])(\.\.?\/[^'\"]+?)(\2)(\s*\))/g, (m, before, quote, rel, quote2, after) => {
    if (/\.(?:js|mjs|cjs|json|node)$/.test(rel)) return m;
    return `${before}${quote}${rel}.js${quote2}${after}`;
  });

  // export ... from '...'
  content = content.replace(/(\bexport[\s\S]*?\bfrom\s+)(['"])(\.\.?\/[^'\"]+?)(\2)/g, (m, before, quote, rel, quote2) => {
    if (/\.(?:js|mjs|cjs|json|node)$/.test(rel)) return m;
    return `${before}${quote}${rel}.js${quote2}`;
  });

  if (content !== orig) {
    fs.writeFileSync(file, content, 'utf8');
    changed.push(path.relative(distDir, file));
  }
}

console.log(`Patched ${changed.length} files`);
changed.forEach(f => console.log(f));
