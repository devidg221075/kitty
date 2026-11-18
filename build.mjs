#!/usr/bin/env node
// Build del sito Kitty: src/ -> dist/ (zero dipendenze, solo Node >= 18)
//   node build.mjs            build
//   node build.mjs --serve    build + server locale su http://localhost:4173
//   node build.mjs --strict   build; esce con errore se ci sono link interni rotti
import { readFileSync, writeFileSync, mkdirSync, rmSync, cpSync, existsSync, readdirSync, statSync, createReadStream } from 'node:fs';
import { join, dirname, extname, relative, sep } from 'node:path';
import { createServer } from 'node:http';
import { createHash } from 'node:crypto';
import { gzipSync } from 'node:zlib';
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

const manifestFile = join(SRC, 'img/foto/manifest.json');
const manifest = existsSync(manifestFile) ? JSON.parse(readFileSync(manifestFile, 'utf8')) : {};

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

// <picture> WebP con srcset + fallback JPG
function picture(key, alt = '', sizes = '100vw', cls = '', loading = 'lazy') {
  const m = manifest[key];
  if (!m) throw new Error(`Foto non in manifest: ${key} (lancia npm run img)`);
  const srcset = m.widths.map((w) => `/img/foto/${key}-${w}.webp ${w}w`).join(', ');
  const load = loading === 'eager' ? 'fetchpriority="high"' : loading === 'now' ? 'loading="eager"' : 'loading="lazy"';
  return `<picture><source type="image/webp" srcset="${srcset}" sizes="${sizes}"><img src="/img/foto/${key}-fallback.jpg" alt="${esc(alt)}" width="${m.w}" height="${m.h}" ${load} decoding="async"${cls ? ` class="${cls}"` : ''}></picture>`;
}

// Galleria con lightbox: tutte le foto di una cartella (esclude le copertine)
const GAL = {
  it: { aria: 'Galleria', photo: (i, n) => `foto ${i} di ${n}`, zoom: ' (ingrandisci)' },
  en: { aria: 'Gallery', photo: (i, n) => `photo ${i} of ${n}`, zoom: ' (enlarge)' },
};
function gallery(folder, altPrefix, variant = '', lang = 'it') {
  const g = GAL[lang] || GAL.it;
  const keys = Object.keys(manifest).filter((k) => k.startsWith(folder + '/') && !k.endsWith('-cover')).sort();
  if (!keys.length) throw new Error(`Nessuna foto per la galleria: ${folder}`);
  const items = keys.map((k, i) => {
    const m = manifest[k];
    const big = m.widths[m.widths.length - 1];
    const alt = `${altPrefix} – ${g.photo(i + 1, keys.length)}`;
    return `<li><a class="gallery__item" href="/img/foto/${k}-${big}.webp" data-lightbox data-caption="${esc(alt)}">${picture(k, alt, '(min-width:1100px) 280px, (min-width:600px) 33vw, 50vw', '', i < 4 ? 'eager' : i < 8 ? 'now' : 'lazy')}<span class="sr-only">${g.zoom}</span></a></li>`;
  });
  return `<ul class="gallery ${variant}" aria-label="${g.aria}: ${esc(altPrefix)}">\n${items.join('\n')}\n</ul>`;
}

