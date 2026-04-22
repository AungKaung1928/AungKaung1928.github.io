// Smooth scroll
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    });
});

// Active nav on scroll
const sections = document.querySelectorAll('section[id]');
const navLinks = document.querySelectorAll('nav a');
window.addEventListener('scroll', () => {
    let current = '';
    sections.forEach(section => {
        const sectionTop = section.offsetTop - 100;
        if (scrollY >= sectionTop) current = section.getAttribute('id');
    });
    navLinks.forEach(link => {
        link.style.color = '';
        if (link.getAttribute('href').slice(1) === current) {
            link.style.color = 'var(--accent-primary)';
        }
    });
});

// Dark/Light Mode Toggle
const themeToggle = document.getElementById('theme-toggle');
const body = document.body;
const currentTheme = localStorage.getItem('theme') || 'light';
if (currentTheme === 'dark') body.classList.add('dark-mode');

themeToggle.addEventListener('click', () => {
    body.classList.toggle('dark-mode');
    localStorage.setItem('theme', body.classList.contains('dark-mode') ? 'dark' : 'light');
});

// Scroll Percentage Display
const scrollPercentage = document.getElementById('scroll-percentage');
window.addEventListener('scroll', () => {
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const scrollHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    scrollPercentage.dataset.val = Math.round((scrollTop / scrollHeight) * 100) + '%';
    scrollPercentage.textContent = scrollPercentage.dataset.val;
});

// Typewriter effect on hero description
const heroDesc = document.getElementById('hero-desc');
const originalText = heroDesc.textContent.trim();
heroDesc.textContent = '';

const cursor = document.createElement('span');
cursor.className = 'cursor';
heroDesc.appendChild(cursor);

let charIndex = 0;
let typewriterDone = false;

function typeWriter() {
    if (charIndex < originalText.length) {
        heroDesc.insertBefore(document.createTextNode(originalText[charIndex]), cursor);
        charIndex++;
        setTimeout(typeWriter, 30 + Math.random() * 20);
    } else {
        typewriterDone = true;
        setTimeout(() => {
            cursor.style.display = 'none';
        }, 2000);
    }
}

setTimeout(typeWriter, 600);

// Coordinate display — updates on scroll to simulate robot odometry
const coordX = document.getElementById('coord-x');
const coordY = document.getElementById('coord-y');
const coordTheta = document.getElementById('coord-theta');
const coordSys = document.getElementById('coord-sys');

const sysStates = ['nav2/active', 'slam/mapping', 'amcl/running', 'odom/stable', 'tf2/ready'];
let sysIndex = 0;

setInterval(() => {
    sysIndex = (sysIndex + 1) % sysStates.length;
    coordSys.textContent = sysStates[sysIndex];
}, 3200);

window.addEventListener('scroll', () => {
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const scrollHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    const progress = scrollTop / (scrollHeight || 1);

    const x = (progress * 8.42 - 0.5).toFixed(3);
    const y = (Math.sin(progress * Math.PI * 2) * 3.14).toFixed(3);
    const theta = (progress * 180).toFixed(1);

    if (coordX) coordX.textContent = x;
    if (coordY) coordY.textContent = y;
    if (coordTheta) coordTheta.textContent = theta + '°';
});
