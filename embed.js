/* ALINA ALMA · Einbettung in die vfi-Website (WordPress)
   Wird vom Raw-HTML-Element geladen. Änderungen hier wirken ohne WordPress-Schritt.
   - iframe-Höhe nach Inhalt
   - Seite bildschirmbreit, Lücke zum Titelband schließen
   - Titelband des Themes: Basilikum-Foto, Titel weiß (unabhängig vom Titeltext) */
(function () {
  var BASE = 'https://podmirseg.github.io/alina-alma/';
  var IMG = BASE + 'assets/header-basilikum.jpg';
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

  function fix() {
    /* Impeka: Titelband = #grve-feature-section mit .grve-bg-image; sonst geometrisch suchen */
    var section = document.getElementById('grve-feature-section');
    var banner = section && section.querySelector('.grve-bg-image');
    if (!banner) banner = findBanner();
    if (!banner) return;
    banner.style.setProperty('background-image', 'url("' + IMG + '")', 'important');
    banner.style.setProperty('background-size', 'cover', 'important');
    banner.style.setProperty('background-position', 'center 40%', 'important');
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
