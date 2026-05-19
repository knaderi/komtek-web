/* KomTek — Main JavaScript */

(function () {
  'use strict';

  /* ---- Mobile menu ---- */
  const toggle = document.getElementById('menuToggle');
  const mobileNav = document.getElementById('mobileNav');
  if (toggle && mobileNav) {
    toggle.addEventListener('click', () => {
      const open = mobileNav.classList.toggle('open');
      toggle.setAttribute('aria-expanded', open);
    });
  }

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

  /* ---- Netlify Forms: success message ---- */
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

})();
