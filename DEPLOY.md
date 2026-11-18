# Messa online di www.kitty.it

## 1. Build
```bash
npm run build        # genera dist/ (serve Node 18+; nessuna dipendenza)
```
`dist/` è l'unica cartella da pubblicare. Contiene HTML, immagini, `sitemap.xml`, `robots.txt`, `.htaccess` e `contatti/invia.php`.

## 2. Requisiti del server
- **PHP 8.1+** (provato con 8.3; il codice non usa nulla di deprecato) con le estensioni `mbstring` e `pdo_mysql`. Serve solo per `contatti/invia.php`.
- Un MTA per `mail()` (Postfix/Exim/sendmail), oppure sostituire `invia_email()` con un invio SMTP.
- **MySQL 8 / MariaDB 10.6+** con l'estensione PHP `pdo_mysql`.
- HTTPS attivo (certificato) e DNS di `kitty.it` e `www.kitty.it` sul server.
- **Apache**: abilitare `mod_rewrite`, `mod_headers`, `mod_expires`, `mod_deflate` e `AllowOverride All` per la cartella (usa `.htaccess`).
  **Nginx**: usare `deploy/nginx-kitty.conf` (equivalente dell'`.htaccess`; adattare certificati e socket PHP-FPM).

## 3. Modulo contatti e database MySQL
Ogni richiesta viene **salvata in MySQL e inviata per email** a `info@kitty.it`. Il modulo risulta inviato se almeno una delle due cose riesce: una richiesta non si perde se la posta ha problemi, né se il database non risponde (l'errore va nel log di PHP).

**a) Database** (come utente amministratore MySQL; password a scelta):
```sql
CREATE DATABASE kitty CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'kitty_web'@'localhost'   IDENTIFIED BY 'PASSWORD_SITO';       -- usato dal sito: solo inserimento
CREATE USER 'kitty_admin'@'localhost' IDENTIFIED BY 'PASSWORD_GESTIONE';    -- per leggere/esportare le richieste
```
```bash
mysql -u root -p kitty < deploy/schema.sql
```
Poi i permessi (sono elencati anche in `deploy/schema.sql`):
```sql
GRANT INSERT ON kitty.richieste_contatti TO 'kitty_web'@'localhost';
GRANT SELECT (id) ON kitty.richieste_contatti TO 'kitty_web'@'localhost';
GRANT UPDATE (email_inviata) ON kitty.richieste_contatti TO 'kitty_web'@'localhost';
GRANT SELECT, DELETE ON kitty.richieste_contatti TO 'kitty_admin'@'localhost';
```
L'utente del sito non può leggere le richieste già salvate (solo inserirne): se il sito venisse compromesso, i dati dei clienti non si leggono.

**b) File di configurazione, fuori dalla cartella pubblica.** Copiare `deploy/kitty-config.sample.php` come `kitty-config.php` **un livello sopra `dist/`** (es. `/var/www/kitty/kitty-config.php` se il sito è in `/var/www/kitty/dist`) e mettere la password di `kitty_web`. Se il file non c'è, il modulo funziona comunque solo con l'email. In alternativa si può indicare un altro percorso con la variabile d'ambiente `KITTY_CONFIG`.

**c) Pulizia automatica a 12 mesi.** L'informativa privacy dichiara una conservazione massima di 12 mesi per le richieste di contatto: attivare `deploy/pulizia-12-mesi.sql` (evento MySQL, richiede `event_scheduler=ON`) oppure un cron con la stessa `DELETE`.

**d) Email.** In `contatti/invia.php` controllare le due costanti in cima: `DESTINATARIO` (`info@kitty.it`) e `MITTENTE` (`noreply@kitty.it`, deve appartenere al dominio con SPF/DKIM validi, altrimenti la posta finisce in spam). Provare un invio dal sito.

**e) Leggere le richieste:**
```bash
mysql -u kitty_admin -p kitty -e "SELECT id, creata_il, azienda, nome, cognome, email, richiesta, email_inviata FROM richieste_contatti ORDER BY id DESC"
```
(`email_inviata = 0` significa che la richiesta è stata salvata ma l'email non è partita.)

## 4. Dopo la pubblicazione
1. Aprire https://www.kitty.it/ e https://www.kitty.it/en/ e controllare il selettore IT | EN.
2. Verificare i redirect: `http://kitty.it` → `https://www.kitty.it`, `/?lang=en` → `/en/`, `/portfolio-tag/lady/` → `/lady/`.
3. Verificare un URL inesistente (404 italiano) e `/en/nonesiste/` (404 inglese).
4. Search Console: aggiungere la proprietà, inviare `https://www.kitty.it/sitemap.xml`, controllare dopo qualche giorno copertura e Core Web Vitals.
5. Rilanciare Lighthouse (mobile) sul sito vero.

## 5. Aggiornare il sito
Modificare i file in `src/`, poi `npm run build` e ricaricare `dist/`.
Foto nuove: metterle in `foto-originali/<cartella>/` e lanciare `npm run img` (e `npm run og` se cambiano le immagini social).
