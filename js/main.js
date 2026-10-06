/* FitFlow — интерактив лендинга: reveal при скролле, параллакс, счётчик, FAQ, меню */

(function () {
  'use strict';

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Шапка: стекло при скролле + полоса прогресса ---------- */
  const header = document.getElementById('header');
  const progressBar = document.getElementById('progressBar');

  function onScrollUI() {
    const y = window.scrollY;
    header && header.classList.toggle('scrolled', y > 24);

    if (progressBar) {
      const h = document.documentElement.scrollHeight - window.innerHeight;
      progressBar.style.width = (h > 0 ? (y / h) * 100 : 0) + '%';
    }
  }

  /* ---------- Ступенчатая задержка для групп карточек ---------- */
  document.querySelectorAll('[data-stagger]').forEach((group) => {
    const items = group.querySelectorAll('.reveal');
    items.forEach((el, i) => {
      if (!el.style.getPropertyValue('--d')) {
        el.style.setProperty('--d', (i * 0.1).toFixed(2) + 's');
      }
    });
  });

  /* ---------- Появление блоков при скролле ---------- */
  const revealEls = document.querySelectorAll('.reveal, .reveal-left, .reveal-right, .reveal-scale');

  if (reduced || !('IntersectionObserver' in window)) {
    revealEls.forEach((el) => el.classList.add('in'));
  } else {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -7% 0px' });

    revealEls.forEach((el) => io.observe(el));
  }

  /* ---------- Параллакс: скролл + курсор в герое ---------- */
  const fx = Array.from(document.querySelectorAll('[data-para],[data-mouse]')).map((el) => ({
    el,
    sp: parseFloat(el.dataset.para || 0),   // скорость скролл-параллакса
    depth: parseFloat(el.dataset.mouse || 0), // глубина реакции на курсор
    sec: el.closest('section, main, header') || document.body,
    sy: 0, mx: 0, my: 0,
    tmx: 0, tmy: 0,
  }));

  function renderFx() {
    for (const f of fx) {
      f.el.style.transform = 'translate3d(' + f.mx.toFixed(1) + 'px,' + (f.sy + f.my).toFixed(1) + 'px,0)';
    }
  }

  function computeScrollFx() {
    const vh = window.innerHeight;
    for (const f of fx) {
      if (!f.sp) continue;
      const r = f.sec.getBoundingClientRect();
      f.sy = (r.top + r.height / 2 - vh / 2) * f.sp;
    }
  }

  if (!reduced && fx.length) {
    let ticking = false;
    window.addEventListener('scroll', () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(() => {
          computeScrollFx();
          renderFx();
          ticking = false;
        });
      }
    }, { passive: true });

    const hero = document.querySelector('.hero');
    if (hero) {
      hero.addEventListener('pointermove', (e) => {
        const r = hero.getBoundingClientRect();
        const nx = (e.clientX - r.left) / r.width - 0.5;
        const ny = (e.clientY - r.top) / r.height - 0.5;
        for (const f of fx) {
          if (!f.depth) continue;
          f.tmx = nx * f.depth;
          f.tmy = ny * f.depth * 0.6;
        }
      });

      // плавное «догоняние» цели
      (function loop() {
        let moved = false;
        for (const f of fx) {
          if (!f.depth) continue;
          const dx = f.tmx - f.mx;
          const dy = f.tmy - f.my;
          if (Math.abs(dx) > 0.05 || Math.abs(dy) > 0.05) {
            f.mx += dx * 0.08;
            f.my += dy * 0.08;
            moved = true;
          }
        }
        if (moved) renderFx();
        requestAnimationFrame(loop);
      })();
    }

    computeScrollFx();
    renderFx();
  }

  /* ---------- Таймер «до 23:59 сегодня» ---------- */
  const timers = document.querySelectorAll('[data-countdown]');
  if (timers.length) {
    const pad = (n) => String(n).padStart(2, '0');
    const tick = () => {
      const now = new Date();
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
      const d = Math.max(0, end - now);
      const h = Math.floor(d / 3.6e6);
      const m = Math.floor((d % 3.6e6) / 6e4);
      const s = Math.floor((d % 6e4) / 1e3);
      const t = pad(h) + ':' + pad(m) + ':' + pad(s);
      timers.forEach((el) => (el.textContent = t));
    };
    tick();
    setInterval(tick, 1000);
  }

  /* ---------- FAQ: одновременно открыт только один ---------- */
  const faqs = Array.from(document.querySelectorAll('[data-faq]'));
  faqs.forEach((d) => {
    d.addEventListener('toggle', () => {
      if (d.open) faqs.forEach((o) => { if (o !== d && o.open) o.open = false; });
    });
  });

  /* ---------- Мобильное меню ---------- */
  const burger = document.getElementById('burger');
  if (burger && header) {
    burger.addEventListener('click', () => header.classList.toggle('menu-open'));
    document.querySelectorAll('.nav a').forEach((a) =>
      a.addEventListener('click', () => header.classList.remove('menu-open'))
    );
  }

  /* ---------- Год в футере ---------- */
  const year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();

  window.addEventListener('scroll', onScrollUI, { passive: true });
  onScrollUI();
})();
