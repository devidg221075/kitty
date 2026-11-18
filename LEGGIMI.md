# Pacchetto Kitty per Claude Code

## Cosa c'è dentro
- `CLAUDE.md` – il brief completo: Claude Code lo legge da solo all'avvio (decisioni, URL, design, contenuti, checklist)
- `design/tavola-pink-editorial-01.png` – la tavola grafica vincolante
- `design/riferimento/home-desktop.html` e `home-mobile.html` – i mockup della variante A, apribili nel browser
- `assets/logo-kitty.png` – logo con sfondo trasparente (estratto dalla tavola)
- `assets/placeholder/` – immagini illustrative ritagliate dalla tavola (provvisorie)
- `content/scarica-foto.sh` – scarica le foto vere da www.kitty.it

## Come partire
1. Scompatta lo zip in una cartella, per esempio `~/Siti/kitty`.
2. Apri quella cartella in Claude Code.
3. Incolla questo primo messaggio:

> Leggi CLAUDE.md e costruisci il nuovo sito di Kitty. Prima esegui `bash content/scarica-foto.sh` per avere
> le foto vere, poi crea la base (build.mjs, partial, CSS, JS) e la home fedele a design/riferimento/home-desktop.html,
> fammela vedere in locale e solo dopo procedi con le altre pagine. Le domande aperte fammele una alla volta,
> con le opzioni.
