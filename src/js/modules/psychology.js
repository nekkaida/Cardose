// Psychology module for conversion optimization features
import { CONFIG } from '../config.js';

export class Psychology {
    constructor() {
        this.whatsappNumber = CONFIG.contact.whatsappNumber;
        this.exitIntentShown = false;
        this.urgencyBarShown = false;
    }

    init() {
        this.initializeExitIntent();
        this.initializeUrgencyBar();
        this.initializeSocialProof();
        this.initializeScarcityIndicators();
    }

    // Exit Intent Popup
    initializeExitIntent() {
        const popup = document.getElementById('exitIntentPopup');
        if (!popup) {
            return;
        }

        // Desktop: mouse leave to top
        document.addEventListener('mouseleave', (e) => {
            if (e.clientY <= 0 && !this.exitIntentShown) {
                this.showExitIntentPopup(popup);
            }
        });

        // Mobile/testing: show after 30 seconds
        setTimeout(() => {
            if (!this.exitIntentShown) {
                this.showExitIntentPopup(popup);
            }
        }, 30000);

        this.setupExitIntentActions(popup);
    }

    showExitIntentPopup(popup) {
        popup.classList.add('show');
        this.exitIntentShown = true;
        this.startCountdown();
        
        // Track event
        if (typeof gtag !== 'undefined') {
            gtag('event', 'exit_intent_shown', {
                eventCategory: 'engagement',
                eventLabel: 'popup'
            });
        }
    }

    setupExitIntentActions(popup) {
        const closeBtn = popup.querySelector('.popup-close');
        const declineBtn = popup.querySelector('.popup-decline');
        const acceptBtn = popup.querySelector('.popup-accept');

        closeBtn?.addEventListener('click', () => this.closeExitIntent(popup));
        declineBtn?.addEventListener('click', () => this.closeExitIntent(popup));
        
        acceptBtn?.addEventListener('click', () => {
            this.handleExitIntentAccept(popup);
        });
    }

    closeExitIntent(popup) {
        popup.classList.remove('show');
        
        if (typeof gtag !== 'undefined') {
            gtag('event', 'exit_intent_closed', {
                eventCategory: 'engagement',
                eventLabel: 'popup'
            });
        }
    }

    handleExitIntentAccept(popup) {
        const message = 'Hi! I saw your special offer popup. I would like to claim the FREE consultation and 15% discount for Premium Gift Box services.';
        const whatsappUrl = `https://wa.me/${this.whatsappNumber}?text=${encodeURIComponent(message)}`;

        window.open(whatsappUrl, '_blank');
        popup.classList.remove('show');
        
        if (typeof gtag !== 'undefined') {
            gtag('event', 'exit_intent_converted', {
                eventCategory: 'conversion',
                eventLabel: 'whatsapp_click',
                value: 1
            });
        }
    }

    // Countdown Timer
    startCountdown() {
        let minutes = 14;
        let seconds = 59;
        
        const minutesEl = document.getElementById('minutes');
        const secondsEl = document.getElementById('seconds');
        
        const interval = setInterval(() => {
            if (seconds === 0) {
                if (minutes === 0) {
                    clearInterval(interval);
                    return;
                }
                minutes--;
                seconds = 59;
            } else {
                seconds--;
            }
            
            if (minutesEl) minutesEl.textContent = minutes.toString().padStart(2, '0');
            if (secondsEl) secondsEl.textContent = seconds.toString().padStart(2, '0');
        }, 1000);
    }

    // Urgency Bar
    initializeUrgencyBar() {
        const urgencyBar = document.getElementById('urgencyBar');
        if (!urgencyBar) {
            return;
        }

        // Show after delay
        setTimeout(() => {
            if (!this.urgencyBarShown) {
                urgencyBar.classList.add('show');
                this.urgencyBarShown = true;
            }
        }, 10000);

        this.setupUrgencyBarActions(urgencyBar);
    }

