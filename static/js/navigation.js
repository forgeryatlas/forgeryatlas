// Ottoman Crime Network Map - Navigation Module

document.addEventListener('DOMContentLoaded', function() {
    console.log("Navigation module loaded");
    
    // Initialize smooth scrolling for navigation links
    initSmoothScrolling();
    
    // Initialize scroll spy for navbar highlighting
    initScrollSpy();

    // Initialize dropdown menus (Primary Documents)
    initDropdownMenus();
});

/**
 * Wire up click-toggle and outside-close behavior for nav dropdowns.
 * Hover/focus already works via CSS; this adds touch/keyboard support
 * and keeps the parent visually highlighted when a child is active.
 */
function initDropdownMenus() {
    var dropdownItems = document.querySelectorAll('.site-nav li.has-dropdown');
    if (!dropdownItems.length) return;

    dropdownItems.forEach(function(li) {
        var toggle = li.querySelector('.nav-dropdown-toggle');
        if (!toggle) return;

        toggle.addEventListener('click', function(e) {
            // Toggle behavior on small viewports (and as a keyboard fallback)
            if (toggle.getAttribute('href') === '#' || e.detail === 0 || window.innerWidth <= 768) {
                e.preventDefault();
                var isOpen = li.classList.toggle('open');
                toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
            }
        });

        // Keep aria-expanded in sync with hover/focus on desktop
        li.addEventListener('mouseenter', function() {
            toggle.setAttribute('aria-expanded', 'true');
        });
        li.addEventListener('mouseleave', function() {
            if (!li.classList.contains('open')) {
                toggle.setAttribute('aria-expanded', 'false');
            }
        });

        // Highlight the parent toggle if any child link matches the current path
        var currentPath = window.location.pathname.replace(/\/$/, '') || '/';
        var childLinks = li.querySelectorAll('.nav-dropdown a.nav-link');
        childLinks.forEach(function(child) {
            try {
                var childPath = new URL(child.href).pathname.replace(/\/$/, '') || '/';
                if (childPath === currentPath || (childPath !== '/' && currentPath.indexOf(childPath) === 0)) {
                    child.classList.add('active');
                    toggle.classList.add('active');
                }
            } catch (err) { /* ignore */ }
        });
    });

    // Close any open dropdown when clicking outside
    document.addEventListener('click', function(e) {
        dropdownItems.forEach(function(li) {
            if (!li.contains(e.target)) {
                li.classList.remove('open');
                var toggle = li.querySelector('.nav-dropdown-toggle');
                if (toggle) toggle.setAttribute('aria-expanded', 'false');
            }
        });
    });
}

/**
 * Initialize smooth scrolling for navigation links
 */
function initSmoothScrolling() {
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', function(e) {
            const targetId = this.getAttribute('href');
            
            // Only prevent default and scroll if it's an anchor link (starts with #)
            if (targetId && targetId.startsWith('#')) {
                e.preventDefault();
                const targetElement = document.querySelector(targetId);

                if (targetElement) {
                    window.scrollTo({
                        top: targetElement.offsetTop - 80, // Adjust for header height
                        behavior: 'smooth'
                    });
                }
            }
            // If it's a regular URL, allow normal navigation (don't prevent default)
        });
    });
    console.log("Smooth scrolling initialized");
}

/**
 * Initialize scroll spy functionality to highlight navbar items on scroll
 * Only works for anchor links on single-page layouts
 */
function initScrollSpy() {
    // Get all navigation links
    const navLinks = document.querySelectorAll('.nav-link');
    
    // Check if we're on a single-page layout (has anchor links)
    const hasAnchorLinks = Array.from(navLinks).some(link => {
        const href = link.getAttribute('href');
        return href && href.startsWith('#');
    });
    
    // Only initialize scroll spy if we have anchor links (single-page layout)
    if (!hasAnchorLinks) {
        console.log("Scroll spy skipped - using multi-page layout");
        return;
    }
    
    // Get all sections that should be observed
    const sections = document.querySelectorAll('.section');
    
    // Create a map of section IDs to their corresponding nav links
    const sectionNavMap = {};
    navLinks.forEach(link => {
        const targetId = link.getAttribute('href');
        if (targetId && targetId.startsWith('#')) {
            sectionNavMap[targetId.substring(1)] = link;
        }
    });
    
    // Create the Intersection Observer
    const observerOptions = {
        root: null, // Use the viewport as the root
        rootMargin: '-100px 0px -70% 0px', // Adjust these values to control when sections are considered "visible"
        threshold: 0 // Trigger when any part of the section is visible
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            // Get the section ID
            const id = entry.target.getAttribute('id');
            
            // Find the corresponding nav link
            const navLink = sectionNavMap[id];
            
            if (navLink) {
                if (entry.isIntersecting) {
                    // Add active class to the nav link
                    navLinks.forEach(link => link.classList.remove('active'));
                    navLink.classList.add('active');
                }
            }
        });
    }, observerOptions);
    
    // Observe all sections
    sections.forEach(section => {
        observer.observe(section);
    });
    
    // Also observe the hero section if it exists
    const heroSection = document.getElementById('hero');
    if (heroSection) {
        observer.observe(heroSection);
    }
    
    console.log("Scroll spy initialized");
}
