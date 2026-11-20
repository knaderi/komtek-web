(function () {
  'use strict';
  /*
   * Site translation
   * 1. Curated translations: elements tagged data-i18n / data-i18n-html / data-i18n-ph
   *    are filled from locales/<lang>.json and marked "notranslate".
   * 2. Everything else: when a non-English language is chosen, Google's website
   *    translator is loaded and translates the rest of the page. It is only loaded
   *    for visitors who choose ES / FR / DE; English visitors load nothing extra.
   */
  var LANGS = ['en', 'es', 'fr', 'de'];
  var cache = {};
  var gtLoaded = false;

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

  function storeGet() { try { return localStorage.getItem('kt_lang'); } catch (e) { return null; } }
  function storeSet(v) { try { localStorage.setItem('kt_lang', v); } catch (e) {} }

  /* ---- Google translate cookie (read by Google's translator) ---- */
  function rootDomain() {
    var h = location.hostname;
    return /komtek\.co\.uk$/.test(h) ? '.komtek.co.uk' : '';
  }
  function setGoogCookie(lang) {
    var v = lang === 'en' ? '' : '/en/' + lang;
    var exp = lang === 'en' ? ';expires=Thu, 01 Jan 1970 00:00:00 GMT' : '';
    document.cookie = 'googtrans=' + v + ';path=/' + exp;
    var d = rootDomain();
    if (d) document.cookie = 'googtrans=' + v + ';path=/;domain=' + d + exp;
  }
  function googCookieLang() {
    var m = document.cookie.match(/(?:^|;\s*)googtrans=\/en\/([a-z-]+)/);
    return m ? m[1] : 'en';
  }

  /* Select the language in Google's (hidden) dropdown once it exists */
  function pickLanguage(lang, tries) {
    var combo = document.querySelector('.goog-te-combo');
    if (!combo || !combo.options || combo.options.length < 2) {
      if (tries < 50) setTimeout(function () { pickLanguage(lang, tries + 1); }, 200);
      return;
    }
    if (combo.value !== lang) {
      combo.value = lang;
      combo.dispatchEvent(new Event('change'));
    }
  }

  function loadGoogle() {
    if (gtLoaded) return;
    gtLoaded = true;
    var holder = document.createElement('div');
    holder.id = 'google_translate_element';
    holder.setAttribute('aria-hidden', 'true');
    holder.style.cssText = 'position:absolute;left:-9999px;top:0;width:1px;height:1px;overflow:hidden';
    document.body.appendChild(holder);
    window.googleTranslateElementInit = function () {
      /* global google */
      new google.translate.TranslateElement({
        pageLanguage: 'en',
        includedLanguages: 'en,es,fr,de',
        autoDisplay: false
      }, 'google_translate_element');
      pickLanguage(window.__lang || 'en', 0);
    };
    var s = document.createElement('script');
    s.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
    s.async = true;
    document.body.appendChild(s);
  }

  function applyAll(t, fb, lang) {
    var marker = lang !== 'en';
    document.querySelectorAll('[data-i18n-html]').forEach(function (el) {
      var v = dig(t, el.getAttribute('data-i18n-html')) || dig(fb, el.getAttribute('data-i18n-html'));
      if (v !== null) el.innerHTML = v;
      if (marker) el.classList.add('notranslate');
    });
    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      var v = dig(t, el.getAttribute('data-i18n')) || dig(fb, el.getAttribute('data-i18n'));
      if (v !== null) el.textContent = v;
      if (marker) el.classList.add('notranslate');
    });
    document.querySelectorAll('[data-i18n-ph]').forEach(function (el) {
      var v = dig(t, el.getAttribute('data-i18n-ph')) || dig(fb, el.getAttribute('data-i18n-ph'));
      if (v !== null) el.placeholder = v;
    });
    document.documentElement.lang = lang;
    document.querySelectorAll('[data-lang-opt]').forEach(function (btn) {
      var active = btn.getAttribute('data-lang-opt') === lang;
      btn.style.fontWeight = active ? '700' : '400';
      btn.style.color = active ? 'var(--primary)' : 'var(--text)';
      btn.classList.add('notranslate');
    });
    document.querySelectorAll('.lang-label').forEach(function (lbl) {
      lbl.textContent = lang.toUpperCase();
      lbl.classList.add('notranslate');
    });
  }

  function render(lang) {
    window.__lang = lang;
    return Promise.all([load(lang), load('en')]).then(function (r) {
      applyAll(r[0], r[1], lang);
      if (lang !== 'en') loadGoogle();
    });
  }

  function setLang(lang) {
    if (LANGS.indexOf(lang) === -1) lang = 'en';
    var current = window.__lang || 'en';
    storeSet(lang);
    setGoogCookie(lang);
    if (lang === current) return Promise.resolve();
    // Switching away from a machine-translated page needs a clean reload
    if (current !== 'en' || gtLoaded) { location.reload(); return Promise.resolve(); }
    return render(lang);
  }

  window.i18nSet = setLang;

  document.addEventListener('DOMContentLoaded', function () {
    var lang = storeGet() || 'en';
    if (LANGS.indexOf(lang) === -1) lang = 'en';
    // keep Google's cookie in step with the chosen language
    if (googCookieLang() !== lang) setGoogCookie(lang);
    render(lang);
  });
}());
