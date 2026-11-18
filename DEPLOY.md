# Messa online di www.kitty.it

## 1. Build
```bash
npm run build        # genera dist/ (serve Node 18+; nessuna dipendenza)
```
`dist/` è l'unica cartella da pubblicare. Contiene HTML, immagini, `sitemap.xml`, `robots.txt`, `.htaccess` e `contatti/invia.php`.

## 2. Requisiti del server
- **PHP 8.1+** (provato con 8.3; il codice non usa nulla di deprecato) con l'estensione `mbstring`. Serve solo per `contatti/invia.php`.
- Un MTA per `mail()` (Postfix/Exim/sendmail) **oppure** passare a SMTP (vedi sotto).
- HTTPS attivo (certificato) e DNS di `kitty.it` e `www.kitty.it` sul server.
- **Apache**: abilitare `mod_rewrite`, `mod_headers`, `mod_expires`, `mod_deflate` e `AllowOverride All` per la cartella (usa `.htaccess`).
  **Nginx**: usare `deploy/nginx-kitty.conf` (equivalente dell'`.htaccess`; adattare certificati e socket PHP-FPM).

## 3. Modulo contatti: da controllare
In `contatti/invia.php` (costanti in cima al file):
- `DESTINATARIO` = `info@kitty.it`
- `MITTENTE` = `noreply@kitty.it`: deve essere un indirizzo del dominio, con SPF/DKIM validi, altrimenti le email finiscono in spam.
Prova: inviare una richiesta dal sito, e una con un indirizzo diverso da `info@kitty.it`.

## 4. Dopo la pubblicazione
1. Aprire https://www.kitty.it/ e https://www.kitty.it/en/ e controllare il selettore IT | EN.
2. Verificare i redirect: `http://kitty.it` → `https://www.kitty.it`, `/?lang=en` → `/en/`, `/portfolio-tag/lady/` → `/lady/`.
3. Verificare un URL inesistente (404 italiano) e `/en/nonesiste/` (404 inglese).
4. Search Console: aggiungere la proprietà, inviare `https://www.kitty.it/sitemap.xml`, controllare dopo qualche giorno copertura e Core Web Vitals.
5. Rilanciare Lighthouse (mobile) sul sito vero.

## 5. Aggiornare il sito
Modificare i file in `src/`, poi `npm run build` e ricaricare `dist/`.
Foto nuove: metterle in `foto-originali/<cartella>/` e lanciare `npm run img` (e `npm run og` se cambiano le immagini social).
