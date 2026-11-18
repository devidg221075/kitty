#!/usr/bin/env node
// Immagini per i social (Open Graph / Twitter): src/img/og/<chiave>.jpg, 1200x630 JPG.
// Le chiavi sono quelle usate nel front matter delle pagine (`image: copertine/lady-cover`).
// Fondo rosa; le foto su fondo bianco vengono fuse (multiply) come nell'hero, le altre sovrapposte.
// Uso: npm run og
import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync, mkdirSync, existsSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const walk = (d) => readdirSync(d).flatMap((f) => { const p = join(d, f); return statSync(p).isDirectory() ? walk(p) : [p]; });
const keys = new Set(['copertine/lady-cover']); // immagine predefinita
for (const f of walk(join(ROOT, 'src/pages')).filter((f) => f.endsWith('.html'))) {
  const m = readFileSync(f, 'utf8').match(/^image:\s*(\S+)/m);
  if (m) keys.add(m[1]);
}
const manifest = JSON.parse(readFileSync(join(ROOT, 'src/img/foto/manifest.json'), 'utf8'));
const out = join(ROOT, 'src/img/og'); mkdirSync(out, { recursive: true });
const sh = (a) => execFileSync('convert', a, { encoding: 'utf8' });

for (const key of keys) {
  const m = manifest[key];
  if (!m) throw new Error(`Chiave immagine non in manifest: ${key}`);
  const src = join(ROOT, 'src/img/foto', `${key}-${m.widths[m.widths.length - 1]}.webp`);
  const dest = join(out, key.replace(/\//g, '-') + '.jpg');
  // angoli quasi bianchi => foto su fondo bianco => multiply
  const corner = parseFloat(sh([src, '-gravity', 'NorthWest', '-crop', '8x8+0+0', '+repage', '-colorspace', 'Gray', '-format', '%[fx:mean]', 'info:']));
  const mode = corner > 0.93 ? 'Multiply' : 'Over';
  sh(['-size', '1200x630', 'radial-gradient:#FFF6F9-#FBD7E3',
      '(', src, '-auto-orient', '-resize', 'x630>', ')', '-gravity', 'center', '-compose', mode, '-composite',
      '-strip', '-interlace', 'Plane', '-quality', '82', dest]);
  console.log(`${key} -> ${dest.replace(ROOT + '/', '')} (${mode})`);
}
