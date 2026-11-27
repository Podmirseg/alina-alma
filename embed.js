/* ALINA ALMA · Einbettung in die vfi-Website (WordPress)
   Titelband wie Journal: Menüleiste über dem Bild, 60 % Bildschirmhöhe, dunkler Verlauf
   Wird vom Raw-HTML-Element geladen. Änderungen hier wirken ohne WordPress-Schritt.
   - iframe-Höhe nach Inhalt
   - Seite bildschirmbreit, Lücke zum Titelband schließen
   - Titelband des Themes: Basilikum-Foto, Titel weiß (unabhängig vom Titeltext)
   - Foto halbtransparent über dunklem Grund (FOTO_DECKKRAFT, GRUND)
   - Logo ohne weißes Feld: helle Fassung über dem Bild, Originalfarben sonst */
(function () {
  var BASE = 'https://podmirseg.github.io/alina-alma/';
  var IMG = BASE + 'assets/header-basilikum-gross.jpg';
  var FOTO_DECKKRAFT = 0.65;            /* 1 = Foto voll deckend, kleiner = transparenter */
  var GRUND = '#171234';                /* Fläche hinter dem Foto (vfi Blau-Lavendel 5) */
  var LOGO_HELL = BASE + 'assets/logo-vfi-hell.png';               /* weiß + Magenta, transparent */
  var LOGO_TRANSPARENT = BASE + 'assets/logo-vfi-transparent.png'; /* Originalfarben, transparent */
  var wrap = document.getElementById('alina-alma-wrap');
  var frame = document.getElementById('alina-alma-frame');
  if (!wrap || !frame) return;

  window.addEventListener('message', function (e) {
    if (e.origin !== 'https://podmirseg.github.io') return;
    var d = e.data;
    if (!d || d.type !== 'alina-alma-height' || typeof d.h !== 'number') return;
    frame.style.height = Math.max(600, Math.min(20000, d.h)) + 'px';
  });

  function bgUrl(el) {
    var b = getComputedStyle(el).backgroundImage;
    return b && b !== 'none' && b.indexOf('url(') > -1;
  }

  /* Titelband = breitestes Element mit Hintergrundbild oberhalb der Einbettung */
  function findBanner() {
    var top = wrap.getBoundingClientRect().top + window.scrollY;
    var vw = document.documentElement.clientWidth;
    var best = null, bestArea = 0;
    var all = document.body.getElementsByTagName('*');
    for (var i = 0; i < all.length; i++) {
      var el = all[i];
      if (el === wrap || wrap.contains(el) || el.tagName === 'IMG') continue;
      if (!bgUrl(el)) continue;
      var r = el.getBoundingClientRect();
      var y = r.top + window.scrollY;
      if (r.width < vw * 0.8 || r.height < 120 || y + r.height > top + 5) continue;
      var a = r.width * r.height;
      if (a > bestArea) { best = el; bestArea = a; }
    }
    return best;
  }

  /* Aussehen wie die Journal-Seite: Menüleiste über dem Bild, Band 60 % Bildschirmhöhe */
  function journalLook(section) {
    document.body.classList.add('grve-header-overlapping');
    var mh = document.getElementById('grve-main-header');
    if (mh) {
      mh.classList.remove('grve-skin-default', 'grve-skin-dark');
      mh.classList.add('grve-skin-light');
      mh.setAttribute('data-header-skin', 'light');
    }
    if (!section) return;
    section.classList.add('grve-with-image', 'grve-custom-size');
    section.setAttribute('data-height', '60');
    var w = section.querySelector('.grve-wrapper');
    if (w) { w.style.setProperty('height', '60vh', 'important'); w.style.setProperty('min-height', '200px', 'important'); }
    var bw = section.querySelector('.grve-background-wrapper');
    if (bw && !bw.querySelector('.grve-bg-overlay')) {
      var ov = document.createElement('div');
      ov.className = 'grve-bg-overlay';
      bw.appendChild(ov);
    }
    var o = section.querySelector('.grve-bg-overlay');
    if (o) o.style.setProperty('background', 'linear-gradient(180deg,rgba(10,10,10,0.55) 0%,rgba(0,0,0,0.10) 100%)', 'important');
    var t = section.querySelectorAll('.grve-title, .grve-description');
    for (var i = 0; i < t.length; i++) { t[i].classList.remove('grve-text-dark', 'grve-text-black'); t[i].classList.add('grve-text-white'); }
  }

  /* Logo der Menüleiste: Fassungen mit transparentem Hintergrund einsetzen.
     Impeka gibt je Zustand ein Bild aus (grve-default, grve-light, grve-dark, grve-sticky);
     nur die helle Fassung (über dem Bild) bekommt weiße Buchstaben. */
  function fixLogo() {
    try {
      var imgs = document.querySelectorAll('.grve-logo img');
      for (var i = 0; i < imgs.length; i++) {
        var im = imgs[i];
        var src = im.classList.contains('grve-light') ? LOGO_HELL : LOGO_TRANSPARENT;
        if (im.getAttribute('src') === src) continue;
        im.removeAttribute('srcset');
        im.removeAttribute('sizes');
        im.removeAttribute('data-srcset');
        im.setAttribute('src', src);
        im.style.setProperty('background', 'transparent', 'important');
        im.style.setProperty('object-fit', 'contain');
      }
    } catch (e) {}
  }

  var resized = false;
  function fix() {
    /* Impeka: Titelband = #grve-feature-section mit .grve-bg-image; sonst geometrisch suchen */
    var section = document.getElementById('grve-feature-section');
    journalLook(section);
    fixLogo();
    if (!resized) { resized = true; window.dispatchEvent(new Event('resize')); }
    var banner = section && section.querySelector('.grve-bg-image');
    if (!banner) banner = findBanner();
    if (!banner) return;
    banner.style.setProperty('background-image', 'url("' + IMG + '")', 'important');
    banner.style.setProperty('background-size', 'cover', 'important');
    banner.style.setProperty('background-position', 'center 35%', 'important');
    /* Foto transparenter: Deckkraft senken, dunkle Fläche dahinter */
    banner.style.setProperty('opacity', String(FOTO_DECKKRAFT), 'important');
    var ground = (section && section.querySelector('.grve-background-wrapper')) || banner.parentElement;
    if (ground) ground.style.setProperty('background-color', GRUND, 'important');
    if (section) section.style.setProperty('background-color', GRUND, 'important');
    /* Titel weiß: nächster Vorfahr, der einen Titel enthält */
    var scope = section || banner;
    while (scope && scope !== document.body && !scope.querySelector('h1, h2, .grve-title')) scope = scope.parentElement;
    if (scope && scope !== document.body) {
      var hs = scope.querySelectorAll('h1, h2, .grve-title, .grve-description');
      for (var j = 0; j < hs.length; j++) {
        if (!wrap.contains(hs[j])) hs[j].style.setProperty('color', '#FFFFFF', 'important');
      }
    }
    /* Lücke zwischen Band und Einbettung schließen */
    var box = section || banner;
    wrap.style.marginTop = '0px';
    var gap = wrap.getBoundingClientRect().top - box.getBoundingClientRect().bottom;
    if (gap > 0 && gap < 400) wrap.style.marginTop = (-gap) + 'px';
  }

  fix();
  window.addEventListener('load', fix);
  setTimeout(fix, 1500);
})();
