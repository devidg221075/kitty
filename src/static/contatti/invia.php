<?php
// Endpoint del modulo contatti di www.kitty.it
// - validazione lato server, honeypot + tempo minimo di compilazione (niente CAPTCHA)
// - invia una email a DESTINATARIO con mail(); se l'hosting richiede SMTP, sostituire la funzione invia_email()
// - risponde JSON se la richiesta arriva via fetch (Accept: application/json), altrimenti reindirizza a /contatti/?esito=...
declare(strict_types=1);

const DESTINATARIO = 'info@kitty.it';
const MITTENTE     = 'noreply@kitty.it';   // deve essere un indirizzo del dominio dell'hosting (SPF)
const TEMPO_MIN    = 4;                    // secondi minimi tra caricamento pagina e invio
const TEMPO_MAX    = 86400;                // oltre 24 ore il modulo è considerato scaduto

$vuoleJson = isset($_SERVER['HTTP_ACCEPT']) && str_contains($_SERVER['HTTP_ACCEPT'], 'application/json');

function risposta(bool $ok, array $errori, bool $json, string $codice = ''): never {
    if ($json) {
        header('Content-Type: application/json; charset=utf-8');
        http_response_code($ok ? 200 : ($codice === 'spam' ? 200 : 422));
        echo json_encode(['ok' => $ok, 'errori' => $errori], JSON_UNESCAPED_UNICODE);
    } else {
        header('Location: /contatti/?esito=' . ($ok ? 'ok' : 'errore') . '#esito', true, 303);
    }
    exit;
}

function pulisci(?string $v, int $max): string {
    $v = trim((string)$v);
    $v = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u', '', $v) ?? '';
    return mb_substr($v, 0, $max);
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    header('Location: /contatti/', true, 303);
    exit;
}

// anti-spam: se è un bot rispondiamo "ok" senza inviare nulla
$ts = (int)($_POST['ts'] ?? 0);
$trascorso = time() - (int)floor($ts / 1000);
if (($_POST['sito-web'] ?? '') !== '' || $ts <= 0 || $trascorso < TEMPO_MIN || $trascorso > TEMPO_MAX) {
    risposta(true, [], $vuoleJson, 'spam');
}

$d = [
    'azienda'   => pulisci($_POST['azienda'] ?? '', 120),
    'nome'      => pulisci($_POST['nome'] ?? '', 80),
    'cognome'   => pulisci($_POST['cognome'] ?? '', 80),
    'email'     => pulisci($_POST['email'] ?? '', 160),
    'email2'    => pulisci($_POST['email2'] ?? '', 160),
    'richiesta' => pulisci($_POST['richiesta'] ?? '', 4000),
];

$err = [];
if ($d['azienda'] === '')   $err['azienda'] = 'Indica il nome dell’azienda.';
if ($d['nome'] === '')      $err['nome'] = 'Indica il tuo nome.';
if ($d['cognome'] === '')   $err['cognome'] = 'Indica il tuo cognome.';
if (!filter_var($d['email'], FILTER_VALIDATE_EMAIL)) $err['email'] = 'Inserisci un indirizzo email valido.';
elseif (strcasecmp($d['email'], $d['email2']) !== 0) $err['email2'] = 'Le due email non coincidono.';
if (mb_strlen($d['richiesta']) < 10) $err['richiesta'] = 'Descrivi la tua richiesta (almeno 10 caratteri).';
if (($_POST['privacy'] ?? '') !== '1') $err['privacy'] = 'Per inviare la richiesta serve il consenso al trattamento dei dati.';

if ($err) risposta(false, $err, $vuoleJson);

function invia_email(array $d): bool {
    $oggetto = 'Richiesta dal sito – ' . $d['azienda'];
    $corpo = "Nuova richiesta dal modulo contatti di www.kitty.it\r\n\r\n"
           . "Azienda: {$d['azienda']}\r\n"
           . "Referente: {$d['nome']} {$d['cognome']}\r\n"
           . "Email: {$d['email']}\r\n\r\n"
           . "Richiesta:\r\n{$d['richiesta']}\r\n\r\n"
           . "Consenso privacy: sì – " . date('d/m/Y H:i') . "\r\n";
    $headers = [
        'From: Sito Kitty <' . MITTENTE . '>',
        'Reply-To: ' . $d['email'],          // già validata con FILTER_VALIDATE_EMAIL (niente a-capo possibili)
        'MIME-Version: 1.0',
        'Content-Type: text/plain; charset=UTF-8',
        'X-Mailer: kitty-contatti',
    ];
    return mail(DESTINATARIO, mb_encode_mimeheader($oggetto, 'UTF-8'), $corpo, implode("\r\n", $headers));
}

$inviata = invia_email($d);
risposta($inviata, $inviata ? [] : ['invio' => 'Non è stato possibile inviare il messaggio. Riprova o scrivi a info@kitty.it.'], $vuoleJson);