function render(tpl, vars, depth = 0) {
  if (depth > 6) throw new Error('Partial annidati troppo in profondità');
  return tpl
    .replace(/\{\{>\s*([\w-]+)\s*\}\}/g, (_, name) => {
      const key = vars.lang === 'en' && `${name}.en` in partials ? `${name}.en` : name;
      if (!(key in partials)) throw new Error(`Partial mancante: ${name}`);
      return render(partials[key], vars, depth + 1);
    })
    // variabili (anche quelle del front matter) prima degli helper, così si possono annidare: {{foto:x/{{slug}}-01|...}}
    .replace(/\{\{(\w+)\}\}/g, (m, k) => (k in vars ? vars[k] : m))
    // {{cur:/percorso/}} -> aria-current="page" se è la pagina corrente o la sua sezione (meta "section")
    .replace(/\{\{cur:([^}]+)\}\}/g, (_, p) => (vars.path === p || vars.section === p ? 'aria-current="page"' : ''))
    // {{foto:cartella/nome|alt|sizes|classe|lazy}}
    .replace(/\{\{foto:([^}]+)\}\}/g, (_, spec) => picture(...spec.split('|').map((s) => s.trim())))
    // {{gallery:cartella|prefisso alt|variante}}
    .replace(/\{\{gallery:([^}]+)\}\}/g, (_, spec) => { const [f, a, v] = spec.split('|').map((s) => s.trim()); return gallery(f, a, v || '', vars.lang); });
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

