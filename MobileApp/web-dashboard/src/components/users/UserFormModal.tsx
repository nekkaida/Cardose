import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { UserData, UserRole, CreateUserPayload, UpdateUserPayload } from '@shared/types/users';
import { useLanguage } from '../../contexts/LanguageContext';

// ── Types ──────────────────────────────────────────────────────────

export interface UserFormModalProps {
  open: boolean;
  editingUser: UserData | null;
  onClose: () => void;
  onSave: (formData: CreateUserPayload | UpdateUserPayload) => Promise<void>;
  saving: boolean;
}

// ── Constants ──────────────────────────────────────────────────────

const EMPTY_FORM = {
  username: '',
  email: '',
  password: '',
  full_name: '',
  phone: '',
  role: 'employee' as UserRole,
};

type FormKey = keyof typeof EMPTY_FORM;

// ── Component ──────────────────────────────────────────────────────

const UserFormModal: React.FC<UserFormModalProps> = ({
  open,
  editingUser,
  onClose,
  onSave,
  saving,
}) => {
  const { t } = useLanguage();

  const [formData, setFormData] = useState(EMPTY_FORM);
  const [initialFormData, setInitialFormData] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

  const modalRef = useRef<HTMLDivElement>(null);
  const firstInputRef = useRef<HTMLInputElement>(null);

  // ── Initialize form when modal opens or editingUser changes ────

  useEffect(() => {
    if (!open) return;
    const data = editingUser
      ? {
          username: editingUser.username,
          email: editingUser.email,
          password: '',
          full_name: editingUser.full_name,
          phone: editingUser.phone || '',
          role: editingUser.role,
        }
      : { ...EMPTY_FORM };
    setFormData(data);
    setInitialFormData(data);
    setFormError(null);
    setFieldErrors({});
    setShowDiscardConfirm(false);
  }, [open, editingUser]);

  // ── Dirty form detection ─────────────────────────────────────

  const isFormDirty = useCallback(() => {
    return JSON.stringify(formData) !== JSON.stringify(initialFormData);
  }, [formData, initialFormData]);

  // ── Close handler (prevent close during save, prompt on dirty) ──

  const handleCloseAttempt = useCallback(() => {
    if (saving) return;
    if (isFormDirty()) {
      setShowDiscardConfirm(true);
    } else {
      onClose();
    }
  }, [saving, isFormDirty, onClose]);

  // ── ESC key handler ────────────────────────────────────────────

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (saving) return;
        if (showDiscardConfirm) {
          setShowDiscardConfirm(false);
          return;
        }
        handleCloseAttempt();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, saving, showDiscardConfirm, handleCloseAttempt]);

  // ── Focus trap ────────────────────────────────────────────────

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

  // ── Backdrop click ─────────────────────────────────────────────

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (saving) return;
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        handleCloseAttempt();
      }
    },
    [saving, handleCloseAttempt]
  );

  // ── Field update (clears field error on type) ──────────────────

  const updateField = useCallback(
    (field: FormKey, value: string) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
      if (fieldErrors[field]) {
        setFieldErrors((prev) => {
          const next = { ...prev };
          delete next[field];
          return next;
        });
      }
    },
    [fieldErrors]
  );

  // ── Field-level validation ─────────────────────────────────────

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.full_name.trim()) {
      errors.full_name = t('users.validation.fullNameRequired');
    } else if (formData.full_name.trim().length < 2 || formData.full_name.trim().length > 100) {
      errors.full_name = t('users.validation.fullNameLength');
    }

    if (!editingUser) {
      if (!formData.username.trim()) {
        errors.username = t('users.validation.usernameRequired');
      } else if (!/^[a-zA-Z][a-zA-Z0-9_]{2,29}$/.test(formData.username)) {
        errors.username = t('users.validation.usernameFormat');
      }
    }

    if (!formData.email.trim()) {
      errors.email = t('users.validation.emailRequired');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(formData.email)) {
      errors.email = t('users.validation.emailFormat');
    }

    if (!editingUser && !formData.password) {
      errors.password = t('users.validation.passwordRequired');
    } else if (formData.password && formData.password.length < 6) {
      errors.password = t('users.validation.passwordMin');
    }

    if (formData.phone && !/^[+\d][\d\s\-()]{5,20}$/.test(formData.phone)) {
      errors.phone = t('users.validation.phoneFormat');
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // ── Form submission ────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      setFormError(null);
      if (editingUser) {
        const updates: UpdateUserPayload = {
          full_name: formData.full_name,
          email: formData.email,
          phone: formData.phone,
          role: formData.role,
        };
        if (formData.password) updates.password = formData.password;
        await onSave(updates);
      } else {
        await onSave(formData as CreateUserPayload);
      }
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } } };
      const serverError = axiosErr?.response?.data?.error;

      // Map known server errors to field-level errors
      if (serverError?.toLowerCase().includes('username')) {
        setFieldErrors((prev) => ({ ...prev, username: t('users.validation.usernameTaken') }));
      } else if (serverError?.toLowerCase().includes('email')) {
        setFieldErrors((prev) => ({ ...prev, email: t('users.validation.emailTaken') }));
      } else {
        setFormError(serverError || t('users.saveError'));
      }
    }
  };

  // ── Render ─────────────────────────────────────────────────────

  if (!open) return null;

  const inputClass = (field: string) =>
    `w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-600 disabled:bg-gray-50 disabled:text-gray-500 ${
      fieldErrors[field] ? 'border-red-300' : 'border-gray-300'
    }`;

  return (
    <div // eslint-disable-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions -- Escape key handled via useEffect
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="user-modal-title"
    >
      <div ref={modalRef} className="relative w-full max-w-md rounded-xl bg-white p-6">
        {/* Discard confirmation overlay */}
        {showDiscardConfirm && (
          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-white/95">
            <div
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="user-discard-title"
              aria-describedby="user-discard-message"
              className="px-6 text-center"
            >
              <p id="user-discard-title" className="sr-only">
                {t('users.discardChanges')}
              </p>
              <p id="user-discard-message" className="mb-4 text-sm text-gray-700">
                {t('users.unsavedChanges')}
              </p>
              <div className="flex justify-center gap-3">
                <button
                  onClick={() => setShowDiscardConfirm(false)}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  {t('users.keepEditing')}
                </button>
                <button
                  onClick={onClose}
                  className="rounded-lg bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700"
                >
                  {t('users.discardChanges')}
                </button>
              </div>
            </div>
          </div>
        )}

        <h2 id="user-modal-title" className="mb-4 text-lg font-semibold text-gray-900">
          {editingUser ? t('users.editUser') : t('users.createUser')}
        </h2>

        {formError && (
          <div
            className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
            role="alert"
          >
            {formError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {/* Full Name */}
          <div>
            <label
              htmlFor="user-full-name"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              {t('users.fullName')} <span className="text-red-500">*</span>
            </label>
            <input
              ref={firstInputRef}
              id="user-full-name"
              type="text"
              maxLength={100}
              disabled={saving}
              aria-required="true"
              aria-invalid={!!fieldErrors.full_name}
              aria-describedby={fieldErrors.full_name ? 'user-full-name-error' : undefined}
              value={formData.full_name}
              onChange={(e) => updateField('full_name', e.target.value)}
              className={inputClass('full_name')}
            />
            {fieldErrors.full_name && (
              <p id="user-full-name-error" className="mt-1 text-xs text-red-600">
                {fieldErrors.full_name}
              </p>
            )}
          </div>

          {/* Username */}
          <div>
            <label htmlFor="user-username" className="mb-1 block text-sm font-medium text-gray-700">
              {t('users.username')} {!editingUser && <span className="text-red-500">*</span>}
            </label>
            <input
              id="user-username"
              type="text"
              maxLength={30}
              aria-required="true"
              aria-invalid={!!fieldErrors.username}
              aria-describedby={fieldErrors.username ? 'user-username-error' : undefined}
              value={formData.username}
              disabled={!!editingUser || saving}
              onChange={(e) => updateField('username', e.target.value)}
              className={`${inputClass('username')} ${editingUser ? 'cursor-not-allowed bg-gray-100' : ''}`}
            />
            {fieldErrors.username && (
              <p id="user-username-error" className="mt-1 text-xs text-red-600">
                {fieldErrors.username}
              </p>
            )}
          </div>

          {/* Email */}
          <div>
            <label htmlFor="user-email" className="mb-1 block text-sm font-medium text-gray-700">
              {t('users.email')} <span className="text-red-500">*</span>
            </label>
            <input
              id="user-email"
              type="email"
              maxLength={255}
              disabled={saving}
              aria-required="true"
              aria-invalid={!!fieldErrors.email}
              aria-describedby={fieldErrors.email ? 'user-email-error' : undefined}
              value={formData.email}
              onChange={(e) => updateField('email', e.target.value)}
              className={inputClass('email')}
            />
            {fieldErrors.email && (
              <p id="user-email-error" className="mt-1 text-xs text-red-600">
                {fieldErrors.email}
              </p>
            )}
          </div>

          {/* Password */}
          <div>
            <label htmlFor="user-password" className="mb-1 block text-sm font-medium text-gray-700">
              {t('users.password')}
              {!editingUser && <span className="text-red-500"> *</span>}
              {editingUser && (
                <span className="font-normal text-gray-400">{t('users.passwordEditHint')}</span>
              )}
            </label>
            <input
              id="user-password"
              type="password"
              maxLength={128}
              disabled={saving}
              aria-required={!editingUser ? 'true' : undefined}
              aria-invalid={!!fieldErrors.password}
              aria-describedby={
                fieldErrors.password
                  ? 'user-password-error'
                  : editingUser && formData.password
                    ? 'user-password-warning'
                    : undefined
              }
              value={formData.password}
              onChange={(e) => updateField('password', e.target.value)}
              className={inputClass('password')}
            />
            {fieldErrors.password && (
              <p id="user-password-error" className="mt-1 text-xs text-red-600">
                {fieldErrors.password}
              </p>
            )}
            {editingUser && formData.password && !fieldErrors.password && (
              <p id="user-password-warning" className="mt-1 text-xs text-amber-600">
                {t('users.passwordWarning')}
              </p>
            )}
          </div>

          {/* Phone */}
          <div>
            <label htmlFor="user-phone" className="mb-1 block text-sm font-medium text-gray-700">
              {t('users.phone')}
            </label>
            <input
              id="user-phone"
              type="tel"
              maxLength={25}
              disabled={saving}
              aria-invalid={!!fieldErrors.phone}
              aria-describedby={fieldErrors.phone ? 'user-phone-error' : undefined}
              value={formData.phone}
              onChange={(e) => updateField('phone', e.target.value)}
              className={inputClass('phone')}
            />
            {fieldErrors.phone && (
              <p id="user-phone-error" className="mt-1 text-xs text-red-600">
                {fieldErrors.phone}
              </p>
            )}
          </div>

          {/* Role */}
          <div>
            <label htmlFor="user-role" className="mb-1 block text-sm font-medium text-gray-700">
              {t('users.role')}
            </label>
            <select
              id="user-role"
              disabled={saving}
              value={formData.role}
              onChange={(e) => updateField('role', e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-600 disabled:bg-gray-50 disabled:text-gray-500"
            >
              <option value="employee">{t('users.employee')}</option>
              <option value="manager">{t('users.manager')}</option>
              <option value="owner">{t('users.owner')}</option>
            </select>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={handleCloseAttempt}
              disabled={saving}
              className="rounded-lg border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              {t('users.cancel')}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-primary-600 px-4 py-2 text-white hover:bg-primary-700 disabled:opacity-50"
            >
              {saving
                ? t('users.saving')
                : editingUser
                  ? t('users.saveChanges')
                  : t('users.addUser')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserFormModal;
