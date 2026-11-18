<?php
// Template delle email del modulo contatti (HTML con tabelle e stili in linea: compatibile con Gmail, Outlook, Apple Mail).
// Non è raggiungibile direttamente: viene incluso da invia.php.
if (!defined('KITTY_FORM')) { http_response_code(404); exit; }

function h(string $s): string { return htmlspecialchars($s, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8'); }

const KITTY_TESTI = [
    'it' => [
        'oggetto_cliente' => 'Abbiamo ricevuto la tua richiesta – Kitty',
        'preheader'       => 'Grazie per averci scritto: ti risponderemo al più presto.',
        'saluto'          => 'Grazie, %s!',
        'intro'           => 'Abbiamo ricevuto la tua richiesta e ti risponderemo al più presto.',
        'riepilogo'       => 'Il riepilogo della tua richiesta',
        'azienda'         => 'Azienda', 'referente' => 'Referente', 'email' => 'Email', 'messaggio' => 'Messaggio',
        'aggiungi'        => 'Vuoi aggiungere qualcosa? Rispondi a questa email oppure contattaci:',
        'telefono'        => 'Telefono',
        'bottone'         => 'Visita il sito',
        'firma'           => 'A presto,',
        'firma2'          => 'il team Kitty',
        'kicker'          => 'Oreficeria e alta gioielleria italiana',
        'motivo'          => 'Hai ricevuto questo messaggio perché hai compilato il modulo contatti su www.kitty.it.',
        'privacy'         => 'Informativa sulla privacy',
        'url_privacy'     => 'https://www.kitty.it/privacy/',
        'url_sito'        => 'https://www.kitty.it/',
        'piva'            => 'P.IVA / C.F.',
        'oggetto_kitty'   => 'Richiesta dal sito – %s',
        'notifica_titolo' => 'Nuova richiesta dal sito',
        'notifica_pre'    => 'Richiesta da %s',
        'rispondi'        => 'Rispondi al cliente',
        'lingua_sito'     => 'Lingua del sito',
        'consenso'        => 'Consenso privacy',
        'consenso_si'     => 'sì',
        'ricevuta'        => 'Ricevuta il',
        'lang_nome'       => 'italiano',
    ],
    'en' => [
        'oggetto_cliente' => 'We have received your request – Kitty',
        'preheader'       => 'Thank you for writing to us: we will reply as soon as possible.',
        'saluto'          => 'Thank you, %s!',
        'intro'           => 'We have received your request and we will reply as soon as possible.',
        'riepilogo'       => 'Summary of your request',
        'azienda'         => 'Company', 'referente' => 'Contact', 'email' => 'Email', 'messaggio' => 'Message',
        'aggiungi'        => 'Would you like to add something? Reply to this email or contact us:',
        'telefono'        => 'Phone',
        'bottone'         => 'Visit the website',
        'firma'           => 'Speak soon,',
        'firma2'          => 'the Kitty team',
        'kicker'          => 'Italian goldsmith craft and fine jewellery',
        'motivo'          => 'You are receiving this message because you filled in the contact form on www.kitty.it.',
        'privacy'         => 'Privacy notice',
        'url_privacy'     => 'https://www.kitty.it/en/privacy/',
        'url_sito'        => 'https://www.kitty.it/en/',
        'piva'            => 'VAT no. / Tax code',
        'oggetto_kitty'   => 'Request from the website – %s',
        'notifica_titolo' => 'New request from the website',
        'notifica_pre'    => 'Request from %s',
        'rispondi'        => 'Reply to the customer',
        'lingua_sito'     => 'Website language',
        'consenso'        => 'Privacy consent',
        'consenso_si'     => 'yes',
        'ricevuta'        => 'Received on',
        'lang_nome'       => 'English',
    ],
];

// colori del design system
const C_ROSA = '#E85E89'; const C_TITOLO = '#E4557F'; const C_TESTO_ROSA = '#C23A67';
const C_BLUSH = '#FFF1F5'; const C_LINEA = '#F6D9E3'; const C_TESTO = '#232024'; const C_TESTO2 = '#4A4246'; const C_TESTO3 = '#6B6266';
const F_SERIF = "Georgia,'Times New Roman',serif"; const F_SANS = "Helvetica,Arial,sans-serif";

/** Contenitore comune: sfondo blush, card bianca 600px, barra rosa, logo, tricolore, piè di pagina. */
function email_cornice(string $contenuto, string $preheader, string $lang, bool $conLogo, string $piede): string
{
    $t = KITTY_TESTI[$lang];
    $logo = $conLogo
        ? '<img src="cid:logo-kitty" width="120" alt="Kitty" style="display:block;margin:0 auto;border:0;outline:none;height:auto;width:120px;font-family:' . F_SERIF . ';font-size:34px;color:' . C_TESTO_ROSA . ';">'
        : '<span style="font-family:' . F_SERIF . ';font-size:34px;color:' . C_TESTO_ROSA . ';">Kitty</span>';
    return '<!DOCTYPE html>
<html lang="' . $lang . '" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light only">
<meta name="supported-color-schemes" content="light only">
<title>' . h($t['oggetto_cliente']) . '</title>
</head>
<body style="margin:0;padding:0;background-color:' . C_BLUSH . ';-webkit-text-size-adjust:100%;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:' . C_BLUSH . ';font-size:1px;line-height:1px;">' . h($preheader) . str_repeat('&#8199;&zwnj;', 40) . '</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="' . C_BLUSH . '" style="background-color:' . C_BLUSH . ';">
<tr><td align="center" style="padding:24px 12px;">
  <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background-color:#FFFFFF;">
    <tr><td height="4" bgcolor="' . C_ROSA . '" style="height:4px;line-height:4px;font-size:0;background-color:' . C_ROSA . ';">&nbsp;</td></tr>
    <tr><td align="center" style="padding:30px 24px 8px 24px;">' . $logo . '</td></tr>
    <tr><td align="center" style="padding:0 24px 24px 24px;font-family:' . F_SANS . ';font-size:12px;letter-spacing:3px;text-transform:uppercase;color:' . C_TESTO . ';font-weight:bold;">' . h($t['kicker']) . '</td></tr>
    <tr><td style="padding:0 36px 8px 36px;font-family:' . F_SANS . ';font-size:16px;line-height:25px;color:' . C_TESTO2 . ';">' . $contenuto . '</td></tr>
    <tr><td align="center" style="padding:20px 24px 28px 24px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center"><tr>
        <td width="40" height="3" bgcolor="#1E8A4C" style="height:3px;line-height:3px;font-size:0;background-color:#1E8A4C;">&nbsp;</td>
        <td width="40" height="3" bgcolor="#E9E4E4" style="height:3px;line-height:3px;font-size:0;background-color:#E9E4E4;">&nbsp;</td>
        <td width="40" height="3" bgcolor="#D7263D" style="height:3px;line-height:3px;font-size:0;background-color:#D7263D;">&nbsp;</td>
      </tr></table>
    </td></tr>
    <tr><td bgcolor="' . C_BLUSH . '" style="background-color:' . C_BLUSH . ';padding:22px 36px 26px 36px;font-family:' . F_SANS . ';font-size:12px;line-height:19px;color:' . C_TESTO3 . ';text-align:center;">' . $piede . '</td></tr>
  </table>
</td></tr>
</table>
</body>
</html>';
}

function email_piede_azienda(string $lang): string
{
    $t = KITTY_TESTI[$lang];
    return '<strong style="color:' . C_TESTO2 . ';">KITTY S.r.l.</strong><br>Via La Chianicella, 50/A · Loc. Ceciliano · 52100 Arezzo (AR)<br>' . h($t['piva']) . ' 01356350510';
}

/** Riga etichetta/valore del riepilogo. */
function email_riga(string $etichetta, string $valoreHtml): string
{
    return '<tr><td valign="top" width="140" style="padding:7px 12px 7px 0;font-family:' . F_SANS . ';font-size:11px;letter-spacing:2px;text-transform:uppercase;color:' . C_TESTO3 . ';">' . h($etichetta) . '</td>'
         . '<td valign="top" style="padding:7px 0;font-family:' . F_SANS . ';font-size:15px;line-height:22px;color:' . C_TESTO . ';">' . $valoreHtml . '</td></tr>';
}

/** Email di conferma al cliente. */
function email_cliente_html(array $d, string $lang, bool $conLogo): string
{
    $t = KITTY_TESTI[$lang];
    $msg = mb_strlen($d['richiesta']) > 600 ? mb_substr($d['richiesta'], 0, 600) . '…' : $d['richiesta'];
    $righe = email_riga($t['azienda'], h($d['azienda']))
           . email_riga($t['referente'], h($d['nome'] . ' ' . $d['cognome']))
           . email_riga($t['email'], '<a href="mailto:' . h($d['email']) . '" style="color:' . C_TESTO_ROSA . ';text-decoration:none;">' . h($d['email']) . '</a>')
           . email_riga($t['messaggio'], nl2br(h($msg), false));
    $contenuto = '
      <h1 style="margin:0 0 14px 0;font-family:' . F_SERIF . ';font-weight:normal;font-size:34px;line-height:40px;color:' . C_TITOLO . ';">' . h(sprintf($t['saluto'], $d['nome'])) . '</h1>
      <p style="margin:0 0 26px 0;font-family:' . F_SERIF . ';font-style:italic;font-size:19px;line-height:28px;color:#3A3336;">' . h($t['intro']) . '</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 26px 0;">
        <tr><td bgcolor="' . C_BLUSH . '" style="background-color:' . C_BLUSH . ';border-left:3px solid ' . C_ROSA . ';padding:18px 20px;">
          <p style="margin:0 0 8px 0;font-family:' . F_SANS . ';font-size:12px;letter-spacing:3px;text-transform:uppercase;color:' . C_TESTO_ROSA . ';font-weight:bold;">' . h($t['riepilogo']) . '</p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">' . $righe . '</table>
        </td></tr>
      </table>
      <p style="margin:0 0 10px 0;">' . h($t['aggiungi']) . '</p>
      <p style="margin:0 0 28px 0;font-size:16px;line-height:26px;">
        <strong style="color:' . C_TESTO . ';">' . h($t['telefono']) . '</strong> <a href="tel:+390575907004" style="color:' . C_TESTO_ROSA . ';text-decoration:none;">+39&nbsp;0575&nbsp;907004</a><br>
        <strong style="color:' . C_TESTO . ';">Email</strong> <a href="mailto:info@kitty.it" style="color:' . C_TESTO_ROSA . ';text-decoration:none;">info@kitty.it</a>
      </p>
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 28px 0;"><tr>
        <td bgcolor="' . C_TESTO_ROSA . '" style="background-color:' . C_TESTO_ROSA . ';">
          <a href="' . h($t['url_sito']) . '" style="display:inline-block;padding:14px 28px;font-family:' . F_SANS . ';font-size:14px;letter-spacing:2px;text-transform:uppercase;font-weight:bold;color:#FFFFFF;text-decoration:none;">' . h($t['bottone']) . '</a>
        </td>
      </tr></table>
      <p style="margin:0;font-family:' . F_SERIF . ';font-size:18px;line-height:26px;color:' . C_TESTO . ';">' . h($t['firma']) . '<br><em>' . h($t['firma2']) . '</em></p>';
    $piede = email_piede_azienda($lang) . '<br><br>' . h($t['motivo']) . '<br><a href="' . h($t['url_privacy']) . '" style="color:' . C_TESTO_ROSA . ';">' . h($t['privacy']) . '</a>';
    return email_cornice($contenuto, $t['preheader'], $lang, $conLogo, $piede);
}

function email_cliente_testo(array $d, string $lang): string
{
    $t = KITTY_TESTI[$lang];
    $msg = mb_strlen($d['richiesta']) > 600 ? mb_substr($d['richiesta'], 0, 600) . '…' : $d['richiesta'];
    return "KITTY – " . $t['kicker'] . "\r\n\r\n"
         . sprintf($t['saluto'], $d['nome']) . "\r\n" . $t['intro'] . "\r\n\r\n"
         . "— " . $t['riepilogo'] . " —\r\n"
         . $t['azienda'] . ": " . $d['azienda'] . "\r\n"
         . $t['referente'] . ": " . $d['nome'] . ' ' . $d['cognome'] . "\r\n"
         . $t['email'] . ": " . $d['email'] . "\r\n"
         . $t['messaggio'] . ":\r\n" . $msg . "\r\n\r\n"
         . $t['aggiungi'] . "\r\n"
         . $t['telefono'] . ": +39 0575 907004\r\nEmail: info@kitty.it\r\n" . $t['url_sito'] . "\r\n\r\n"
         . $t['firma'] . "\r\n" . $t['firma2'] . "\r\n\r\n--\r\n"
         . "KITTY S.r.l. · Via La Chianicella, 50/A · Loc. Ceciliano · 52100 Arezzo (AR) · " . $t['piva'] . " 01356350510\r\n"
         . $t['motivo'] . " " . $t['privacy'] . ": " . $t['url_privacy'] . "\r\n";
}

/** Email di notifica per Kitty (sempre in italiano). */
function email_notifica_html(array $d, string $lang, string $quando, bool $conLogo): string
{
    $t = KITTY_TESTI['it'];
    $righe = email_riga($t['azienda'], h($d['azienda']))
           . email_riga($t['referente'], h($d['nome'] . ' ' . $d['cognome']))
           . email_riga($t['email'], '<a href="mailto:' . h($d['email']) . '" style="color:' . C_TESTO_ROSA . ';text-decoration:none;">' . h($d['email']) . '</a>')
           . email_riga($t['lingua_sito'], h(KITTY_TESTI[$lang]['lang_nome']))
           . email_riga($t['consenso'], h($t['consenso_si']) . ' – ' . h($quando));
    $contenuto = '
      <h1 style="margin:0 0 18px 0;font-family:' . F_SERIF . ';font-weight:normal;font-size:30px;line-height:36px;color:' . C_TITOLO . ';">' . h($t['notifica_titolo']) . '</h1>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 18px 0;border-top:1px solid ' . C_LINEA . ';border-bottom:1px solid ' . C_LINEA . ';">
        <tr><td style="padding:10px 0;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">' . $righe . '</table></td></tr>
      </table>
      <p style="margin:0 0 8px 0;font-family:' . F_SANS . ';font-size:12px;letter-spacing:3px;text-transform:uppercase;color:' . C_TESTO_ROSA . ';font-weight:bold;">' . h($t['messaggio']) . '</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 26px 0;"><tr>
        <td bgcolor="' . C_BLUSH . '" style="background-color:' . C_BLUSH . ';border-left:3px solid ' . C_ROSA . ';padding:16px 20px;font-family:' . F_SANS . ';font-size:16px;line-height:25px;color:' . C_TESTO . ';">' . nl2br(h($d['richiesta']), false) . '</td>
      </tr></table>
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 8px 0;"><tr>
        <td bgcolor="' . C_TESTO_ROSA . '" style="background-color:' . C_TESTO_ROSA . ';">
          <a href="mailto:' . h($d['email']) . '?subject=' . rawurlencode('Re: ' . sprintf($t['oggetto_kitty'], $d['azienda'])) . '" style="display:inline-block;padding:14px 28px;font-family:' . F_SANS . ';font-size:14px;letter-spacing:2px;text-transform:uppercase;font-weight:bold;color:#FFFFFF;text-decoration:none;">' . h($t['rispondi']) . '</a>
        </td>
      </tr></table>';
    $piede = 'Messaggio generato dal modulo contatti di www.kitty.it. Rispondendo a questa email, la risposta arriva direttamente al cliente.';
    return email_cornice($contenuto, sprintf($t['notifica_pre'], $d['azienda']), 'it', $conLogo, $piede);
}

function email_notifica_testo(array $d, string $lang, string $quando): string
{
    $t = KITTY_TESTI['it'];
    return "Nuova richiesta dal modulo contatti di www.kitty.it\r\n\r\n"
         . $t['azienda'] . ": " . $d['azienda'] . "\r\n"
         . $t['referente'] . ": " . $d['nome'] . ' ' . $d['cognome'] . "\r\n"
         . $t['email'] . ": " . $d['email'] . "\r\n"
         . $t['lingua_sito'] . ": " . KITTY_TESTI[$lang]['lang_nome'] . "\r\n\r\n"
         . $t['messaggio'] . ":\r\n" . $d['richiesta'] . "\r\n\r\n"
         . $t['consenso'] . ": " . $t['consenso_si'] . " – " . $quando . "\r\n";
}

/** Costruisce corpo e header Content-Type di un messaggio multipart (testo + HTML con logo inline). */
function email_mime(string $testo, string $html, ?string $logoPng): array
{
    $b1 = 'kitty-alt-' . bin2hex(random_bytes(8));
    $testo = preg_replace('/\r\n|\r|\n/', "\r\n", $testo) ?? $testo;
    $html  = preg_replace('/\r\n|\r|\n/', "\r\n", $html) ?? $html;
    $corpo = "--$b1\r\nContent-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: quoted-printable\r\n\r\n"
           . quoted_printable_encode($testo) . "\r\n";
    if ($logoPng !== null) {
        $b2 = 'kitty-rel-' . bin2hex(random_bytes(8));
        $corpo .= "--$b1\r\nContent-Type: multipart/related; type=\"text/html\"; boundary=\"$b2\"\r\n\r\n"
                . "--$b2\r\nContent-Type: text/html; charset=UTF-8\r\nContent-Transfer-Encoding: quoted-printable\r\n\r\n"
                . quoted_printable_encode($html) . "\r\n"
                . "--$b2\r\nContent-Type: image/png; name=\"logo-kitty.png\"\r\nContent-Transfer-Encoding: base64\r\nContent-ID: <logo-kitty>\r\nContent-Disposition: inline; filename=\"logo-kitty.png\"\r\n\r\n"
                . chunk_split(base64_encode($logoPng), 76, "\r\n")
                . "--$b2--\r\n";
    } else {
        $corpo .= "--$b1\r\nContent-Type: text/html; charset=UTF-8\r\nContent-Transfer-Encoding: quoted-printable\r\n\r\n"
                . quoted_printable_encode($html) . "\r\n";
    }
    $corpo .= "--$b1--\r\n";
    return ["multipart/alternative; boundary=\"$b1\"", $corpo];
}