// versione (hash) di CSS e JS per la cache lunga
const hashOf = (f) => createHash('md5').update(readFileSync(join(SRC, f))).digest('hex').slice(0, 8);
const cssV = hashOf('css/main.css');
const cssText = readFileSync(join(SRC, 'css/main.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\s*\n\s*/g, '\n').trim();
const jsV = hashOf('js/main.js');

const pages = [];
for (const file of walk(join(SRC, 'pages')).filter((f) => f.endsWith('.html'))) {
  const rel = relative(join(SRC, 'pages'), file).split(sep).join('/'); // es. lady/index.html
  const { meta, body } = parsePage(file);
  for (const k of ['title', 'description']) {
    if (!meta[k]) throw new Error(`"${k}" mancante in ${rel}`);
  }
  const lang = rel.startsWith('en/') ? 'en' : 'it';
  const urlPath = rel === 'index.html' ? '/' : rel === '404.html' || rel === 'en/404.html' ? '/' + rel : '/' + rel.replace(/index\.html$/, '');
  const is404 = rel.endsWith('404.html');
  const itPath = lang === 'en' ? (urlPath.replace(/^\/en/, '') || '/') : urlPath;
  const enPath = lang === 'en' ? urlPath : (urlPath === '/' ? '/en/' : '/en' + urlPath);
  const altHref = is404 ? (lang === 'en' ? '/' : '/en/') : (lang === 'en' ? itPath : enPath);
  const ogKey = (meta.image || 'copertine/lady-cover').trim();
  const ogPath = `/img/og/${ogKey.replace(/\//g, '-')}.jpg`;
  if (!existsSync(join(SRC, ogPath))) throw new Error(`Immagine social mancante per ${rel}: ${ogPath} (lancia npm run og)`);
  const homeUrl = lang === 'en' ? '/en/' : '/';
  const crumbs = is404 ? [] : [{ name: 'Home', url: homeUrl }];
  if (!is404 && meta.parent) crumbs.push({ name: meta.parent.split('|')[0], url: meta.parent.split('|')[1] });
  if (!is404 && urlPath !== homeUrl) crumbs.push({ name: (meta.h1 || meta.title.split(' | ')[0]).replace(/<[^>]+>/g, ''), url: urlPath });
  const breadcrumbLd = crumbs.length > 1 ? `<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: crumbs.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.name, item: SITE + c.url })) })}</script>` : '';
  const vars = {
    ...meta,
    breadcrumbLd,
    cssV, jsV,
    path: urlPath,
    lang,
    locale: lang === 'en' ? 'en_GB' : 'it_IT',
    altHref,
    skip: lang === 'en' ? 'Skip to content' : 'Vai al contenuto',
    ldDesc: lang === 'en' ? 'Italian goldsmith craft and fine gold jewellery, made in Arezzo, Italy.' : 'Oreficeria e alta gioielleria italiana in oro, prodotta ad Arezzo.',
    hreflang: is404 ? '' : `<link rel="alternate" hreflang="it" href="${SITE}${itPath}">\n<link rel="alternate" hreflang="en" href="${SITE}${enPath}">\n<link rel="alternate" hreflang="x-default" href="${SITE}${itPath}">`,
    title: meta.title,
    description: meta.description,
    canonical: SITE + urlPath,
    ogImage: SITE + ogPath,
    ogAlt: meta.title.replace(/"/g, '&quot;'),
    robots: meta.robots || 'index,follow',
    bodyClass: meta.bodyClass || '',
    year: String(new Date().getFullYear()),
    crumbMid: meta.parent ? `<li><a href="${meta.parent.split('|')[1]}">${meta.parent.split('|')[0]}</a></li>` : '',
    leadHtml: meta.lead ? `<p class="page-head__lead">${meta.lead}</p>` : '',
  };
  const content = render(body, vars);
  let html = render(partials.layout, { ...vars, content });
  if (process.env.INLINE_CSS !== '0') html = html.replace(/<link rel="stylesheet" href="\/css\/main\.css\?v=\w+">/, () => `<style>${cssText}</style>`);
  const out = join(DIST, rel);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, html);
  pages.push({ urlPath, lang, itPath, enPath, noindex: /noindex/.test(vars.robots) });
}

// ---------- asset statici ----------
// niente css/ (è già dentro ogni pagina, salvo INLINE_CSS=0) e niente segnaposto illustrativi nel pacchetto da pubblicare
for (const dir of ['css', 'js', 'fonts', 'img']) {
  if (dir === 'css' && process.env.INLINE_CSS !== '0') continue;
  if (existsSync(join(SRC, dir))) cpSync(join(SRC, dir), join(DIST, dir), { recursive: true, filter: (s) => !s.includes(`${sep}img${sep}placeholder`) });
}
if (existsSync(join(SRC, 'static'))) cpSync(join(SRC, 'static'), DIST, { recursive: true }); // .htaccess, favicon.ico, ecc.

// ---------- sitemap + robots ----------
const today = new Date().toISOString().slice(0, 10);
const known = new Set(pages.map((p) => p.urlPath));
writeFileSync(join(DIST, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n` +
  pages.filter((p) => !p.noindex).sort((a, b) => a.urlPath.localeCompare(b.urlPath))
    .map((p) => {
      const alts = known.has(p.itPath) && known.has(p.enPath)
        ? `\n    <xhtml:link rel="alternate" hreflang="it" href="${SITE}${p.itPath}"/>\n    <xhtml:link rel="alternate" hreflang="en" href="${SITE}${p.enPath}"/>` : '';
      return `  <url><loc>${SITE}${p.urlPath}</loc><lastmod>${today}</lastmod>${alts}</url>`;
    }).join('\n') + `\n</urlset>\n`);
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
    if (!existsSync(f)) { res.writeHead(404, { 'content-type': types['.html'] }); return res.end(readFileSync(join(DIST, p.startsWith('/en/') ? 'en/404.html' : '404.html'), 'utf8')); }
    // come in produzione (.htaccess): compressione dei testi, cache lunga per gli asset, HTML sempre rivalidato
    const ext = extname(f);
    const headers = { 'content-type': types[ext] || 'application/octet-stream',
      'cache-control': ext === '.html' || ext === '.xml' || ext === '.txt' ? 'no-cache' : 'public, max-age=31536000, immutable' };
    if (/^(\.html|\.css|\.js|\.svg|\.xml|\.json|\.txt)$/.test(ext) && /gzip/.test(req.headers['accept-encoding'] || '')) {
      const body = gzipSync(readFileSync(f));
      res.writeHead(200, { ...headers, 'content-encoding': 'gzip', 'content-length': body.length, vary: 'Accept-Encoding' });
      return res.end(body);
    }
    res.writeHead(200, headers);
    createReadStream(f).pipe(res);
  }).listen(port, () => console.log(`\nServer locale: http://localhost:${port}`));
}
