#!/usr/bin/env bash
# Scarica le foto reali dal sito attuale www.kitty.it in foto-originali/
# Uso:  bash content/scarica-foto.sh      (dalla cartella principale del progetto)
set -u
BASE="https://www.kitty.it"
OUT="foto-originali"
mkdir -p "$OUT"

get() {  # get <url> <file>
  [ -s "$2" ] && return 0
  curl -fsSL --retry 2 --max-time 60 -o "$2" "$1" && echo "  ok  $2" || echo "  ERR $1"
}

echo "1) Copertine collezioni (home attuale)"
mkdir -p "$OUT/copertine"
while read -r slug url; do
  get "$url" "$OUT/copertine/$slug.jpg"
done <<'EOF'
lady https://www.kitty.it/wp-content/uploads/2016/09/lady-1.jpg
baby https://www.kitty.it/wp-content/uploads/2016/09/baby.jpg
fantasy https://www.kitty.it/wp-content/uploads/2016/09/fantasy-1.jpg
full-gold https://www.kitty.it/wp-content/uploads/2016/09/full_gold-1.jpg
lightness https://www.kitty.it/wp-content/uploads/2016/09/lightness.jpg
baby-bangles https://www.kitty.it/wp-content/uploads/2016/09/baby_bangle_1.jpg
baby-pins https://www.kitty.it/wp-content/uploads/2016/09/baby_pins.jpg
rosari https://www.kitty.it/wp-content/uploads/2016/09/rosari.jpg
EOF

echo "2) Gallerie di ogni collezione e pagine About (estratte dall'HTML)"
for slug in lady baby fantasy full-gold lightness baby-bangles baby-pins rosari \
            design progettazione lavorazione produzione premiere-2016 premiere-2019-menzione-speciale le-fiere about-kitty; do
  mkdir -p "$OUT/$slug"
  html=$(curl -fsSL --max-time 60 "$BASE/$slug/") || { echo "  ERR pagina $slug"; continue; }
  # immagini a piena risoluzione: scarta miniature -WxH, loghi e grafiche del tema
  echo "$html" | grep -oE 'https?://(www\.)?kitty\.it/wp-content/uploads/[^"'"'"' )]+\.(jpe?g|png)' \
    | grep -vE -- '-[0-9]+x[0-9]+\.(jpe?g|png)$' \
    | grep -viE 'kitty[-_]?(2|light)|logo|round-1|flags' \
    | sed 's#^http://#https://#' | sort -u > "$OUT/$slug/_elenco.txt"
  n=0
  while read -r url; do
    [ -z "$url" ] && continue
    get "$url" "$OUT/$slug/$(basename "$url")"; n=$((n+1))
  done < "$OUT/$slug/_elenco.txt"
  echo "  $slug: $n immagini"
done

echo "Fatto. Foto in $OUT/ (controlla gli ERR sopra)."
