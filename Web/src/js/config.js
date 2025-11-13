/* ==========================================
   APPLICATION CONFIGURATION
   ==========================================*/

// Device detection utilities
const detectDevice = () => {
    const userAgent = navigator.userAgent;
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
    const isTablet = /(iPad|Tablet|PlayBook|Silk)|(Android(?!.*Mobile))/i.test(userAgent);
    const isDesktop = !isMobile && !isTablet;
    const isIOS = /iPad|iPhone|iPod/.test(userAgent);
    const isAndroid = /Android/i.test(userAgent);
    
    return {
        isMobile,
        isTablet,
        isDesktop,
        isIOS,
        isAndroid,
        isTouchDevice: 'ontouchstart' in window || navigator.maxTouchPoints > 0
    };
};

// Environment detection
const getEnvironment = () => {
    const hostname = window.location.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.includes('local')) {
        return 'development';
    } else if (hostname.includes('staging') || hostname.includes('test')) {
        return 'staging';
    }
    return 'production';
};

// Dynamic configuration based on device and environment
const device = detectDevice();
const environment = getEnvironment();

export const CONFIG = {
    // Device information
    device,
    environment,
    
    // Slideshow settings - adjusted for device performance
    slideInterval: device.isMobile ? 6000 : 5000,
    
    // Marketing psychology timers - optimized per device
    exitIntentDelay: device.isMobile ? 30000 : 45000,
    urgencyBarDelay: device.isMobile ? 20000 : 30000,
    socialProofInterval: device.isMobile ? 15000 : 12000,
    socialProofDelay: device.isMobile ? 10000 : 8000,
    countdownDuration: 15 * 60 * 1000, // 15 minutes
    
    // Business contact - could be loaded from env or API
    contact: {
        whatsappNumber: '6282148489595',
        email: 'cardosebox@gmail.com',
        phone: '+62-821-4848-9595',
        address: {
            street: 'Raya Grogol 110',
            city: 'Sukoharjo',
            country: 'Indonesia',
            coordinates: { lat: -7.6783, lng: 110.8403 }
        },
        businessHours: {
            weekday: { open: '08:00', close: '17:00' },
            saturday: { open: '08:00', close: '17:00' },
            sunday: { open: 'appointment', close: 'only' }
        }
    },
    
    // Application settings
    version: '2.0.0',
    
    // Feature flags based on device capabilities
    features: {
        enableExitIntent: device.isDesktop, // Only on desktop
        enableSocialProof: true,
        enableUrgencyBar: true,
        enableAnalytics: environment === 'production',
        enableServiceWorker: 'serviceWorker' in navigator,
        enablePushNotifications: 'Notification' in window,
        enableGeolocation: 'geolocation' in navigator
    },
    
    // Animation settings optimized for device
    animations: {
        defaultDuration: device.isMobile ? 600 : 800,
        defaultEasing: 'ease-out-cubic',
        offset: device.isMobile ? 50 : 100,
        once: true,
        disableOnLowPerformance: true
    },
    
    // Responsive breakpoints in CSS custom properties format
    breakpoints: {
        xs: 320,   // Small phones
        sm: 576,   // Large phones
        md: 768,   // Tablets
        lg: 1024,  // Laptops
        xl: 1280,  // Desktops
        xxl: 1536  // Large desktops
    },
    
    // Touch and interaction settings
    touch: {
        swipeThreshold: 50,
        longPressDelay: 500,
        tapTolerance: 10,
        enableHoverOnTouch: device.isTouchDevice
    },
    
    // Performance settings
    performance: {
        lazyLoadOffset: device.isMobile ? 200 : 300,
        imageQuality: device.isMobile ? 'medium' : 'high',
        enableImageOptimization: true,
        deferNonCriticalJS: device.isMobile,
        preloadCriticalResources: !device.isMobile
    }
};

// Social proof data
export const SOCIAL_PROOF_DATA = [
    { name: 'Ibu Sarah', action: 'memesan Executive Gold Collection', time: '2 menit lalu', avatar: 'S' },
    { name: 'Pak Ahmad', action: 'berkonsultasi untuk corporate gifts', time: '5 menit lalu', avatar: 'A' },
    { name: 'Ibu Maya', action: 'memesan Midnight Elegance Series', time: '8 menit lalu', avatar: 'M' },
    { name: 'Pak Budi', action: 'menanyakan wedding favor packages', time: '12 menit lalu', avatar: 'B' },
    { name: 'Ibu Dina', action: 'memesan custom gift box', time: '15 menit lalu', avatar: 'D' }
];

// Collection preview data
export const COLLECTION_PREVIEWS = {
    'executive-gold': {
        title: 'Executive Gold Collection',
        features: [
            'Premium brown & gold materials',
            'Corporate-grade finishing',
            'Custom logo embossing',
            'Perfect for business gifts',
            'Size range: Small to Large',
            'Lead time: 3-5 days'
        ]
    },
    'midnight-elegance': {
        title: 'Midnight Elegance Series',
        features: [
            'Ultra-luxury black presentation',
            'Gold accent detailing',
            'Sophisticated ribbon design',
            'Ideal for exclusive occasions',
            'Premium protective packaging',
            'Lead time: 5-7 days'
        ]
    },
    'heritage-craft': {
        title: 'Heritage Craft Collection',
        features: [
            'Traditional Indonesian motifs',
            'Modern interpretation',
            'Cultural heritage celebration',
            'Artisan-crafted details',
            'Sustainable materials',
            'Lead time: 7-10 days'
        ]
    },
    'crystal-luxe': {
        title: 'Crystal Luxe Series',
        features: [
            'Crystal-inspired design',
            'Premium metallic accents',
            'Wedding & milestone focus',
            'Elegant presentation',
            'Luxury gift box included',
            'Lead time: 5-7 days'
        ]
    }
};

export default CONFIG;