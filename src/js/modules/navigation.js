/* ==========================================
   NAVIGATION MODULE
   ==========================================*/

class Navigation {
    constructor() {
        this.hamburger = null;
        this.navMenu = null;
        this.header = null;
        this.isMenuOpen = false;
        this.scrollThreshold = 100;
    }

    init() {
        this.hamburger = document.querySelector('.hamburger');
        this.navMenu = document.querySelector('.nav-menu');
        this.header = document.querySelector('.header');

        if (!this.hamburger || !this.navMenu) return false;

        this.bindEvents();
        this.initSmoothScrolling();
        this.initHeaderScrollEffects();
        this.initActiveLinks();

        return true;
    }

    bindEvents() {
        // Mobile hamburger menu
        this.hamburger.addEventListener('click', () => {
            this.toggleMobileMenu();
        });

        // Close menu on outside click
        document.addEventListener('click', (e) => {
            if (this.isMenuOpen && 
                !this.navMenu.contains(e.target) && 
                !this.hamburger.contains(e.target)) {
                this.closeMobileMenu();
            }
        });

        // Close menu on escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isMenuOpen) {
                this.closeMobileMenu();
            }
        });

        // Close menu on link click
        this.navMenu.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                this.closeMobileMenu();
            });
        });

        // Prevent menu close when clicking inside
        this.navMenu.addEventListener('click', (e) => {
            e.stopPropagation();
        });
    }

    toggleMobileMenu() {
        this.isMenuOpen = !this.isMenuOpen;
        this.navMenu.classList.toggle('active', this.isMenuOpen);
        this.hamburger.setAttribute('aria-expanded', this.isMenuOpen);
        this.hamburger.classList.toggle('active', this.isMenuOpen);
        
        // Prevent body scroll when menu is open
        document.body.style.overflow = this.isMenuOpen ? 'hidden' : '';

        // Animate hamburger icon
        this.animateHamburgerIcon(this.isMenuOpen);
    }

    closeMobileMenu() {
        this.isMenuOpen = false;
        this.navMenu.classList.remove('active');
        this.hamburger.setAttribute('aria-expanded', 'false');
        this.hamburger.classList.remove('active');
        document.body.style.overflow = '';
        this.animateHamburgerIcon(false);
    }

    animateHamburgerIcon(isActive) {
        const spans = this.hamburger.querySelectorAll('span');
        if (spans.length >= 3) {
            spans[0].style.transform = isActive 
                ? 'rotate(45deg) translateY(6px)' 
                : 'none';
            spans[1].style.opacity = isActive ? '0' : '1';
            spans[2].style.transform = isActive 
                ? 'rotate(-45deg) translateY(-6px)' 
                : 'none';
        }
    }

    initSmoothScrolling() {
        // Smooth scrolling for anchor links
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', (e) => {
                const href = anchor.getAttribute('href');
                if (href === '#') return;
                
                e.preventDefault();
                const target = document.querySelector(href);
                if (target) {
                    const headerHeight = this.header ? this.header.offsetHeight : 80;
                    const offsetTop = target.offsetTop - headerHeight;
                    
                    window.scrollTo({
                        top: offsetTop,
                        behavior: 'smooth'
                    });

                    // Update active link
                    this.updateActiveLink(href);
                }
            });
        });
    }

    initHeaderScrollEffects() {
        if (!this.header) return;

        let lastScrollY = 0;
        let ticking = false;

        const updateHeader = () => {
            const scrollY = window.pageYOffset;

            // Add scrolled class for styling
            this.header.classList.toggle('scrolled', scrollY > this.scrollThreshold);

            // Get urgency bar element
            const urgencyBar = document.getElementById('urgencyBar');

            // Hide/show header on scroll (optional)
            if (scrollY > lastScrollY && scrollY > 200) {
                this.header.style.transform = 'translateY(-100%)';
                // Move urgency bar up when header hides
                if (urgencyBar && urgencyBar.classList.contains('show')) {
                    urgencyBar.style.top = '0';
                }
            } else {
                this.header.style.transform = 'translateY(0)';
                // Move urgency bar back down when header shows
                if (urgencyBar && urgencyBar.classList.contains('show')) {
                    urgencyBar.style.top = window.innerWidth <= 768 ? '70px' : '80px';
                }
            }

            lastScrollY = scrollY;
            ticking = false;
        };

        window.addEventListener('scroll', () => {
            if (!ticking) {
                requestAnimationFrame(updateHeader);
                ticking = true;
            }
        });
    }

    initActiveLinks() {
        // Update active navigation links based on scroll position
        const sections = document.querySelectorAll('section[id]');
        const navLinks = this.navMenu.querySelectorAll('a[href^="#"]');

        if (!sections.length) return;

        const updateActiveLink = () => {
            const scrollY = window.pageYOffset;
            const headerHeight = this.header ? this.header.offsetHeight : 80;

            sections.forEach(section => {
                const sectionTop = section.offsetTop - headerHeight - 50;
                const sectionBottom = sectionTop + section.offsetHeight;
                const sectionId = `#${  section.getAttribute('id')}`;

                if (scrollY >= sectionTop && scrollY < sectionBottom) {
                    navLinks.forEach(link => {
                        link.classList.toggle('active', link.getAttribute('href') === sectionId);
                    });
                }
            });
        };

        let ticking = false;
        window.addEventListener('scroll', () => {
            if (!ticking) {
                requestAnimationFrame(updateActiveLink);
                ticking = true;
            }
        });
    }

    updateActiveLink(href) {
        const navLinks = this.navMenu.querySelectorAll('a[href^="#"]');
        navLinks.forEach(link => {
            link.classList.toggle('active', link.getAttribute('href') === href);
        });
    }

    // Public API methods
    openMenu() {
        if (!this.isMenuOpen) {
            this.toggleMobileMenu();
        }
    }

    closeMenu() {
        if (this.isMenuOpen) {
            this.closeMobileMenu();
        }
    }

    isMenuVisible() {
        return this.isMenuOpen;
    }

    destroy() {
        this.closeMobileMenu();
        document.body.style.overflow = '';
    }
}

export default Navigation;