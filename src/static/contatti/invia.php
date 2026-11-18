<?php
// Endpoint del modulo contatti di www.kitty.it
// - validazione lato server, honeypot + tempo minimo di compilazione (niente CAPTCHA)
// - salva la richiesta in MySQL (se c'è il file di configurazione) e invia una email a DESTINATARIO
//   Il modulo risulta "inviato" se almeno una delle due operazioni riesce: una richiesta non va persa
//   se la posta ha problemi, né se il database non risponde.
// - risponde JSON se la richiesta arriva via fetch (Accept: application/json), altrimenti reindirizza a /contatti/?esito=...
// Configurazione database: file kitty-config.php FUORI dalla cartella pubblica (vedi DEPLOY.md e deploy/).
declare(strict_types=1);

const DESTINATARIO = 'info@kitty.it';
const MITTENTE     = 'noreply@kitty.it';   // deve essere un indirizzo del dominio dell'hosting (SPF/DKIM)
const TEMPO_MIN    = 4;                    // secondi minimi tra caricamento pagina e invio
const TEMPO_MAX    = 86400;                // oltre 24 ore il modulo è considerato scaduto

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

// ---------- database (facoltativo) ----------
function db(): ?PDO {
    static $pdo = false;
    if ($pdo !== false) return $pdo;
    $pdo = null;
    $candidati = [
        getenv('KITTY_CONFIG') ?: '',
        dirname(rtrim((string)($_SERVER['DOCUMENT_ROOT'] ?? ''), '/')) . '/kitty-config.php', // un livello sopra la cartella pubblica
    ];
    foreach ($candidati as $percorso) {
        if ($percorso === '' || !is_file($percorso)) continue;
        $cfg = require $percorso;
        $db = is_array($cfg) ? ($cfg['db'] ?? null) : null;
        if (!is_array($db) || empty($db['dsn'])) return null;
        try {
            $pdo = new PDO((string)$db['dsn'], (string)($db['user'] ?? ''), (string)($db['pass'] ?? ''), [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_EMULATE_PREPARES => false,
                PDO::ATTR_TIMEOUT => 3,
            ]);
        } catch (Throwable $e) {
            error_log('[kitty-contatti] connessione DB: ' . $e->getMessage());
            $pdo = null;
        }
        return $pdo;
    }
    return null;
}

function salva_richiesta(array $d, string $lang): ?int {
    $pdo = db();
    if (!$pdo) return null;
    try {
        $st = $pdo->prepare('INSERT INTO richieste_contatti (lingua, azienda, nome, cognome, email, richiesta, consenso_privacy)
                             VALUES (?, ?, ?, ?, ?, ?, 1)');
        $st->execute([$lang, $d['azienda'], $d['nome'], $d['cognome'], $d['email'], $d['richiesta']]);
        return (int)$pdo->lastInsertId();
    } catch (Throwable $e) {
        error_log('[kitty-contatti] salvataggio: ' . $e->getMessage());
        return null;
    }
}

function segna_email_inviata(int $id): void {
    try {
        db()?->prepare('UPDATE richieste_contatti SET email_inviata = 1 WHERE id = ?')->execute([$id]);
    } catch (Throwable $e) {
        error_log('[kitty-contatti] aggiornamento stato email: ' . $e->getMessage());
    }
}

// ---------- email ----------
function invia_email(array $d, string $lang, ?int $id): bool {
    $oggetto = 'Richiesta dal sito – ' . $d['azienda'];
    $corpo = "Nuova richiesta dal modulo contatti di www.kitty.it" . ($id ? " (n. $id)" : '') . "\r\n\r\n"
           . "Azienda: {$d['azienda']}\r\n"
           . "Referente: {$d['nome']} {$d['cognome']}\r\n"
           . "Email: {$d['email']}\r\n\r\n"
           . "Richiesta:\r\n{$d['richiesta']}\r\n\r\n"
           . "Lingua del sito: $lang\r\n"
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

$id = salva_richiesta($d, $lang);
$inviata = invia_email($d, $lang, $id);
if ($inviata && $id !== null) segna_email_inviata($id);
if (!$inviata) error_log('[kitty-contatti] email non inviata' . ($id ? " (richiesta $id salvata nel database)" : ' e richiesta non salvata'));

$ok = $inviata || $id !== null;     // basta una delle due: la richiesta non è andata persa
risposta($ok, $ok ? [] : ['invio' => $m['invio']], $vuoleJson);
