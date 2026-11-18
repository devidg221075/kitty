#!/usr/bin/env node
// Pipeline immagini: foto-originali/ -> src/img/foto/  (WebP 480/960/1600 + JPG fallback 960, qualità 80)
// Richiede ImageMagick (`convert`/`identify`). Uso: npm run img   (rielabora solo ciò che manca)
import { execFileSync } from 'node:child_process';
import { readdirSync, existsSync, mkdirSync, writeFileSync, statSync } from 'node:fs';
import { join, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const IN = join(ROOT, 'foto-originali');
const OUT = join(ROOT, 'src/img/foto');
const WIDTHS = [480, 960, 1600];
const manifest = {};

const sh = (cmd, a) => execFileSync(cmd, a, { encoding: 'utf8' });
mkdirSync(OUT, { recursive: true });

function convertOne(src, base) {
  const [w, h] = sh('identify', ['-format', '%w %h', src + '[0]']).split(' ').map(Number);
  const widths = WIDTHS.filter((x) => x <= w);
  if (!widths.length || widths[widths.length - 1] < w) widths.push(Math.min(w, WIDTHS[WIDTHS.length - 1])); // almeno la larghezza nativa
  const uniq = [...new Set(widths)].sort((a, b) => a - b);
  for (const tw of uniq) {
    const webp = `${base}-${tw}.webp`;
    if (!existsSync(webp)) sh('convert', [src + '[0]', '-auto-orient', '-strip', '-resize', `${tw}x>`, '-quality', '80', webp]);
  }
  const jpg = `${base}-fallback.jpg`;
  if (!existsSync(jpg)) sh('convert', [src + '[0]', '-auto-orient', '-strip', '-resize', '960x>', '-quality', '80', '-interlace', 'Plane', jpg]);
  return { w, h, widths: uniq };
}

const slugs = readdirSync(IN).filter((d) => statSync(join(IN, d)).isDirectory());
for (const slug of slugs) {
  const files = readdirSync(join(IN, slug)).filter((f) => /\.(jpe?g|png)$/i.test(f) && !/parallax/i.test(f)).sort();
  mkdirSync(join(OUT, slug), { recursive: true });
  files.forEach((f, i) => {
    const name = slug === 'copertine' ? f.replace(extname(f), '') + '-cover' : `${slug}-${String(i + 1).padStart(2, '0')}`;
    const key = `${slug}/${name}`;
    const r = convertOne(join(IN, slug, f), join(OUT, slug, name));
    manifest[key] = { ...r, original: f };
  });
  console.log(`${slug}: ${files.length} immagini`);
}
writeFileSync(join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 1));
console.log(`Manifest: ${Object.keys(manifest).length} voci`);
