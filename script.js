// --- Original Functionality ---

// Smooth scroll
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Active nav on scroll
const sections = document.querySelectorAll('section[id]');
// Target only the anchor tags inside nav, excluding the theme button if it were inside
const navLinks = document.querySelectorAll('nav a'); 
window.addEventListener('scroll', () => {
    let current = '';
    
    sections.forEach(section => {
        // Adjust offset for sticky header height
        const sectionTop = section.offsetTop - 100; 
        if (window.scrollY >= sectionTop) {
            current = section.getAttribute('id');
        }
    });
    
    navLinks.forEach(link => {
        // Reset color for all links
        link.style.color = ''; 
        if (link.getAttribute('href').slice(1) === current) {
            // Use CSS Variable for primary color
            link.style.color = 'var(--color-primary)'; 
        }
    });
    
    // Call the new scroll progress function
    updateScrollProgress();
});

// --- New Feature 1: Day/Night Theme Toggle ---

const themeToggle = document.getElementById('theme-toggle');
const body = document.body;

// Function to set the theme
function setTheme(isDark) {
    if (isDark) {
        body.classList.add('dark-theme');
        themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
        localStorage.setItem('theme', 'dark');
    } else {
        body.classList.remove('dark-theme');
        themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
        localStorage.setItem('theme', 'light');
    }
}

// Check for saved theme preference or use system preference
const savedTheme = localStorage.getItem('theme');

if (savedTheme) {
    // Use saved theme
    setTheme(savedTheme === 'dark');
} else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
    // Use system preference if no saved theme
    setTheme(true);
} else {
    // Default to light
    setTheme(false);
}

// Add event listener for the toggle button
if (themeToggle) { // Safety check to ensure the button exists before adding the listener
    themeToggle.addEventListener('click', () => {
        // Toggle the theme
        setTheme(!body.classList.contains('dark-theme'));
    });
}


// --- New Feature 2: Scroll Progress Bar Percentage ---

const progressBar = document.getElementById('progress-bar');

function updateScrollProgress() {
    // Get the total height of the document (scrollable height)
    const totalHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    
    // Get the current scroll position
    const scrollPosition = window.scrollY;
    
    // Calculate the percentage: (current scroll / total scrollable height) * 100
    const scrollPercentage = (scrollPosition / totalHeight) * 100;
    
    // Set the width of the progress bar
    if (progressBar) {
        progressBar.style.width = scrollPercentage + '%';
    }
}

// Initial call to set the progress bar for the top of the page (0%)
updateScrollProgress(); 

// The 'scroll' event listener for 'Active nav on scroll' is already calling this function.
// window.addEventListener('scroll', updateScrollProgress);