    setupUrgencyBarActions(urgencyBar) {
        const closeBtn = urgencyBar.querySelector('.urgency-close');
        const ctaBtn = urgencyBar.querySelector('.urgency-cta');

        closeBtn?.addEventListener('click', () => {
            urgencyBar.classList.remove('show');
        });

        ctaBtn?.addEventListener('click', () => {
            const message = 'Hi! I saw there are only 3 consultation slots left this month. I would like to book one for Premium Gift Box services.';
            const whatsappUrl = `https://wa.me/${this.whatsappNumber}?text=${encodeURIComponent(message)}`;
            window.open(whatsappUrl, '_blank');
            
            if (typeof gtag !== 'undefined') {
                gtag('event', 'urgency_bar_clicked', {
                    eventCategory: 'conversion',
                    eventLabel: 'whatsapp_click'
                });
            }
        });
    }

    // Social Proof Notifications
    initializeSocialProof() {
        const container = document.getElementById('socialProofNotifications');
        if (!container) return;

        const notifications = [
            { text: 'Sarah from Jakarta just ordered corporate gift boxes', avatar: 'S', type: 'order' },
            { text: 'Andi & Maya booked wedding favor consultation', avatar: 'A', type: 'consultation' },
            { text: 'Budi from Surabaya placed a bulk order', avatar: 'B', type: 'order' },
            { text: 'Lisa just requested a custom design quote', avatar: 'L', type: 'quote' },
            { text: 'PT. Maju Bersama renewed their corporate package', avatar: 'M', type: 'renewal' },
            { text: 'Someone from Solo just viewed our portfolio', avatar: '👤', type: 'view' }
        ];

        // Show first notification after delay
        setTimeout(() => this.showSocialProofNotification(container, notifications), 5000);
        
        // Continue showing notifications periodically
        setInterval(() => this.showSocialProofNotification(container, notifications), 20000);
    }

    showSocialProofNotification(container, notifications) {
        const notification = notifications[Math.floor(Math.random() * notifications.length)];
        
        const el = document.createElement('div');
        el.className = 'social-notification';
        el.innerHTML = `
            <div class="notification-avatar">${notification.avatar}</div>
            <div class="notification-content">
                <div class="notification-text">${notification.text}</div>
                <div class="notification-time">${Math.floor(Math.random() * 15) + 1} minutes ago</div>
            </div>
        `;
        
        container.appendChild(el);
        
        // Show animation
        setTimeout(() => {
            el.classList.add('show');
        }, 100);
        
        // Hide animation
        setTimeout(() => {
            el.classList.remove('show');
            setTimeout(() => {
                if (container.contains(el)) {
                    container.removeChild(el);
                }
            }, 300);
        }, 4000);
    }

    // Scarcity Indicators
    initializeScarcityIndicators() {
        this.updateSlotCount();
        this.showLimitedTimeOffers();
    }

    updateSlotCount() {
        const slotElements = document.querySelectorAll('[data-dynamic="slots"]');
        const remainingSlots = Math.floor(Math.random() * 5) + 1; // 1-5 slots
        
        slotElements.forEach(el => {
            el.textContent = remainingSlots;
        });
    }

    showLimitedTimeOffers() {
        const offerElements = document.querySelectorAll('.limited-offer');

        offerElements.forEach(el => {
            // Add urgency styling via CSS class (animation already in CSS)
            el.classList.add('active');
        });
    }

    // Analytics tracking
    trackConversion(action, label = '', value = 0) {
        if (typeof gtag !== 'undefined') {
            gtag('event', action, {
                eventCategory: 'conversion',
                eventLabel: label,
                value: value
            });
        }
    }

    trackEngagement(action, label = '') {
        if (typeof gtag !== 'undefined') {
            gtag('event', action, {
                eventCategory: 'engagement',
                eventLabel: label
            });
        }
    }
}

export default Psychology;