/* Kitty – JS vanilla: menu mobile, sottomenu, slider hero */
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');

  // ---- Menu mobile ----
  const toggle = document.querySelector('.nav-toggle');
  const nav = document.getElementById('menu-principale');
  const setNav = (open) => {
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Chiudi menu' : 'Apri menu');
    nav.classList.toggle('is-open', open);
  };
  toggle?.addEventListener('click', () => setNav(toggle.getAttribute('aria-expanded') !== 'true'));

  // ---- Sottomenu (click/tastiera; su desktop anche hover via CSS) ----
  const subs = [...document.querySelectorAll('.has-sub')];
  const setSub = (li, open) => {
    li.classList.toggle('is-open', open);
    li.querySelector('.sub-toggle').setAttribute('aria-expanded', String(open));
  };
  subs.forEach((li) => {
    li.querySelector('.sub-toggle').addEventListener('click', () => {
      const open = !li.classList.contains('is-open');
      subs.forEach((o) => setSub(o, false));
      setSub(li, open);
    });
  });
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.has-sub')) subs.forEach((o) => setSub(o, false));
  });
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    const openSub = subs.find((o) => o.classList.contains('is-open'));
    if (openSub) { setSub(openSub, false); openSub.querySelector('.sub-toggle').focus(); return; }
    if (nav?.classList.contains('is-open')) { setNav(false); toggle.focus(); }
  });

  // ---- Slider hero ----
  const initSliders = () => document.querySelectorAll('[data-slider]').forEach((root) => {
    const slides = [...root.querySelectorAll('.slide')];
    const navBox = document.querySelector('[data-slider-nav]');
    const live = root.querySelector('[data-live]');
    if (slides.length < 2) { root.classList.add('slider--single'); navBox?.remove(); return; }

    const interval = Number(root.dataset.interval) || 6000;
    let i = 0, timer = null, paused = false, hold = false;

    // pallini + pausa
    const dots = slides.map((_, n) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('aria-label', `Vai alla slide ${n + 1} di ${slides.length}`);
      b.innerHTML = '<span class="dot"></span>';
      b.addEventListener('click', () => go(n));
      navBox.appendChild(b);
      return b;
    });
    const pauseBtn = document.createElement('button');
    pauseBtn.type = 'button';
    pauseBtn.className = 'pause';
    navBox.appendChild(pauseBtn);
    const paintPause = () => {
      pauseBtn.setAttribute('aria-label', paused ? 'Riprendi scorrimento automatico' : 'Metti in pausa lo scorrimento automatico');
      pauseBtn.innerHTML = paused
        ? '<svg aria-hidden="true" width="14" height="14" viewBox="0 0 14 14" fill="currentColor"><path d="M3 1.5v11l9-5.5z"/></svg>'
        : '<svg aria-hidden="true" width="14" height="14" viewBox="0 0 14 14" fill="currentColor"><path d="M3 1.5h3v11H3zM8 1.5h3v11H8z"/></svg>';
    };
    pauseBtn.addEventListener('click', () => { paused = !paused; paintPause(); schedule(); });

    function go(n, announce = true) {
      i = (n + slides.length) % slides.length;
      slides.forEach((s, k) => {
        s.classList.toggle('is-active', k === i);
        s.setAttribute('aria-hidden', String(k !== i));
      });
      dots.forEach((d, k) => d.setAttribute('aria-current', String(k === i)));
      if (announce && live) live.textContent = `Slide ${i + 1} di ${slides.length}: ${slides[i].querySelector('img')?.alt || ''}`;
      schedule();
    }
    function schedule() {
      clearTimeout(timer);
      if (reduce.matches || paused || hold) return;
      timer = setTimeout(() => go(i + 1, false), interval);
    }
    root.querySelector('[data-prev]').addEventListener('click', () => go(i - 1));
    root.querySelector('[data-next]').addEventListener('click', () => go(i + 1));
    [root, navBox].forEach((el) => {
      el.addEventListener('mouseenter', () => { hold = true; schedule(); });
      el.addEventListener('mouseleave', () => { hold = false; schedule(); });
      el.addEventListener('focusin', () => { hold = true; schedule(); });
      el.addEventListener('focusout', () => { hold = false; schedule(); });
    });
    reduce.addEventListener?.('change', schedule);
    if (reduce.matches) { paused = true; }
    paintPause();
    go(0, false);
  });
  initSliders();
  window.KittyPage = { ...(window.KittyPage || {}), sliders: initSliders };
})();

