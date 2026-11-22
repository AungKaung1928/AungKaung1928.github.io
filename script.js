/* Portfolio interactions. Smooth scrolling is handled in CSS
 * (html { scroll-behavior: smooth }), so no anchor hijacking here. */

const root = document.documentElement;

/* ── Theme ───────────────────────────────────────────────────────── */
/* The initial class is set by the inline script in <head> so there is no
 * flash of light theme. This only handles the toggle from here on. */

const themeToggle = document.getElementById('theme-toggle');

themeToggle.addEventListener('click', () => {
    const dark = root.classList.toggle('dark-mode');
    themeToggle.setAttribute('aria-pressed', String(dark));
    try { localStorage.setItem('theme', dark ? 'dark' : 'light'); } catch (e) {}
});

themeToggle.setAttribute('aria-pressed', String(root.classList.contains('dark-mode')));

/* Keep every open page on the stored choice: a page restored by the Back
 * button, or another tab where the toggle was pressed, re-reads it. */
function syncTheme() {
    try {
        const t = localStorage.getItem('theme');
        root.classList.toggle('dark-mode',
            t === 'dark' || (!t && matchMedia('(prefers-color-scheme: dark)').matches));
        themeToggle.setAttribute('aria-pressed', String(root.classList.contains('dark-mode')));
    } catch (e) {}
}
/* ── Language ────────────────────────────────────────────────────── */
/* English by default; Japanese on request. The <head> snippet applies the
 * stored choice (or ?lang=ja) before first paint; this handles the switch. */

const titles = { en: document.title, ja: root.getAttribute('data-title-ja') || document.title };
const langButtons = [...document.querySelectorAll('[data-set-lang]')];

function setLang(l, save) {
    l = l === 'ja' ? 'ja' : 'en';
    if (l === 'ja') root.setAttribute('data-lang', 'ja'); else root.removeAttribute('data-lang');
    root.lang = l;
    document.title = titles[l];
    for (const b of langButtons) b.setAttribute('aria-pressed', String(b.dataset.setLang === l));
    // Walkthrough links carry the choice so a Japanese reader stays in Japanese.
    for (const a of document.querySelectorAll('a[href^="projects/"]')) {
        a.href = a.getAttribute('href').replace(/\?lang=ja$/, '') + (l === 'ja' ? '?lang=ja' : '');
    }
    if (save) try { localStorage.setItem('lang', l); } catch (e) {}
    document.dispatchEvent(new CustomEvent('langchange', { detail: l }));
}
for (const b of langButtons) b.addEventListener('click', () => setLang(b.dataset.setLang, true));
setLang(root.getAttribute('data-lang'), false);

function syncLang() {
    try { const l = localStorage.getItem('lang'); if (l) setLang(l, false); } catch (e) {}
}
window.addEventListener('pageshow', (e) => { if (e.persisted) { syncTheme(); syncLang(); } });
window.addEventListener('storage', (e) => {
    if (e.key === 'theme') syncTheme();
    if (e.key === 'lang') syncLang();
});

/* ── Active section in the nav ───────────────────────────────────── */

const sections = [...document.querySelectorAll('main section[id]')];
const navLinks = [...document.querySelectorAll('nav a[href^="#"]')];
let ticking = false;

function onScroll() {
    // Active section: the last one whose top has passed the header.
    let current = sections[0]?.id ?? '';
    for (const s of sections) {
        if (s.getBoundingClientRect().top <= 120) current = s.id;
    }
    for (const link of navLinks) {
        if (link.getAttribute('href').slice(1) === current) link.setAttribute('aria-current', 'true');
        else link.removeAttribute('aria-current');
    }
    ticking = false;
}

window.addEventListener('scroll', () => {
    if (!ticking) { ticking = true; requestAnimationFrame(onScroll); }
}, { passive: true });
window.addEventListener('resize', onScroll, { passive: true });
onScroll();
