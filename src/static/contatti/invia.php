<?php
// Endpoint del modulo contatti di www.kitty.it  (solo email, nessun database)
//  1) validazione lato server + anti-spam (campo trappola, tempo minimo, limite per IP) senza CAPTCHA
//  2) email di NOTIFICA a Kitty (DESTINATARIO), con Reply-To = cliente
//  3) email di CONFERMA grafica al cliente, nella sua lingua (italiano/inglese)
// risponde JSON se la richiesta arriva via fetch (Accept: application/json), altrimenti reindirizza a /contatti/?esito=...
declare(strict_types=1);
define('KITTY_FORM', true);
require __DIR__ . '/email-template.php';

const DESTINATARIO = 'info@kitty.it';
const MITTENTE     = 'noreply@kitty.it';   // deve essere un indirizzo del dominio del server (SPF/DKIM validi)
const RISPONDI_A   = 'info@kitty.it';      // indirizzo a cui arrivano le risposte del cliente alla conferma
const TEMPO_MIN    = 4;                    // secondi minimi tra caricamento pagina e invio
const TEMPO_MAX    = 86400;                // oltre 24 ore il modulo è considerato scaduto
const MAX_INVII_ORA = 5;                   // richieste massime per indirizzo IP in un'ora

const MSG = [
    'it' => [
        'azienda' => 'Indica il nome dell’azienda.', 'nome' => 'Indica il tuo nome.', 'cognome' => 'Indica il tuo cognome.',
        'email' => 'Inserisci un indirizzo email valido.', 'email2' => 'Le due email non coincidono.',
        'richiesta' => 'Descrivi la tua richiesta (almeno 10 caratteri).',
        'privacy' => 'Per inviare la richiesta serve il consenso al trattamento dei dati.',
        'invio' => 'Non è stato possibile inviare il messaggio. Riprova o scrivi a info@kitty.it.',
    ],
    'en' => [
        'azienda' => 'Enter your company name.', 'nome' => 'Enter your first name.', 'cognome' => 'Enter your last name.',
        'email' => 'Enter a valid email address.', 'email2' => 'The two email addresses do not match.',
        'richiesta' => 'Describe your request (at least 10 characters).',
        'privacy' => 'To send your request we need your consent to the processing of your data.',
        'invio' => 'The message could not be sent. Please try again or write to info@kitty.it.',
    ],
];

$lang = (($_POST['lang'] ?? '') === 'en') ? 'en' : 'it';
$vuoleJson = isset($_SERVER['HTTP_ACCEPT']) && str_contains($_SERVER['HTTP_ACCEPT'], 'application/json');

function risposta(bool $ok, array $errori, bool $json, string $codice = ''): never {
    global $lang;
    if ($json) {
        header('Content-Type: application/json; charset=utf-8');
        http_response_code($ok ? 200 : ($codice === 'spam' ? 200 : 422));
        echo json_encode(['ok' => $ok, 'errori' => $errori], JSON_UNESCAPED_UNICODE);
    } else {
        header('Location: ' . ($lang === 'en' ? '/en/contatti/' : '/contatti/') . '?esito=' . ($ok ? 'ok' : 'errore') . '#esito', true, 303);
    }
    exit;
}

function pulisci(?string $v, int $max): string {
    $v = trim((string)$v);
    $v = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u', '', $v) ?? '';
    return mb_substr($v, 0, $max);
}

/** Limite per IP senza database: un piccolo file nella cartella temporanea del sistema. Restituisce false se superato. */
function entro_il_limite(): bool {
    $ip = (string)($_SERVER['REMOTE_ADDR'] ?? 'x');
    $file = sys_get_temp_dir() . '/kitty-contatti-' . hash('sha256', $ip . '|kitty') . '.json';
    $ora = time();
    $fp = @fopen($file, 'c+');
    if (!$fp) return true;                         // se non si può scrivere, non blocchiamo
    flock($fp, LOCK_EX);
    $dati = json_decode((string)stream_get_contents($fp), true);
    $invii = array_values(array_filter(is_array($dati) ? $dati : [], fn($t) => is_int($t) && $t > $ora - 3600));
    $ok = count($invii) < MAX_INVII_ORA;
    if ($ok) $invii[] = $ora;
    ftruncate($fp, 0); rewind($fp); fwrite($fp, json_encode($invii));
    flock($fp, LOCK_UN); fclose($fp);
    return $ok;
}

function logo_png(): ?string {
    $percorso = dirname(__DIR__) . '/img/brand/logo-kitty.png';
    $dati = is_file($percorso) ? @file_get_contents($percorso) : false;
    return $dati === false ? null : $dati;
}

function invia(string $a, string $oggetto, array $mime, string $daNome, string $replyTo): bool {
    [$tipo, $corpo] = $mime;
    $headers = [
        'From: ' . mb_encode_mimeheader($daNome, 'UTF-8') . ' <' . MITTENTE . '>',
        'Reply-To: ' . $replyTo,                       // già validato (niente a-capo possibili)
        'MIME-Version: 1.0',
        'Content-Type: ' . $tipo,
        'X-Mailer: kitty-contatti',
    ];
    return mail($a, mb_encode_mimeheader($oggetto, 'UTF-8'), $corpo, implode("\r\n", $headers));
}

// ---------- richiesta ----------
if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    header('Location: /contatti/', true, 303);
    exit;
}

// anti-spam: se è un bot rispondiamo "ok" senza fare nulla
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

$m = MSG[$lang];
$err = [];
if ($d['azienda'] === '')   $err['azienda'] = $m['azienda'];
if ($d['nome'] === '')      $err['nome'] = $m['nome'];
if ($d['cognome'] === '')   $err['cognome'] = $m['cognome'];
if (!filter_var($d['email'], FILTER_VALIDATE_EMAIL)) $err['email'] = $m['email'];
elseif (strcasecmp($d['email'], $d['email2']) !== 0) $err['email2'] = $m['email2'];
if (mb_strlen($d['richiesta']) < 10) $err['richiesta'] = $m['richiesta'];
if (($_POST['privacy'] ?? '') !== '1') $err['privacy'] = $m['privacy'];

if ($err) risposta(false, $err, $vuoleJson);

if (!entro_il_limite()) {
    error_log('[kitty-contatti] limite di invii per IP superato');
    risposta(false, ['invio' => $m['invio']], $vuoleJson);
}

$logo = logo_png();
$quando = date('d/m/Y H:i');
$tn = KITTY_TESTI['it'];

// 1) notifica a Kitty: se non parte, la richiesta non è stata consegnata -> errore al visitatore
$notificata = invia(
    DESTINATARIO,
    sprintf($tn['oggetto_kitty'], $d['azienda']),
    email_mime(email_notifica_testo($d, $lang, $quando), email_notifica_html($d, $lang, $quando, $logo !== null), $logo),
    'Sito Kitty',
    $d['email']
);
if (!$notificata) {
    error_log('[kitty-contatti] notifica a Kitty non inviata');
    risposta(false, ['invio' => $m['invio']], $vuoleJson);
}

// 2) conferma grafica al cliente (se non parte, lo registriamo ma la richiesta è comunque arrivata)
$conferma = invia(
    $d['email'],
    KITTY_TESTI[$lang]['oggetto_cliente'],
    email_mime(email_cliente_testo($d, $lang), email_cliente_html($d, $lang, $logo !== null), $logo),
    'Kitty',
    RISPONDI_A
);
if (!$conferma) error_log('[kitty-contatti] conferma al cliente non inviata');

risposta(true, [], $vuoleJson);
