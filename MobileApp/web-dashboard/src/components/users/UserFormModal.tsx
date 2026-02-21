import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { UserData, UserRole, CreateUserPayload } from '@shared/types/users';
import { useLanguage } from '../../contexts/LanguageContext';

// ── Types ──────────────────────────────────────────────────────────

export interface UserFormModalProps {
  open: boolean;
  editingUser: UserData | null;
  onClose: () => void;
  onSave: (formData: CreateUserPayload | Record<string, string>) => Promise<void>;
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
  const [formError, setFormError] = useState<string | null>(null);

  const modalRef = useRef<HTMLDivElement>(null);

  // ── Initialize form when modal opens or editingUser changes ────

  useEffect(() => {
    if (!open) return;
    if (editingUser) {
      setFormData({
        username: editingUser.username,
        email: editingUser.email,
        password: '',
        full_name: editingUser.full_name,
        phone: editingUser.phone || '',
        role: editingUser.role,
      });
    } else {
      setFormData(EMPTY_FORM);
    }
    setFormError(null);
  }, [open, editingUser]);

  // ── ESC key handler ────────────────────────────────────────────

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  // ── Backdrop click ─────────────────────────────────────────────

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        onClose();
      }
    },
    [onClose]
  );

  // ── Form submission ────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setFormError(null);
      if (editingUser) {
        const updates: Record<string, string> = {
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
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        t('users.saveError');
      setFormError(msg);
    }
  };

  // ── Render ─────────────────────────────────────────────────────

  if (!open) return null;

  return (
    <div // eslint-disable-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions -- Escape key handled via useEffect
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
    >
      <div ref={modalRef} className="w-full max-w-md rounded-xl bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          {editingUser ? t('users.editUser') : t('users.createUser')}
        </h2>
        {formError && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {formError}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="user-full-name"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              {t('users.fullName')}
            </label>
            <input
              id="user-full-name"
              type="text"
              required
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-600"
            />
          </div>
          <div>
            <label htmlFor="user-username" className="mb-1 block text-sm font-medium text-gray-700">
              {t('users.username')}
            </label>
            <input
              id="user-username"
              type="text"
              required
              value={formData.username}
              disabled={!!editingUser}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              className={`w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-600 ${editingUser ? 'cursor-not-allowed bg-gray-100' : ''}`}
            />
          </div>
          <div>
            <label htmlFor="user-email" className="mb-1 block text-sm font-medium text-gray-700">
              {t('users.email')}
            </label>
            <input
              id="user-email"
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-600"
            />
          </div>
          <div>
            <label htmlFor="user-password" className="mb-1 block text-sm font-medium text-gray-700">
              {t('users.password')}
              {editingUser ? t('users.passwordEditHint') : ''}
            </label>
            <input
              id="user-password"
              type="password"
              required={!editingUser}
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-600"
            />
          </div>
          <div>
            <label htmlFor="user-phone" className="mb-1 block text-sm font-medium text-gray-700">
              {t('users.phone')}
            </label>
            <input
              id="user-phone"
              type="text"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-600"
            />
          </div>
          <div>
            <label htmlFor="user-role" className="mb-1 block text-sm font-medium text-gray-700">
              {t('users.role')}
            </label>
            <select
              id="user-role"
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-600"
            >
              <option value="employee">{t('users.employee')}</option>
              <option value="manager">{t('users.manager')}</option>
              <option value="owner">{t('users.owner')}</option>
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50"
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
