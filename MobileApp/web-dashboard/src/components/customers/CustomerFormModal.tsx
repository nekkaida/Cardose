import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import type { Customer, BusinessType, CustomerCreatePayload } from '@shared/types/customers';

const BUSINESS_TYPES: BusinessType[] = ['corporate', 'individual', 'wedding', 'trading', 'event'];

const BUSINESS_TYPE_I18N: Record<BusinessType, string> = {
  corporate: 'customers.corporate',
  individual: 'customers.individual',
  wedding: 'customers.wedding',
  trading: 'customers.trading',
  event: 'customers.event',
};

interface FormData {
  name: string;
  email: string;
  phone: string;
  business_type: BusinessType;
  address: string;
  notes: string;
}

const EMPTY_FORM: FormData = {
  name: '',
  email: '',
  phone: '',
  business_type: 'individual',
  address: '',
  notes: '',
};

export interface CustomerFormModalProps {
  open: boolean;
  editingCustomer: Customer | null;
  onClose: () => void;
  onSave: (payload: CustomerCreatePayload) => Promise<void>;
  saving: boolean;
}

const CustomerFormModal: React.FC<CustomerFormModalProps> = ({
  open,
  editingCustomer,
  onClose,
  onSave,
  saving,
}) => {
  const { t } = useLanguage();

  const [formData, setFormData] = useState<FormData>({ ...EMPTY_FORM });
  const [initialFormData, setInitialFormData] = useState<FormData>({ ...EMPTY_FORM });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

  const modalRef = useRef<HTMLDivElement>(null);
  const firstInputRef = useRef<HTMLInputElement>(null);

  const isFormDirty = useCallback(() => {
    return JSON.stringify(formData) !== JSON.stringify(initialFormData);
  }, [formData, initialFormData]);

  // Initialize form when modal opens or editingCustomer changes
  useEffect(() => {
    if (!open) return;
    const data: FormData = editingCustomer
      ? {
          name: editingCustomer.name,
          email: editingCustomer.email || '',
          phone: editingCustomer.phone || '',
          business_type: editingCustomer.business_type || 'individual',
          address: editingCustomer.address || '',
          notes: editingCustomer.notes || '',
        }
      : { ...EMPTY_FORM };
    setFormData(data);
    setInitialFormData(data);
    setFormError(null);
    setFieldErrors({});
    setShowDiscardConfirm(false);
  }, [open, editingCustomer]);

  // Focus trap
  useEffect(() => {
    if (!open) return;
    const modal = modalRef.current;
    if (!modal) return;

    requestAnimationFrame(() => {
      firstInputRef.current?.focus();
    });

    const focusableSelector = 'input, select, textarea, button, [tabindex]:not([tabindex="-1"])';

    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const focusableElements = modal.querySelectorAll<HTMLElement>(focusableSelector);
      if (focusableElements.length === 0) return;
      const firstEl = focusableElements[0];
      const lastEl = focusableElements[focusableElements.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === firstEl) {
          e.preventDefault();
          lastEl?.focus();
        }
      } else {
        if (document.activeElement === lastEl) {
          e.preventDefault();
          firstEl?.focus();
        }
      }
    };

    document.addEventListener('keydown', handleTab);
    return () => document.removeEventListener('keydown', handleTab);
  }, [open]);

  // ESC key handler
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (saving) return;
        if (showDiscardConfirm) {
          setShowDiscardConfirm(false);
          return;
        }
        handleCloseModal();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, saving, showDiscardConfirm, formData, initialFormData]);

  const handleCloseModal = useCallback(() => {
    if (saving) return;
    if (isFormDirty()) {
      setShowDiscardConfirm(true);
    } else {
      onClose();
    }
  }, [saving, isFormDirty, onClose]);

  const confirmDiscard = () => {
    setShowDiscardConfirm(false);
    onClose();
  };

  const updateField = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (fieldErrors[field]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.name.trim()) {
      errors.name = t('customers.nameRequired');
    }
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(formData.email)) {
      errors.email = t('customers.invalidEmail');
    }
    if (formData.phone && !/^[+\d][\d\s\-()]{5,20}$/.test(formData.phone)) {
      errors.phone = t('customers.invalidPhone');
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;
    const payload: CustomerCreatePayload = {
      name: formData.name.trim(),
      email: formData.email.trim() || undefined,
      phone: formData.phone.trim() || undefined,
      business_type: formData.business_type,
      address: formData.address.trim() || undefined,
      notes: formData.notes.trim() || undefined,
    };
    try {
      setFormError(null);
      await onSave(payload);
    } catch {
      setFormError(t('customers.saveError'));
    }
  };

  if (!open) return null;

  return (
    <>
      {/* Create/Edit Modal */}
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4"
        onClick={(e) => {
          if (e.target === e.currentTarget) handleCloseModal();
        }}
      >
        <div
          ref={modalRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="customer-modal-title"
          className="w-full max-w-lg rounded-2xl bg-white shadow-xl"
        >
          <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
            <h2 id="customer-modal-title" className="text-lg font-semibold text-gray-900">
              {editingCustomer ? t('customers.editCustomer') : t('customers.new')}
            </h2>
            <button
              onClick={handleCloseModal}
              aria-label={t('customers.close')}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
          <div className="max-h-[70vh] space-y-4 overflow-y-auto p-6">
            {formError && (
              <div
                className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
                role="alert"
              >
                {formError}
              </div>
            )}
            <div>
              <label
                htmlFor="customer-name"
                className="mb-1 block text-sm font-medium text-gray-700"
              >
                {t('customers.name')} <span className="text-red-500">*</span>
              </label>
              <input
                ref={firstInputRef}
                id="customer-name"
                type="text"
                required
                aria-required="true"
                aria-invalid={!!fieldErrors.name}
                aria-describedby={fieldErrors.name ? 'customer-name-error' : undefined}
                maxLength={255}
                disabled={saving}
                value={formData.name}
                onChange={(e) => updateField('name', e.target.value)}
                className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-50 disabled:text-gray-500 ${
                  fieldErrors.name ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder={t('customers.namePlaceholder')}
              />
              {fieldErrors.name && (
                <p id="customer-name-error" className="mt-1 text-xs text-red-600">
                  {fieldErrors.name}
                </p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="customer-email"
                  className="mb-1 block text-sm font-medium text-gray-700"
                >
                  {t('customers.email')}
                </label>
                <input
                  id="customer-email"
                  type="email"
                  maxLength={255}
                  disabled={saving}
                  aria-invalid={!!fieldErrors.email}
                  aria-describedby={fieldErrors.email ? 'customer-email-error' : undefined}
                  value={formData.email}
                  onChange={(e) => updateField('email', e.target.value)}
                  className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-50 disabled:text-gray-500 ${
                    fieldErrors.email ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder={t('customers.emailPlaceholder')}
                />
                {fieldErrors.email && (
                  <p id="customer-email-error" className="mt-1 text-xs text-red-600">
                    {fieldErrors.email}
                  </p>
                )}
              </div>
              <div>
                <label
                  htmlFor="customer-phone"
                  className="mb-1 block text-sm font-medium text-gray-700"
                >
                  {t('customers.phone')}
                </label>
                <input
                  id="customer-phone"
                  type="tel"
                  maxLength={25}
                  disabled={saving}
                  aria-invalid={!!fieldErrors.phone}
                  aria-describedby={fieldErrors.phone ? 'customer-phone-error' : undefined}
                  value={formData.phone}
                  onChange={(e) => updateField('phone', e.target.value)}
                  className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-50 disabled:text-gray-500 ${
                    fieldErrors.phone ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder={t('customers.phonePlaceholder')}
                />
                {fieldErrors.phone && (
                  <p id="customer-phone-error" className="mt-1 text-xs text-red-600">
                    {fieldErrors.phone}
                  </p>
                )}
              </div>
            </div>
            <div>
              <label
                htmlFor="customer-business-type"
                className="mb-1 block text-sm font-medium text-gray-700"
              >
                {t('customers.businessType')}
              </label>
              <select
                id="customer-business-type"
                disabled={saving}
                value={formData.business_type}
                onChange={(e) => updateField('business_type', e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-50 disabled:text-gray-500"
              >
                {BUSINESS_TYPES.map((bt) => (
                  <option key={bt} value={bt}>
                    {t(BUSINESS_TYPE_I18N[bt])}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                htmlFor="customer-address"
                className="mb-1 block text-sm font-medium text-gray-700"
              >
                {t('customers.address')}
              </label>
              <textarea
                id="customer-address"
                disabled={saving}
                maxLength={500}
                value={formData.address}
                onChange={(e) => updateField('address', e.target.value)}
                rows={2}
                className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-50 disabled:text-gray-500"
                placeholder={t('customers.addressPlaceholder')}
              />
            </div>
            <div>
              <label
                htmlFor="customer-notes"
                className="mb-1 block text-sm font-medium text-gray-700"
              >
                {t('customers.notes')}
              </label>
              <textarea
                id="customer-notes"
                disabled={saving}
                maxLength={1000}
                value={formData.notes}
                onChange={(e) => updateField('notes', e.target.value)}
                rows={2}
                className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-50 disabled:text-gray-500"
                placeholder={t('customers.notesPlaceholder')}
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 border-t border-gray-100 px-6 py-4">
            <button
              onClick={handleCloseModal}
              disabled={saving}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              {t('common.cancel')}
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !formData.name.trim()}
              className="rounded-lg bg-primary-600 px-4 py-2 text-sm text-white hover:bg-primary-700 disabled:opacity-50"
            >
              {saving
                ? t('customers.saving')
                : editingCustomer
                  ? t('customers.update')
                  : t('customers.create')}
            </button>
          </div>
        </div>
      </div>

      {/* Discard Confirmation */}
      {showDiscardConfirm && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowDiscardConfirm(false);
          }}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="discard-title"
            aria-describedby="discard-message"
            className="w-full max-w-sm rounded-2xl bg-white shadow-xl"
          >
            <div className="p-6 text-center">
              <h3 id="discard-title" className="mb-2 text-lg font-semibold text-gray-900">
                {t('customers.discardTitle')}
              </h3>
              <p id="discard-message" className="text-sm text-gray-500">
                {t('customers.discardMessage')}
              </p>
            </div>
            <div className="flex justify-end gap-3 border-t border-gray-100 px-6 py-4">
              <button
                onClick={() => setShowDiscardConfirm(false)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                {t('customers.keepEditing')}
              </button>
              <button
                onClick={confirmDiscard}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700"
              >
                {t('customers.discardBtn')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default CustomerFormModal;
