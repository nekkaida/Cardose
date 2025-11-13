// Main entry point for Premium Gift Box website
import { CONFIG } from './config.js';
import Slideshow from './modules/slideshow.js';
import Navigation from './modules/navigation.js';
import { SecurityUtils } from './modules/security.js';
import Psychology from './modules/psychology.js';

// Initialize application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Remove no-js class and add device classes
    document.documentElement.classList.remove('no-js');
    document.documentElement.classList.add(
        CONFIG.device.isMobile ? 'mobile' : 
            CONFIG.device.isTablet ? 'tablet' : 'desktop'
    );
    
    if (CONFIG.device.isTouchDevice) {
        document.documentElement.classList.add('touch');
    }
    
    if (CONFIG.device.isIOS) {
        document.documentElement.classList.add('ios');
        // Fix iOS viewport height issue
        const setViewportHeight = () => {
            document.documentElement.style.setProperty('--vh', `${window.innerHeight * 0.01}px`);
        };
        setViewportHeight();
        window.addEventListener('resize', setViewportHeight);
    }
    
    if (CONFIG.device.isAndroid) {
        document.documentElement.classList.add('android');
    }
    
    // Initialize all modules
    const slideshow = new Slideshow();
    const navigation = new Navigation();
    const psychology = new Psychology();
    
    slideshow.init();
    navigation.init();
    psychology.init();
    
    // Initialize AOS animations with device-specific settings
    if (typeof AOS !== 'undefined') {
        AOS.init({
            duration: CONFIG.animations.defaultDuration,
            easing: CONFIG.animations.defaultEasing,
            once: CONFIG.animations.once,
            offset: CONFIG.animations.offset,
            disable: CONFIG.device.isMobile && CONFIG.animations.disableOnLowPerformance
        });
    }
    
    // Remove loading screen
    const loading = document.getElementById('loading');
    if (loading) {
        setTimeout(() => {
            loading.style.opacity = '0';
            setTimeout(() => {
                loading.style.display = 'none';
            }, 300);
        }, 1000);
    }
    
    // Initialize other features
    initializeContactForm();
    initializeWhatsAppButton();
    initializeFAQ();
    initializePortfolioFilters();
    initializeCollectionPreviews();
    // Note: Urgency bar is initialized by Psychology class above (line 42)

    // Register Service Worker for PWA functionality
    if (CONFIG.features.enableServiceWorker) {
        registerServiceWorker();
    }
});

// Service Worker registration
function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/sw.js')
                .then(registration => {
                    console.log('ServiceWorker registered successfully:', registration.scope);
                })
                .catch(error => {
                    console.error('ServiceWorker registration failed:', error);
                });
        });
    }
}

// Contact form functionality
function initializeContactForm() {
    const form = document.getElementById('contactForm');
    if (!form) return;
    
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const formData = new FormData(form);
        
        // Validate and sanitize form data
        const validation = SecurityUtils.validateContactForm(formData);
        
        if (!validation.isValid) {
            showFormErrors(validation.errors);
            return;
        }
        
        // Create safe WhatsApp message
        const message = SecurityUtils.createSafeWhatsAppMessage(validation.data);
        
        // Validate WhatsApp number
        if (!SecurityUtils.isValidWhatsAppNumber(CONFIG.contact.whatsappNumber)) {
            showFormErrors(['Invalid WhatsApp configuration. Please contact support.']);
            return;
        }
        
        const whatsappUrl = `https://wa.me/${CONFIG.contact.whatsappNumber}?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, '_blank');
        
        // Show success message and reset form
        showFormSuccess('Message prepared! You will be redirected to WhatsApp.');
        form.reset();
    });
}

// Show form validation errors
function showFormErrors(errors) {
    // Remove existing error messages
    const existingErrors = document.querySelectorAll('.form-error');
    existingErrors.forEach(error => error.remove());
    
    // Create error container
    const errorContainer = document.createElement('div');
    errorContainer.className = 'form-error-container';
    errorContainer.innerHTML = `
        <div class="form-error">
            <ul>
                ${errors.map(error => `<li>${error}</li>`).join('')}
            </ul>
        </div>
    `;
    
    const form = document.getElementById('contactForm');
    form.insertBefore(errorContainer, form.firstChild);
    
    // Remove after 5 seconds
    setTimeout(() => {
        errorContainer.remove();
    }, 5000);
}

// Show form success message
function showFormSuccess(message) {
    const successContainer = document.createElement('div');
    successContainer.className = 'form-success-container';
    successContainer.innerHTML = `
        <div class="form-success">
            ${message}
        </div>
    `;
    
    const form = document.getElementById('contactForm');
    form.insertBefore(successContainer, form.firstChild);
    
    // Remove after 3 seconds
    setTimeout(() => {
        successContainer.remove();
    }, 3000);
}

// WhatsApp button functionality
function initializeWhatsAppButton() {
    const waButton = document.querySelector('.wa-main-button');
    if (!waButton) return;
    
    waButton.addEventListener('click', () => {
        const message = 'Hi! I would like to know more about your Premium Gift Box services.';
        const whatsappUrl = `https://wa.me/${CONFIG.contact.whatsappNumber}?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, '_blank');
    });
}

// Note: Exit intent and social proof functionality moved to psychology.js module

// FAQ accordion
function initializeFAQ() {
    const faqItems = document.querySelectorAll('.faq-item');
    
    faqItems.forEach(item => {
        const question = item.querySelector('.faq-question');
        
        question.addEventListener('click', () => {
            const isOpen = item.classList.contains('active');
            
            // Close all FAQ items
            faqItems.forEach(otherItem => {
                otherItem.classList.remove('active');
            });
            
            // Open clicked item if it wasn't already open
            if (!isOpen) {
                item.classList.add('active');
            }
        });
    });
}

// Portfolio filters
function initializePortfolioFilters() {
    const filterBtns = document.querySelectorAll('.filter-btn');
    const portfolioItems = document.querySelectorAll('.portfolio-item');
    
    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const filter = btn.dataset.filter;
            
            // Update active button
            filterBtns.forEach(otherBtn => otherBtn.classList.remove('active'));
            btn.classList.add('active');
            
            // Filter portfolio items
            portfolioItems.forEach(item => {
                if (filter === 'all' || item.classList.contains(filter)) {
                    item.style.display = 'block';
                } else {
                    item.style.display = 'none';
                }
            });
        });
    });
}

// Collection preview functionality
function initializeCollectionPreviews() {
    const previewBtns = document.querySelectorAll('.quick-preview');
    
    previewBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const collection = btn.dataset.collection;
            // Here you could implement a modal or detailed view
            alert(`Preview for ${collection} collection - This would open a detailed gallery`);
        });
    });
}

// Note: initializeUrgencyBar() and initializeCollectionPreviews()
// are called from the main DOMContentLoaded listener at the top of the file
// No need for duplicate listener here