/* Kitty – lightbox gallerie + modulo contatti */
function kittyInitGalleryAndForm() {
  document.querySelectorAll('dialog.lb').forEach((d) => d.remove());
  // ---- Lightbox con <dialog> nativo (focus trap + Esc) ----
  const links = [...document.querySelectorAll('[data-lightbox]')];
  if (links.length && typeof HTMLDialogElement === 'function') {
    const dlg = document.createElement('dialog');
    dlg.className = 'lb';
    dlg.setAttribute('aria-label', 'Galleria immagini');
    dlg.innerHTML =
      '<button class="lb__btn lb__close" type="button" aria-label="Chiudi"><svg aria-hidden="true" width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 4l12 12M16 4 4 16"/></svg></button>' +
      '<button class="lb__btn lb__prev" type="button" aria-label="Foto precedente"><svg aria-hidden="true" width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M10 3 5 8l5 5"/></svg></button>' +
      '<figure class="lb__fig"><img class="lb__img" alt="" src="data:image/gif;base64,R0lGODlhAQABAAAAACwAAAAAAQABAAA="><figcaption class="lb__cap" aria-live="polite"></figcaption></figure>' +
      '<button class="lb__btn lb__next" type="button" aria-label="Foto successiva"><svg aria-hidden="true" width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M6 3l5 5-5 5"/></svg></button>';
    document.body.appendChild(dlg);
    const img = dlg.querySelector('.lb__img');
    const cap = dlg.querySelector('.lb__cap');
    let i = 0, opener = null;
    const show = (n) => {
      i = (n + links.length) % links.length;
      const a = links[i];
      img.src = a.href;
      img.alt = a.dataset.caption || '';
      cap.textContent = `${a.dataset.caption || ''}`;
      [links[(i + 1) % links.length], links[(i - 1 + links.length) % links.length]].forEach((x) => { new Image().src = x.href; });
    };
    links.forEach((a, n) => a.addEventListener('click', (e) => {
      e.preventDefault(); opener = a; show(n); dlg.showModal();
    }));
    dlg.querySelector('.lb__close').addEventListener('click', () => dlg.close());
    dlg.querySelector('.lb__prev').addEventListener('click', () => show(i - 1));
    dlg.querySelector('.lb__next').addEventListener('click', () => show(i + 1));
    dlg.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') { e.preventDefault(); show(i - 1); }
      if (e.key === 'ArrowRight') { e.preventDefault(); show(i + 1); }
    });
    dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); }); // clic sullo sfondo
    dlg.addEventListener('close', () => opener?.focus());
  }

  // ---- Modulo contatti ----
  const form = document.getElementById('modulo-contatti');
  if (!form) return;
  const status = document.getElementById('esito');
  form.querySelector('#ts').value = String(Date.now());

  const say = (msg, ok) => {
    status.hidden = false;
    status.className = 'form__status ' + (ok ? 'ok' : 'err');
    status.textContent = msg;
    status.focus();
  };
  const clearErrors = () => form.querySelectorAll('.has-error').forEach((f) => { f.classList.remove('has-error'); f.querySelector('.field__err')?.remove(); f.querySelector('[aria-invalid]')?.removeAttribute('aria-invalid'); });
  const setErr = (name, msg) => {
    const input = form.elements[name]; if (!input) return;
    const box = input.closest('.field'); box.classList.add('has-error');
    const id = `err-${name}`;
    const p = document.createElement('p'); p.className = 'field__err'; p.id = id; p.textContent = msg;
    box.appendChild(p);
    input.setAttribute('aria-invalid', 'true'); input.setAttribute('aria-describedby', id);
  };
  const validate = () => {
    const v = (n) => form.elements[n].value.trim();
    const e = {};
    if (!v('azienda')) e.azienda = 'Indica il nome dell’azienda.';
    if (!v('nome')) e.nome = 'Indica il tuo nome.';
    if (!v('cognome')) e.cognome = 'Indica il tuo cognome.';
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v('email'))) e.email = 'Inserisci un indirizzo email valido.';
    else if (v('email').toLowerCase() !== v('email2').toLowerCase()) e.email2 = 'Le due email non coincidono.';
    if (v('richiesta').length < 10) e.richiesta = 'Descrivi la tua richiesta (almeno 10 caratteri).';
    if (!form.elements.privacy.checked) e.privacy = 'Per inviare la richiesta serve il consenso al trattamento dei dati.';
    return e;
  };
  const showErrors = (errs) => {
    clearErrors();
    Object.entries(errs).forEach(([k, m]) => setErr(k, m));
    const first = Object.keys(errs).find((k) => form.elements[k]);
    if (first) form.elements[first].focus();
    say(`Controlla i campi evidenziati (${Object.keys(errs).length}).`, false);
    if (first) form.elements[first].focus();
  };

  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) return showErrors(errs);
    clearErrors();
    const btn = form.querySelector('button[type=submit]');
    btn.disabled = true;
    try {
      const res = await fetch(form.action, { method: 'POST', body: new FormData(form), headers: { Accept: 'application/json' } });
      const data = await res.json();
      if (data.ok) { form.reset(); form.querySelector('#ts').value = String(Date.now()); say('Grazie! La tua richiesta è stata inviata: ti risponderemo al più presto.', true); }
      else if (data.errori && !data.errori.invio) showErrors(data.errori);
      else say(data.errori?.invio || 'Non è stato possibile inviare il messaggio. Riprova o scrivi a info@kitty.it.', false);
    } catch {
      say('Non è stato possibile inviare il messaggio. Riprova o scrivi a info@kitty.it.', false);
    } finally { btn.disabled = false; }
  });

  // esito di un invio senza JavaScript (redirect dal server)
  const esito = new URLSearchParams(location.search).get('esito');
  if (esito === 'ok') say('Grazie! La tua richiesta è stata inviata: ti risponderemo al più presto.', true);
  if (esito === 'errore') say('Non è stato possibile inviare il messaggio. Riprova o scrivi a info@kitty.it.', false);
}
kittyInitGalleryAndForm();
window.KittyPage = { ...(window.KittyPage || {}), galleryAndForm: kittyInitGalleryAndForm };
