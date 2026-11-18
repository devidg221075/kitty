# Kitty – nuovo sito www.kitty.it

Ricostruzione completa del sito di KITTY S.r.l. (oreficeria e alta gioielleria in oro, Arezzo).
Il sito attuale è un WordPress del 2016 (tema "moose", WPML IT/EN). Il nuovo sito è **statico**.

## Decisioni già prese
- **Direzione grafica: "A · Pink Editorial"** – vedi `design/tavola-pink-editorial-01.png` (riferimento vincolante)
  e i mockup `design/riferimento/home-desktop.html` e `home-mobile.html` (apribili nel browser).
  Canvas con le 3 varianti: https://claude.ai/artifact/AAc295z1Z5gM56PVKfpVHP (si sviluppa SOLO la A).
- **Tecnologia: HTML + CSS + JavaScript vanilla**, nessun framework, nessuna dipendenza runtime.
- Lingua: prima l'italiano completo; l'inglese è la fase 2 (struttura già pronta per `/en/`).

## Come lavorare
- Sorgenti in `src/`, header/footer/head come **partial** riutilizzati da un piccolo script `build.mjs`
  (Node, zero dipendenze) che genera `dist/` = la cartella da caricare sul server.
  Nessun header/footer copiato a mano in 20 pagine.
- `npm run build` → `dist/`; `npm run dev` → build + server locale (es. `npx serve dist`).
- Prima di dire "fatto": build pulita, tutte le pagine aperte in locale a 1440 px e 390 px, zero errori in console,
  link interni tutti funzionanti (script di controllo link in `build.mjs` o separato).
- Non inventare fatti sull'azienda (fiere, date, numeri, premi): ciò che non è in questo file diventa un
  segnaposto ben visibile tipo `[DATA FIERA]` e va elencato nel report finale.

## Struttura URL (mantenere gli URL attuali: non perdiamo il posizionamento Google)
Ogni pagina è una cartella con `index.html`:

| URL | Pagina |
|---|---|
| `/` | Home |
| `/about-kitty/` | About Kitty (storia, valori, le 4 fasi, premi) |
| `/design/` `/progettazione/` `/lavorazione/` `/produzione/` | Le 4 fasi, una pagina ciascuna con galleria |
| `/premiere-2016/` `/premiere-2019-menzione-speciale/` | Premi |
| `/le-fiere/` | Le Fiere |
| `/collezioni/` | Tutte le collezioni |
| `/lady/` `/baby/` `/fantasy/` `/full-gold/` `/lightness/` `/baby-bangles/` `/baby-pins/` `/rosari/` | Schede collezione (stesso template, galleria + lightbox) |
| `/contatti/` | Contatti + modulo + mappa |
| `/privacy/` | Privacy policy (testo da riprendere dal sito attuale / dal consulente) |
| `/404.html` | Pagina non trovata |

`.htaccess`: redirect 301 di `/?lang=en` → `/` (finché non c'è l'EN), di `/portfolio-tag/<x>/` → collezione
corrispondente, forza HTTPS e www, cache lunga per asset con hash.

## Design system (dalla tavola)
Colori:
- `--rosa-accento: #E85E89` → filetti, pallini slider, decorazioni (non testo)
- `--rosa-titolo: #E4557F` → **titoli grandi (≥ 24 px)**. Motivo: #E85E89 sul fondo blush #FFF1F5 ha contrasto 3,0:1 (al limite);
  #E4557F arriva a 3,24:1 (WCAG AA per testo grande: ≥ 3:1)
- `--rosa-testo: #C23A67` → **pulsanti (sfondo) e testi/link piccoli**. Motivo: la tavola proponeva #C93D6B, ma su blush
  arriva a 4,39:1 (sotto il 4,5:1 di WCAG AA per il testo piccolo); #C23A67 dà 4,68:1 su blush e 5,06:1 su bianco. Hover: `#A82E57`
- `--rosa-soft: #F6B0C4` · `--blush: #FFF1F5` (fondi sezione/card) · `--bianco: #FFFDFD`
- `--testo: #232024` · `--testo-2: #4A4246` · `--testo-3: #6B6266` (solo ≥ 12 px)
- `--oro: #CDA86E` solo decorativo o su fondo scuro, mai testo su chiaro
- Linee: `#F6D9E3`. Tricolore Made in Italy: `#1E8A4C` `#E9E4E4` `#D7263D`

