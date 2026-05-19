/* KomTek — Main JavaScript */

(function () {
  'use strict';

  /* ---- Mobile menu toggle ---- */
  const toggle = document.getElementById('menuToggle');
  const mobileNav = document.getElementById('mobileNav');

  if (toggle && mobileNav) {
    toggle.addEventListener('click', () => {
      const open = mobileNav.classList.toggle('open');
      toggle.setAttribute('aria-expanded', open);
      toggle.classList.toggle('is-open', open);
    });

    // Close nav when any link inside it is clicked
    mobileNav.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        mobileNav.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
        toggle.classList.remove('is-open');
      });
    });
  }

  /* ---- Mobile accordion sub-menus ---- */
  document.querySelectorAll('.mobile-group-title').forEach(title => {
    const sub = title.nextElementSibling;
    if (!sub || !sub.classList.contains('mobile-sub')) return;

    // Inject chevron icon
    const chev = document.createElement('span');
    chev.className = 'mob-chevron';
    chev.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6,9 12,15 18,9"/></svg>';
    title.appendChild(chev);

    // Start collapsed
    sub.style.maxHeight = '0';
    sub.style.overflow = 'hidden';

    title.addEventListener('click', () => {
      const isOpen = title.classList.contains('open');

      // Collapse all groups
      document.querySelectorAll('.mobile-group-title.open').forEach(t => {
        t.classList.remove('open');
        t.nextElementSibling.style.maxHeight = '0';
      });

      // Expand clicked group if it was closed
      if (!isOpen) {
        title.classList.add('open');
        sub.style.maxHeight = sub.scrollHeight + 'px';
      }
    });
  });

  /* ---- Sticky nav shadow ---- */
  const navbar = document.querySelector('.navbar');
  if (navbar) {
    window.addEventListener('scroll', () => {
      navbar.classList.toggle('scrolled', window.scrollY > 20);
    }, { passive: true });
  }

  /* ---- FAQ accordion ---- */
  document.querySelectorAll('.faq-q').forEach(btn => {
    btn.addEventListener('click', () => {
      const item = btn.closest('.faq-item');
      const isOpen = item.classList.contains('open');
      document.querySelectorAll('.faq-item.open').forEach(el => el.classList.remove('open'));
      if (!isOpen) item.classList.add('open');
    });
  });

  /* ---- Logo fallback ---- */
  document.querySelectorAll('.navbar-logo img, .footer-logo img').forEach(img => {
    img.addEventListener('error', () => {
      img.style.display = 'none';
      const fallback = img.nextElementSibling;
      if (fallback) fallback.style.display = 'block';
    });
  });

  /* ---- Contact form (Netlify) ---- */
  const contactForm = document.getElementById('contactForm');
  if (contactForm) {
    contactForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = contactForm.querySelector('[type="submit"]');
      const original = btn.textContent;
      btn.disabled = true;
      btn.textContent = 'Sending…';
      try {
        const data = new URLSearchParams(new FormData(contactForm));
        await fetch('/', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: data });
        const msg = document.getElementById('formSuccess');
        if (msg) { contactForm.style.display = 'none'; msg.style.display = 'block'; }
      } catch {
        btn.textContent = 'Error — please try again';
        btn.disabled = false;
        setTimeout(() => { btn.textContent = original; }, 3000);
      }
    });
  }

  /* ---- Smooth anchor scroll ---- */
  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', e => {
      const target = document.querySelector(link.getAttribute('href'));
      if (target) { e.preventDefault(); target.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    });
  });

  /* ---- Clients logo carousel ---- */
  const clientsTrack = document.getElementById('clientsTrack');
  if (clientsTrack) {
    const slides = [...clientsTrack.querySelectorAll('.clients-slide')];
    const total  = slides.length;
    const per    = 3;
    const groups = Math.ceil(total / per);
    let current  = 0;
    let timer;

    function stepPx() {
      const gap = parseFloat(getComputedStyle(clientsTrack).gap) || 32;
      return per * (slides[0].offsetWidth + gap);
    }

    function goTo(g) {
      current = ((g % groups) + groups) % groups;
      clientsTrack.style.transform = `translateX(-${current * stepPx()}px)`;
    }

    function startTimer() {
      timer = setInterval(() => goTo(current + 1), 3500);
    }

    startTimer();

    const outer = clientsTrack.closest('.clients-track-outer');
    if (outer) {
      outer.addEventListener('mouseenter', () => clearInterval(timer));
      outer.addEventListener('mouseleave', startTimer);
    }

    document.querySelector('.carousel-prev')?.addEventListener('click', () => {
      clearInterval(timer); goTo(current - 1); startTimer();
    });
    document.querySelector('.carousel-next')?.addEventListener('click', () => {
      clearInterval(timer); goTo(current + 1); startTimer();
    });

    // Recalculate on resize
    window.addEventListener('resize', () => {
      clientsTrack.style.transition = 'none';
      goTo(current);
      requestAnimationFrame(() => { clientsTrack.style.transition = ''; });
    }, { passive: true });
  }

})();
