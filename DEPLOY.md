# Messa online di www.kitty.it (Apache + PHP)

## 1. Cosa caricare
Il contenuto della cartella `dist/` (nello zip `kitty-sito-pubblicazione.zip` è già alla radice): copiarlo **dentro la cartella pubblica** del sito (document root di `www.kitty.it`).
Attenzione al file nascosto `.htaccess`: deve finire nella stessa cartella di `index.html` (alcuni programmi FTP nascondono i file che iniziano con il punto).

## 2. Requisiti del server
- **Apache 2.4** con `mod_rewrite`, `mod_headers`, `mod_expires`, `mod_deflate` e `AllowOverride All` per la cartella del sito (il file `.htaccess` fa redirect, cache e compressione).
- **PHP 8.1+** (provato con 8.3; il codice non usa nulla di deprecato) con l'estensione `mbstring`. Serve solo per `contatti/invia.php`.
- Un MTA configurato per la funzione `mail()` di PHP (Postfix, Exim o sendmail).
- HTTPS attivo e DNS di `kitty.it` e `www.kitty.it` puntati sul server. L'`.htaccess` porta tutto su `https://www.kitty.it`.
- Nessun database.

## 3. Modulo contatti (solo email)
Il modulo non salva nulla: invia **due email**.
1. **Notifica a Kitty** (`info@kitty.it`): riepilogo della richiesta in italiano; rispondendo, la risposta arriva direttamente al cliente.
2. **Conferma al cliente**: email grafica (logo, riepilogo, contatti, pulsante verso il sito), nella lingua del sito da cui ha scritto (italiano o inglese). Le risposte del cliente arrivano a `info@kitty.it`.

Se la notifica a Kitty non parte, il visitatore vede un errore e può riprovare. Se parte la notifica ma non la conferma, la richiesta risulta comunque inviata (l'errore va nel log di PHP).

In cima a `contatti/invia.php` ci sono le impostazioni:
- `DESTINATARIO` = `info@kitty.it` (dove arrivano le richieste)
- `MITTENTE` = `noreply@kitty.it` (**deve essere un indirizzo del dominio del server**, con SPF e DKIM validi, altrimenti le email finiscono in spam)
- `RISPONDI_A` = `info@kitty.it` (dove arrivano le risposte del cliente alla conferma)
- `MAX_INVII_ORA` = 5 richieste per indirizzo IP all'ora (protezione dagli abusi)

Il look delle email è in `contatti/email-template.php` (colori, testi italiano/inglese).
**Prova dopo la pubblicazione:** inviare una richiesta dal sito con un indirizzo vostro, e controllare che arrivino entrambe le email (anche nella cartella spam).
Nota privacy: l'informativa dichiara max 12 mesi di conservazione delle richieste di contatto; ora i dati restano solo nelle caselle email di Kitty, quindi la regola riguarda la vostra posta.

## 4. Dopo la pubblicazione
1. Aprire https://www.kitty.it/ e https://www.kitty.it/en/ e controllare il selettore IT | EN.
2. Verificare i redirect: `http://kitty.it` → `https://www.kitty.it`, `/?lang=en` → `/en/`, `/portfolio-tag/lady/` → `/lady/`.
3. Verificare un URL inesistente (404 italiano) e `/en/nonesiste/` (404 inglese).
4. Search Console: aggiungere la proprietà, inviare `https://www.kitty.it/sitemap.xml`, controllare dopo qualche giorno copertura e Core Web Vitals.
5. Rilanciare Lighthouse (mobile) sul sito vero.

## 5. Aggiornare il sito
Modificare i file in `src/`, poi `npm run build` e ricaricare `dist/`.
Foto nuove: metterle in `foto-originali/<cartella>/` e lanciare `npm run img` (e `npm run og` se cambiano le immagini social).
