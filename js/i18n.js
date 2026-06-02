(function () {
  'use strict';
  var LANGS = ['en', 'es', 'fr', 'de'];
  var cache = {};

  function base() {
    var s = document.querySelector('script[src*="i18n.js"]');
    return s ? s.src.replace(/js\/i18n\.js[^]*$/, '') : '/';
  }

  function load(lang) {
    if (cache[lang]) return Promise.resolve(cache[lang]);
    return fetch(base() + 'locales/' + lang + '.json')
      .then(function (r) { return r.json(); })
      .then(function (d) { cache[lang] = d; return d; })
      .catch(function () { cache[lang] = {}; return {}; });
  }

  function dig(obj, key) {
    return key.split('.').reduce(function (o, k) {
      return o && o[k] !== undefined ? o[k] : null;
    }, obj);
  }

  function applyAll(t, fb) {
    document.querySelectorAll('[data-i18n-html]').forEach(function (el) {
      var v = dig(t, el.getAttribute('data-i18n-html')) || dig(fb, el.getAttribute('data-i18n-html'));
      if (v !== null) el.innerHTML = v;
    });
    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      var v = dig(t, el.getAttribute('data-i18n')) || dig(fb, el.getAttribute('data-i18n'));
      if (v !== null) el.textContent = v;
    });
    document.querySelectorAll('[data-i18n-ph]').forEach(function (el) {
      var v = dig(t, el.getAttribute('data-i18n-ph')) || dig(fb, el.getAttribute('data-i18n-ph'));
      if (v !== null) el.placeholder = v;
    });
    document.documentElement.lang = window.__lang || 'en';
    document.querySelectorAll('[data-lang-opt]').forEach(function (btn) {
      var active = btn.getAttribute('data-lang-opt') === (window.__lang || 'en');
      btn.style.fontWeight = active ? '700' : '400';
      btn.style.color = active ? 'var(--primary)' : 'var(--text)';
    });
    var lbl = document.getElementById('langLabel');
    if (lbl) lbl.textContent = (window.__lang || 'en').toUpperCase();
  }

  function setLang(lang) {
    if (LANGS.indexOf(lang) === -1) lang = 'en';
    window.__lang = lang;
    localStorage.setItem('kt_lang', lang);
    return Promise.all([load(lang), load('en')]).then(function (r) {
      applyAll(r[0], r[1]);
    });
  }

  window.i18nSet = setLang;

  document.addEventListener('DOMContentLoaded', function () {
    setLang(localStorage.getItem('kt_lang') || 'en');
  });
}());
