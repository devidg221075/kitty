<?php
// Copiare come  kitty-config.php  UN LIVELLO SOPRA la cartella pubblica (es. /var/www/kitty/kitty-config.php,
// con il sito in /var/www/kitty/dist), oppure indicarne il percorso con la variabile d'ambiente KITTY_CONFIG.
// Non va mai caricato nella cartella pubblica né committato (è nel .gitignore).
return [
    'db' => [
        'dsn'  => 'mysql:host=localhost;dbname=kitty;charset=utf8mb4',
        'user' => 'kitty_web',          // utente con solo INSERT (vedi deploy/schema.sql)
        'pass' => 'CAMBIA-QUESTA-PASSWORD',
    ],
];
