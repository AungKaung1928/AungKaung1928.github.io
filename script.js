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

/* ── Scroll progress + active section ────────────────────────────── */

const progressBar = document.getElementById('progress-bar');
const scrollPercentage = document.getElementById('scroll-percentage');
const sections = [...document.querySelectorAll('main section[id]')];
const navLinks = [...document.querySelectorAll('nav a[href^="#"]')];

let ticking = false;

function onScroll() {
    const scrollTop = window.scrollY;
    const scrollable = document.documentElement.scrollHeight - window.innerHeight;
    const pct = scrollable > 0 ? Math.min(100, Math.round((scrollTop / scrollable) * 100)) : 0;

    progressBar.style.width = pct + '%';
    scrollPercentage.textContent = pct + '%';
    // The badge is noise at the very top of the page.
    scrollPercentage.style.opacity = scrollTop < 80 ? '0' : '1';

    // Active section: the last one whose top has passed the header.
    let current = sections[0]?.id ?? '';
    for (const s of sections) {
        if (s.getBoundingClientRect().top <= 120) current = s.id;
    }
    for (const link of navLinks) {
        const on = link.getAttribute('href').slice(1) === current;
        if (on) link.setAttribute('aria-current', 'true');
        else link.removeAttribute('aria-current');
    }

    ticking = false;
}

window.addEventListener('scroll', () => {
    if (!ticking) { ticking = true; requestAnimationFrame(onScroll); }
}, { passive: true });

window.addEventListener('resize', onScroll, { passive: true });
onScroll();

/* ── Scroll reveal ───────────────────────────────────────────────── */
/* The hiding rule lives behind html.reveal-ready, so if JS never runs
 * the content stays visible instead of disappearing. */

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

if ('IntersectionObserver' in window && !reduced) {
    root.classList.add('reveal-ready');

    const observer = new IntersectionObserver((entries) => {
        for (const entry of entries) {
            if (!entry.isIntersecting) continue;
            entry.target.classList.add('in');
            observer.unobserve(entry.target);
        }
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });

    document.querySelectorAll('.reveal').forEach((el) => observer.observe(el));
}