Tipografia (self-hosted in woff2, NON da Google Fonts CDN: evitiamo problemi GDPR):
- Titoli e corsivi: **Playfair Display** 400 / 400 italic. Hero 72–96 px desktop (`clamp(52px, 6vw, 88px)`), 52 px mobile
- Navigazione e UI: **Jost** 400/500/600, menu 13–14 px maiuscolo con tracking 0.06em; kicker 12–13 px tracking 0.28–0.32em
- Descrizioni: Playfair italic 16–20 px
- Il font del logo NON si ricrea: si usa sempre il file `assets/logo-kitty.png` (PNG trasparente estratto dalla
  tavola; se l'azienda ha l'originale vettoriale, sostituirlo con l'SVG). Preservare elemento nero, rosa e proporzioni.

Layout home (vedi mockup):
1. Barra rosa 4 px in alto; header bianco: logo a sinistra, menu orizzontale (Home · About Kitty ▾ · Le Fiere ·
   Collezioni ▾ · Contatti), IT | EN a destra. Altezza contenuta. Mobile: logo + hamburger (pannello accessibile).
2. Hero editoriale: copy a sinistra su blush, maxi foto a destra. Kicker "Oreficeria e alta gioielleria italiana",
   claim "You dream… we create", descrizione, CTA "Scopri le collezioni →", badge "Arezzo, Italia · Made in Italy".
3. Fascia 8 collezioni (miniatura + "Collezione" + nome + filetto rosa). Mobile: carosello orizzontale con scroll-snap.
4. Fascia artigianalità: "Produzione di gioielli in oro ad Arezzo, in Italia" + Design / Progettazione / Lavorazione /
   Produzione (icone SVG lineari) + "Made in Italy" con tricolore.
5. Blocco "Kitty celebra la donna" + link About; riquadro Premiere 2019; footer con dati societari.

Motion (dalla tavola):
- Slider hero manuale + automatico: dissolvenza 900–1200 ms, zoom lento 1.00 → 1.04, intervallo 5–7 s,
  pausa su hover/focus, frecce = `<button>` reali, pallini con `aria-label`, `aria-live` sul titolo slide.
- Titoli e CTA: ingresso morbido (fade + 8–12 px), niente movimenti invasivi.
- `prefers-reduced-motion: reduce` → niente autoplay, niente zoom, niente animazioni di ingresso.

Accessibilità: focus visibile su tutto, target ≥ 44 px, alt descrittivi sulle foto prodotto, skip-link,
`lang="it"`, gerarchia titoli corretta, lightbox chiudibile con Esc e con focus trap.

## Contenuti (fatti verificati dal sito attuale – usare solo questi)
- KITTY S.r.l., alta gioielleria in oro **22, 21, 18, 14 e 9 kt**; da **oltre 30 anni**; collezioni per **donna, teenager e bambino**,
  design unico e raffinato, colori eleganti e innovativi; gioielli **realizzati interamente a mano da maestri orafi italiani**.
- Frase chiave: "Kitty celebra la donna". Claim: "You dream… we create". Il sito si presenta anche come "Oreficeria Bella e Monella".
- Prodotti: collane, bracciali, orecchini, anelli, ciondoli, spille, pendenti e arte sacra, per donna, uomo e bambino;
  oltre **5.000 articoli** di collezione.
- Collezioni: Lady, Baby, Fantasy, Full Gold, Lightness, Baby Bangles, Baby Pins, Rosari.
- Premi: **Premiere 2019 – Menzione Speciale**; pagina Premiere 2016 (contenuto da recuperare).
- Fiere: il sito attuale non riporta nomi/date → segnaposto `[FIERA · DATA · STAND]`.
- Le pagine Design / Progettazione / Lavorazione / Produzione oggi hanno solo titolo + foto: scrivere 2–3 frasi
  proposte per ciascuna, marcate come BOZZA DA APPROVARE nel report.

Dati di contatto e societari (obbligatori nel footer: P.IVA):
- KITTY S.r.l. – Via La Chianicella, 50/A – Loc. Ceciliano – 52100 Arezzo (AR) – Italia
- Tel. +39 0575 907004 · Fax +39 0575 910909 · info@kitty.it
- P.IVA / C.F. 01356350510 · Registro Imprese n. 002-13640 · REA n. 100159 · Capitale sociale € 100.000,00 i.v.
- Pagina Facebook aziendale (URL da prendere dal sito attuale)

Modulo contatti (come l'attuale): Azienda, Nome e cognome referente, Email + conferma email, Richiesta,
consenso privacy (checkbox obbligatoria con link a /privacy/). Il sito è statico → serve un endpoint:
`contatti/invia.php` (PHP `mail()` o SMTP, validazione lato server, honeypot + tempo minimo di compilazione
al posto del CAPTCHA, messaggi di esito accessibili). **Verificare che l'hosting supporti PHP**; in alternativa un servizio form esterno.
Mappa: NON incorporare Google Maps al caricamento (cookie): immagine statica + pulsante "Apri in Google Maps",
oppure embed caricato solo dopo il click.

## Immagini
- `bash content/scarica-foto.sh` scarica le foto reali da www.kitty.it in `foto-originali/`
  (copertine delle 8 collezioni + gallerie di ogni collezione + foto delle pagine About/Premiere).
- Le immagini in `assets/placeholder/` sono ritagli **illustrativi** della tavola: usarle solo dove manca una foto vera
  (es. l'hero), e segnalarlo nel report.
- Pipeline: convertire in **WebP (+ JPG fallback)**, larghezze 480/960/1600 con `srcset`/`sizes`, `loading="lazy"`
  sotto la piega, `width`/`height` sempre presenti, qualità ~80. Nomi file parlanti (`lady-parure-01.webp`).

## SEO e tecnico
- `<title>` e meta description unici per pagina, Open Graph, favicon dal logo, `sitemap.xml`, `robots.txt`.
- Schema.org `JewelryStore`/`Organization` con indirizzo, telefono, email, P.IVA.
- Niente cookie di profilazione → nessun banner cookie necessario finché non si aggiungono analytics/mappe/social embed.
- Obiettivo Lighthouse ≥ 95 su Performance, Accessibilità, Best Practices, SEO (mobile).

## Domande aperte da fare all'utente (una alla volta, con opzioni)
1. Logo vettoriale originale disponibile?
2. Foto hero: ce ne sono di nuove/ad alta risoluzione o usiamo le migliori delle gallerie?
3. Hosting attuale e accesso (cPanel/FTP)? Supporta PHP per il modulo?
4. Calendario fiere da pubblicare?
5. Fase 2 inglese: traduzioni fornite dall'azienda o bozza da approvare?
