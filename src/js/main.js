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
  document.querySelectorAll('[data-slider]').forEach((root) => {
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
})();
