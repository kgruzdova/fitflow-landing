/* FitFlow — страница оплаты: валидация, имитация платежа, экран успеха */

(function () {
  'use strict';

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Reveal при скролле ---------- */
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

  /* ---------- Лёгкий параллакс пятен ---------- */
  const blobs = Array.from(document.querySelectorAll('.blobs .blob[data-para]'));
  if (!reduced && blobs.length) {
    let ticking = false;
    const apply = () => {
      const vh = window.innerHeight;
      blobs.forEach((el) => {
        const sp = parseFloat(el.dataset.para || 0);
        const sec = el.closest('section, main') || document.body;
        const r = sec.getBoundingClientRect();
        el.style.transform = 'translate3d(0,' + ((r.top + r.height / 2 - vh / 2) * sp).toFixed(1) + 'px,0)';
      });
      ticking = false;
    };
    window.addEventListener('scroll', () => {
      if (!ticking) { ticking = true; requestAnimationFrame(apply); }
    }, { passive: true });
    apply();
  }

  /* ---------- Таймер цены ---------- */
  const timers = document.querySelectorAll('[data-countdown]');
  if (timers.length) {
    const pad = (n) => String(n).padStart(2, '0');
    const tick = () => {
      const now = new Date();
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
      const d = Math.max(0, end - now);
      const t = pad(Math.floor(d / 3.6e6)) + ':' + pad(Math.floor((d % 3.6e6) / 6e4)) + ':' + pad(Math.floor((d % 6e4) / 1e3));
      timers.forEach((el) => (el.textContent = t));
    };
    tick();
    setInterval(tick, 1000);
  }

  /* ---------- Форма ---------- */
  const form = document.getElementById('payForm');
  const payBtn = document.getElementById('payBtn');
  const btnLabel = payBtn ? payBtn.querySelector('.btn-label') : null;
  const spinner = payBtn ? payBtn.querySelector('.btn-spinner') : null;
  const checkoutStage = document.getElementById('checkoutStage');
  const successStage = document.getElementById('successStage');

  const fields = {
    name: document.getElementById('fName'),
    email: document.getElementById('fEmail'),
    tg: document.getElementById('fTg'),
  };

  const showErr = (input, show) => {
    input.classList.toggle('invalid', show);
    const err = document.querySelector('.err[data-for="' + input.id + '"]');
    if (err) err.classList.toggle('show', show);
  };

  Object.values(fields).forEach((input) => {
    if (!input) return;
    input.addEventListener('input', () => showErr(input, false));
  });

  function validate() {
    let ok = true;

    if (!fields.name || fields.name.value.trim().length < 2) {
      showErr(fields.name, true); ok = false;
    }
    if (!fields.email || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(fields.email.value.trim())) {
      showErr(fields.email, true); ok = false;
    }
    const tg = (fields.tg.value || '').trim();
    if (tg && !(/^@[\w_]{3,}$/.test(tg) || /^https?:\/\/t\.me\//i.test(tg))) {
      showErr(fields.tg, true); ok = false;
    }
    return ok;
  }

  /* ---------- Отправка заявки в Google Sheets ----------
     Вставь сюда URL веб-приложения Apps Script (см. инструкцию в комментарии).
     Покажет true/false и текст ответа, если HTTP-статус не 200. */
  const SPREADSHEET_ENDPOINT = 'https://script.google.com/macros/s/AKfycbyJvvVa_yTnWLVZeB8TTj7LeN93RdtAR8wla3DcB4u-TBuzhj1Tlb1cjHzbYFSQZ44y/exec';

  function sendToSheet(payload) {
    if (!SPREADSHEET_ENDPOINT || SPREADSHEET_ENDPOINT.indexOf('PASTE_YOUR') === 0) return;
    fetch(SPREADSHEET_ENDPOINT, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).catch(() => {});
  }

  function collectFormData() {
    const payInput = form.querySelector('input[name="pay"]:checked');
    return {
      form: 'checkout',
      name: (fields.name.value || '').trim(),
      email: (fields.email.value || '').trim(),
      telegram: (fields.tg.value || '').trim(),
      pay_method: payInput ? payInput.value : '',
      price: '990',
      date: new Date().toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' }),
    };
  }

  form && form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!validate()) {
      const first = form.querySelector('.invalid');
      first && first.focus();
      return;
    }

    sendToSheet(collectFormData());

    /* Имитация платежа. TODO: заменить на вызов реальной платёжной системы
       (ЮKassa / Prodamus / CloudPayments) — см. комментарий в checkout.html. */
    payBtn.classList.add('loading');
    if (btnLabel) btnLabel.textContent = 'Проводим оплату…';
    if (spinner) spinner.hidden = false;

    setTimeout(() => {
      checkoutStage.hidden = true;
      successStage.hidden = false;
      const mail = document.getElementById('successEmail');
      if (mail) mail.textContent = fields.email.value.trim();
      window.scrollTo({ top: 0, behavior: 'auto' });

      // форсируем анимацию карточки успеха
      requestAnimationFrame(() => {
        setTimeout(() => {
          successStage.querySelectorAll('.reveal-scale, .reveal').forEach((el) => el.classList.add('in'));
        }, 40);
      });
    }, 2000);
  });
})();
