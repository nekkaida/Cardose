/* ==========================================
   SLIDESHOW MODULE
   ==========================================*/

import { CONFIG } from '../config.js';

class Slideshow {
    constructor() {
        this.currentSlide = 1;
        this.slideTimer = null;
        this.slides = null;
        this.dots = null;
        this.isInitialized = false;
    }

    init() {
        this.slides = document.querySelectorAll('.slide');
        this.dots = document.querySelectorAll('.dot');
        
        if (!this.slides.length) return false;
        
        // Initialize first slide as active
        this.slides[0]?.classList.add('active');
        this.dots[0]?.classList.add('active');
        
        this.bindEvents();
        this.start();
        
        this.isInitialized = true;
        return true;
    }

    bindEvents() {
        // Dot navigation
        this.dots.forEach((dot, index) => {
            dot.addEventListener('click', () => {
                this.showSlide(index + 1);
                this.reset();
            });
        });

        // Pause on hover
        const sliderContainer = document.querySelector('.hero-slider');
        if (sliderContainer) {
            sliderContainer.addEventListener('mouseenter', () => this.pause());
            sliderContainer.addEventListener('mouseleave', () => this.start());
        }

        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowLeft') {
                this.showSlide(this.currentSlide - 1);
                this.reset();
            } else if (e.key === 'ArrowRight') {
                this.showSlide(this.currentSlide + 1);
                this.reset();
            }
        });
    }

    showSlide(n) {
        if (!this.slides.length) return;
        
        // Normalize slide index
        if (n > this.slides.length) this.currentSlide = 1;
        else if (n < 1) this.currentSlide = this.slides.length;
        else this.currentSlide = n;
        
        // Update slides
        this.slides.forEach((slide, index) => {
            slide.classList.toggle('active', index === this.currentSlide - 1);
        });
        
        // Update dots
        this.dots.forEach((dot, index) => {
            dot.classList.toggle('active', index === this.currentSlide - 1);
        });

        // Trigger analytics
        this.trackSlideView(this.currentSlide);
    }

    start() {
        if (this.slides.length <= 1) return;
        
        this.slideTimer = setInterval(() => {
            this.showSlide(this.currentSlide + 1);
        }, CONFIG.slideInterval);
    }

    pause() {
        if (this.slideTimer) {
            clearInterval(this.slideTimer);
            this.slideTimer = null;
        }
    }

    reset() {
        this.pause();
        this.start();
    }

    destroy() {
        this.pause();
        this.isInitialized = false;
    }

    trackSlideView(slideNumber) {
        if (window.analytics && typeof window.analytics.track === 'function') {
            window.analytics.track('slide_viewed', {
                slideNumber: slideNumber,
                slideTotal: this.slides.length
            });
        }
    }

    // Public API methods
    next() {
        this.showSlide(this.currentSlide + 1);
        this.reset();
    }

    previous() {
        this.showSlide(this.currentSlide - 1);
        this.reset();
    }

    goToSlide(slideNumber) {
        this.showSlide(slideNumber);
        this.reset();
    }

    getCurrentSlide() {
        return this.currentSlide;
    }

    getTotalSlides() {
        return this.slides.length;
    }
}

export default Slideshow;