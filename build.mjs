#!/usr/bin/env node
// Build del sito Kitty: src/ -> dist/ (zero dipendenze, solo Node >= 18)
//   node build.mjs            build
//   node build.mjs --serve    build + server locale su http://localhost:4173
//   node build.mjs --strict   build; esce con errore se ci sono link interni rotti
import { readFileSync, writeFileSync, mkdirSync, rmSync, cpSync, existsSync, readdirSync, statSync, createReadStream } from 'node:fs';
import { join, dirname, extname, relative, sep } from 'node:path';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(fileURLToPath(import.meta.url));
const SRC = join(ROOT, 'src');
const DIST = join(ROOT, 'dist');
const SITE = 'https://www.kitty.it';
const args = new Set(process.argv.slice(2));

const walk = (dir) => readdirSync(dir).flatMap((f) => {
  const p = join(dir, f);
  return statSync(p).isDirectory() ? walk(p) : [p];
});

// ---------- partial + variabili ----------
const partials = {};
for (const f of readdirSync(join(SRC, 'partials'))) {
  partials[f.replace(/\.html$/, '')] = readFileSync(join(SRC, 'partials', f), 'utf8');
}

function render(tpl, vars, depth = 0) {
  if (depth > 6) throw new Error('Partial annidati troppo in profondità');
  return tpl
    .replace(/\{\{>\s*([\w-]+)\s*\}\}/g, (_, name) => {
      if (!(name in partials)) throw new Error(`Partial mancante: ${name}`);
      return render(partials[name], vars, depth + 1);
    })
    // {{cur:/percorso/}} -> aria-current="page" se è la pagina corrente (o una sua sezione, con "~")
    .replace(/\{\{cur:(~?)([^}]+)\}\}/g, (_, section, p) => {
      const here = vars.path;
      const on = section ? here.startsWith(p) && p !== '/' : here === p;
      return on ? 'aria-current="page"' : '';
    })
    .replace(/\{\{(\w+)\}\}/g, (m, k) => (k in vars ? vars[k] : m));
}

// ---------- pagine ----------
// Ogni file in src/pages/ ha un blocco iniziale  ---\nchiave: valore\n---  poi l'HTML del <main>.
function parsePage(file) {
  const raw = readFileSync(file, 'utf8');
  const m = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!m) throw new Error(`Front matter mancante in ${file}`);
  const meta = {};
  for (const line of m[1].split('\n')) {
    const i = line.indexOf(':');
    if (i > 0) meta[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  return { meta, body: m[2] };
}

rmSync(DIST, { recursive: true, force: true });
mkdirSync(DIST, { recursive: true });

const pages = [];
for (const file of walk(join(SRC, 'pages')).filter((f) => f.endsWith('.html'))) {
  const rel = relative(join(SRC, 'pages'), file).split(sep).join('/'); // es. lady/index.html
  const { meta, body } = parsePage(file);
  for (const k of ['title', 'description']) {
    if (!meta[k]) throw new Error(`"${k}" mancante in ${rel}`);
  }
  const urlPath = rel === 'index.html' ? '/' : rel === '404.html' ? '/404.html' : '/' + rel.replace(/index\.html$/, '');
  const vars = {
    path: urlPath,
    title: meta.title,
    description: meta.description,
    canonical: SITE + urlPath,
    ogImage: SITE + (meta.image || '/img/placeholder/hero.jpg'),
    robots: meta.robots || 'index,follow',
    bodyClass: meta.bodyClass || '',
    year: String(new Date().getFullYear()),
  };
  const content = render(body, vars);
  const html = render(partials.layout, { ...vars, content });
  const out = join(DIST, rel);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, html);
  pages.push({ urlPath, noindex: /noindex/.test(vars.robots) });
}

// ---------- asset statici ----------
for (const dir of ['css', 'js', 'fonts', 'img']) {
  if (existsSync(join(SRC, dir))) cpSync(join(SRC, dir), join(DIST, dir), { recursive: true });
}
if (existsSync(join(SRC, 'static'))) cpSync(join(SRC, 'static'), DIST, { recursive: true }); // .htaccess, favicon.ico, ecc.

// ---------- sitemap + robots ----------
const today = new Date().toISOString().slice(0, 10);
writeFileSync(join(DIST, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
  pages.filter((p) => !p.noindex).sort((a, b) => a.urlPath.localeCompare(b.urlPath))
    .map((p) => `  <url><loc>${SITE}${p.urlPath}</loc><lastmod>${today}</lastmod></url>`).join('\n') + `\n</urlset>\n`);
writeFileSync(join(DIST, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`);

// ---------- controllo link interni ----------
const broken = [];
const resolves = (url) => {
  const clean = url.split('#')[0].split('?')[0];
  if (!clean) return true;
  const p = join(DIST, decodeURIComponent(clean));
  if (existsSync(p) && statSync(p).isFile()) return true;
  return existsSync(join(p, 'index.html'));
};
for (const f of walk(DIST).filter((f) => f.endsWith('.html'))) {
  const html = readFileSync(f, 'utf8');
  const here = '/' + relative(DIST, f).split(sep).join('/');
  for (const m of html.matchAll(/\s(?:href|src|srcset|poster)="([^"]+)"/g)) {
    // srcset: "url 480w, url 960w"
    const urls = m[0].includes('srcset=') ? m[1].split(',').map((s) => s.trim().split(/\s+/)[0]) : [m[1]];
    for (const u of urls) {
      if (/^(https?:|mailto:|tel:|data:|#|javascript:)/.test(u)) continue;
      if (!u.startsWith('/')) { broken.push(`${here} -> ${u} (link relativo: usare percorsi assoluti)`); continue; }
      if (!resolves(u)) broken.push(`${here} -> ${u}`);
    }
  }
}

console.log(`Build ok: ${pages.length} pagine -> dist/`);
if (broken.length) {
  const uniq = [...new Set(broken)];
  console.log(`\n${uniq.length} link/risorse interni non risolti:`);
  uniq.forEach((b) => console.log('  - ' + b));
  if (args.has('--strict')) process.exit(1);
} else {
  console.log('Link interni: tutti ok.');
}

// ---------- server locale ----------
if (args.has('--serve')) {
  const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.mjs': 'text/javascript',
    '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
    '.webp': 'image/webp', '.woff2': 'font/woff2', '.xml': 'application/xml', '.txt': 'text/plain' };
  const port = Number(process.env.PORT) || 4173;
  createServer((req, res) => {
    let p = decodeURIComponent(req.url.split('?')[0]);
    let f = join(DIST, p);
    if (!f.startsWith(DIST)) { res.writeHead(403); return res.end(); }
    if (existsSync(f) && statSync(f).isDirectory()) f = join(f, 'index.html');
    if (!existsSync(f)) { res.writeHead(404, { 'content-type': types['.html'] }); return res.end(readFileSync(join(DIST, '404.html'), 'utf8')); }
    res.writeHead(200, { 'content-type': types[extname(f)] || 'application/octet-stream' });
    createReadStream(f).pipe(res);
  }).listen(port, () => console.log(`\nServer locale: http://localhost:${port}`));
}
