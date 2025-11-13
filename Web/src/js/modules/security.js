/* ==========================================
   SECURITY MODULE - Input Sanitization
   ==========================================*/

/**
 * Sanitizes user input to prevent XSS attacks
 */
export class SecurityUtils {
    /**
     * Sanitize text input by escaping HTML entities
     * @param {string} input - The input string to sanitize
     * @returns {string} - Sanitized string
     */
    static sanitizeText(input) {
        if (typeof input !== 'string') {
            return '';
        }
        
        return input
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#x27;')
            .replace(/\//g, '&#x2F;')
            .trim();
    }
    
    /**
     * Validate email format
     * @param {string} email - Email to validate
     * @returns {boolean} - True if valid email format
     */
    static isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
    
    /**
     * Validate phone number (Indonesian format)
     * @param {string} phone - Phone number to validate
     * @returns {boolean} - True if valid phone format
     */
    static isValidPhone(phone) {
        const phoneRegex = /^(\+62|62|0)[0-9]{8,12}$/;
        return phoneRegex.test(phone.replace(/[\s-]/g, ''));
    }
    
    /**
     * Validate WhatsApp number format
     * @param {string} number - WhatsApp number to validate
     * @returns {boolean} - True if valid WhatsApp format
     */
    static isValidWhatsAppNumber(number) {
        const waRegex = /^[1-9][0-9]{7,14}$/;
        return waRegex.test(number);
    }
    
    /**
     * Sanitize form data object
     * @param {Object} formData - Form data to sanitize
     * @returns {Object} - Sanitized form data
     */
    static sanitizeFormData(formData) {
        const sanitized = {};
        
        for (const [key, value] of Object.entries(formData)) {
            if (typeof value === 'string') {
                sanitized[key] = this.sanitizeText(value);
            } else {
                sanitized[key] = value;
            }
        }
        
        return sanitized;
    }
    
    /**
     * Create safe WhatsApp message
     * @param {Object} data - Sanitized form data
     * @returns {string} - Safe WhatsApp message
     */
    static createSafeWhatsAppMessage(data) {
        const safeName = data.name || 'Not provided';
        const safeEmail = data.email || 'Not provided';
        const safePhone = data.phone || 'Not provided';
        const safeBoxType = data.boxType || 'Not specified';
        const safeMessage = data.message || 'No additional details';
        
        return `Hi! I'm interested in your Premium Gift Box services.

Name: ${safeName}
Email: ${safeEmail}
Phone: ${safePhone}
Project Type: ${safeBoxType}
Details: ${safeMessage}

Thank you for your time!`;
    }
    
    /**
     * Validate and sanitize contact form data
     * @param {FormData} formData - Raw form data
     * @returns {Object} - Validation result with sanitized data
     */
    static validateContactForm(formData) {
        const data = Object.fromEntries(formData);
        const sanitized = this.sanitizeFormData(data);
        const errors = [];
        
        // Required field validation
        if (!sanitized.name || sanitized.name.length < 2) {
            errors.push('Name must be at least 2 characters long');
        }
        
        if (!sanitized.email) {
            errors.push('Email is required');
        } else if (!this.isValidEmail(sanitized.email)) {
            errors.push('Please enter a valid email address');
        }
        
        // Optional phone validation
        if (sanitized.phone && !this.isValidPhone(sanitized.phone)) {
            errors.push('Please enter a valid phone number');
        }
        
        // Message length validation
        if (sanitized.message && sanitized.message.length > 1000) {
            errors.push('Message must be less than 1000 characters');
        }
        
        return {
            isValid: errors.length === 0,
            errors,
            data: sanitized
        };
    }
}

export default SecurityUtils;