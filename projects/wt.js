/* Walkthrough pages: reading progress, section scroll-spy, theme and language.
 * The initial theme and language are applied by the inline <head> snippet so
 * the first paint is already right; this file handles changes from there.
 * Both choices are shared with the main site through localStorage
 * ('theme', 'lang'), and ?lang=ja in a link selects Japanese directly. */
(function () {
  var root = document.documentElement;

  /* ── progress + scroll-spy ─────────────────────────────────────── */
  var bar = document.querySelector('.progress i');
  var links = [].slice.call(document.querySelectorAll('nav.jump a'));
  var secs = links.map(function (a) { return document.querySelector(a.getAttribute('href')); });
  var queued = false;
  function paint() {
    queued = false;
    var max = root.scrollHeight - root.clientHeight;
    if (bar) bar.style.width = (max > 0 ? Math.min(100, root.scrollTop / max * 100) : 0) + '%';
    var cur = 0;
    for (var i = 0; i < secs.length; i++) if (secs[i] && secs[i].getBoundingClientRect().top <= 110) cur = i;
    for (var j = 0; j < links.length; j++) {
      if (j === cur) links[j].setAttribute('aria-current', 'true');
      else links[j].removeAttribute('aria-current');
    }
    var on = links[cur];
    if (on && on.parentNode.scrollWidth > on.parentNode.clientWidth) {
      var p = on.parentNode, l = on.offsetLeft - p.offsetLeft;
      if (l < p.scrollLeft || l + on.offsetWidth > p.scrollLeft + p.clientWidth) p.scrollLeft = l - 16;
    }
  }
  function tick() { if (!queued) { queued = true; requestAnimationFrame(paint); } }
  addEventListener('scroll', tick, { passive: true });
  addEventListener('resize', tick);
  paint();

  /* ── reading depth ─────────────────────────────────────────────── */
  function setFull(on) {
    root.classList.toggle('full', on);
    document.querySelectorAll('.jump-toggle').forEach(function (b) { b.setAttribute('aria-expanded', String(on)); });
    tick();
  }
  document.querySelectorAll('.jump-toggle, .deep-note button').forEach(function (b) {
    b.addEventListener('click', function () {
      var on = !root.classList.contains('full');
      setFull(on);
      if (on && b.closest('.deep-note')) {
        var first = document.querySelector('section[data-depth="deep"]');
        if (first) first.scrollIntoView({ block: 'start' });
      }
    });
  });
  /* A link straight to a deep section opens the full view first. */
  function openHash() {
    var h = location.hash && document.querySelector(location.hash);
    if (h && h.closest('section[data-depth="deep"]') && !root.classList.contains('full')) {
      setFull(true);
      requestAnimationFrame(function () { h.scrollIntoView({ block: 'start' }); });
    }
  }
  addEventListener('hashchange', openHash);
  openHash();

  /* ── theme ─────────────────────────────────────────────────────── */
  var tb = document.getElementById('theme-toggle');
  function showTheme() { if (tb) tb.setAttribute('aria-pressed', String(root.classList.contains('dark-mode'))); }
  if (tb) tb.addEventListener('click', function () {
    var d = root.classList.toggle('dark-mode');
    showTheme();
    try { localStorage.setItem('theme', d ? 'dark' : 'light'); } catch (e) {}
  });

  /* ── language ──────────────────────────────────────────────────── */
  var titles = { en: document.title, ja: root.getAttribute('data-title-ja') || document.title };
  var lb = [].slice.call(document.querySelectorAll('[data-set-lang]'));
  function setLang(l, save) {
    l = l === 'ja' ? 'ja' : 'en';
    if (l === 'ja') root.setAttribute('data-lang', 'ja'); else root.removeAttribute('data-lang');
    root.lang = l;
    document.title = titles[l];
    lb.forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-set-lang') === l)); });
    if (save) try { localStorage.setItem('lang', l); } catch (e) {}
    tick();
  }
  lb.forEach(function (b) {
    b.addEventListener('click', function () { setLang(b.getAttribute('data-set-lang'), true); });
  });

  /* Another tab, or a page restored by Back, re-reads both stored choices. */
  function sync() {
    try {
      var t = localStorage.getItem('theme');
      root.classList.toggle('dark-mode', t === 'dark' || (!t && matchMedia('(prefers-color-scheme: dark)').matches));
      var l = localStorage.getItem('lang');
      if (l) setLang(l, false);
    } catch (e) {}
    showTheme();
  }
  addEventListener('pageshow', function (e) { if (e.persisted) sync(); });
  addEventListener('storage', function (e) { if (e.key === 'theme' || e.key === 'lang') sync(); });
  showTheme();
  setLang(root.getAttribute('data-lang'), false);
})();
