import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useApi } from '../contexts/ApiContext';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import ConfirmDeleteDialog from '../components/ConfirmDeleteDialog';
import Toast from '../components/Toast';
import type { SettingData, SettingsMap } from '@shared/types/settings';
import { SETTING_REGISTRY, SETTING_CATEGORIES } from '@shared/types/settings';

// ── Constants ──────────────────────────────────────────────────────

const KEY_FORMAT_REGEX = /^[a-z][a-z0-9_]{0,99}$/;

// ── Helpers ────────────────────────────────────────────────────────

function getSettingCategory(key: string): string {
  return SETTING_REGISTRY[key]?.category || 'other';
}

function getSettingLabel(key: string, t: (k: string) => string): string {
  const meta = SETTING_REGISTRY[key];
  if (meta) {
    const i18nKey = `settings.label.${key}`;
    const translated = t(i18nKey);
    return translated !== i18nKey ? translated : meta.label;
  }
  return key;
}

function validateSettingValue(key: string, value: string, t: (k: string) => string): string | null {
  const meta = SETTING_REGISTRY[key];
  if (meta?.type === 'number') {
    const num = Number(value);
    if (isNaN(num)) return `${getSettingLabel(key, t)}: ${t('settings.invalidNumber')}`;
    if (meta.min !== undefined && num < meta.min)
      return `${getSettingLabel(key, t)}: ${t('settings.numberTooLow').replace('{min}', String(meta.min))}`;
    if (meta.max !== undefined && num > meta.max)
      return `${getSettingLabel(key, t)}: ${t('settings.numberTooHigh').replace('{max}', String(meta.max))}`;
  }
  if (meta?.type === 'select' && meta.options && !meta.options.includes(value))
    return `${getSettingLabel(key, t)}: ${t('settings.invalidOption')}`;
  if (meta?.type === 'boolean' && !['0', '1', 'true', 'false'].includes(value))
    return `${getSettingLabel(key, t)}: ${t('settings.invalidBoolean')}`;
  return null;
}

function classifyError(
  err: unknown,
  t: (k: string) => string
): { message: string; type: 'network' | 'permission' | 'server' } {
  const axiosErr = err as {
    response?: { status?: number; data?: { error?: string } };
    request?: unknown;
  };

  if (!axiosErr.response && axiosErr.request) {
    return { message: t('settings.networkError'), type: 'network' };
  }
  if (axiosErr.response?.status === 403) {
    return {
      message: axiosErr.response.data?.error || t('settings.permissionError'),
      type: 'permission',
    };
  }
  return {
    message: axiosErr.response?.data?.error || t('settings.saveError'),
    type: 'server',
  };
}

// ── Toast state ────────────────────────────────────────────────────

interface ToastState {
  message: string;
  type: 'success' | 'error' | 'warning';
}

// ── Sub-components ─────────────────────────────────────────────────

// Typed setting value editor
const SettingValueEditor: React.FC<{
  settingKey: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  t: (k: string) => string;
}> = ({ settingKey, value, onChange, disabled, t }) => {
  const meta = SETTING_REGISTRY[settingKey];
  const inputClass =
    'rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600 disabled:opacity-50';

  if (!meta) {
    return (
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        maxLength={1000}
        aria-label={t('settings.value')}
        className={`${inputClass} w-48`}
        autoFocus
      />
    );
  }

  if (meta.type === 'boolean') {
    return (
      <button
        type="button"
        role="switch"
        aria-checked={value === '1' || value === 'true'}
        disabled={disabled}
        onClick={() => onChange(value === '1' || value === 'true' ? '0' : '1')}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary-600 focus:ring-offset-2 disabled:opacity-50 ${
          value === '1' || value === 'true' ? 'bg-primary-600' : 'bg-gray-300'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${
            value === '1' || value === 'true' ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    );
  }

  if (meta.type === 'select' && meta.options) {
    return (
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        aria-label={t('settings.value')}
        className={`${inputClass} w-32`}
      >
        {meta.options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    );
  }

  if (meta.type === 'number') {
    return (
      <div className="flex items-center gap-1.5">
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          min={meta.min}
          max={meta.max}
          aria-label={t('settings.value')}
          className={`${inputClass} w-24`}
          autoFocus
        />
        {meta.unit && <span className="text-xs text-gray-500">{meta.unit}</span>}
      </div>
    );
  }

  // Default: text input
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      maxLength={1000}
      aria-label={t('settings.value')}
      className={`${inputClass} w-48`}
      autoFocus
    />
  );
};

// Readonly display for setting values
const SettingValueDisplay: React.FC<{
  settingKey: string;
  value: string;
  t: (k: string) => string;
}> = ({ settingKey, value, t }) => {
  const meta = SETTING_REGISTRY[settingKey];

  if (meta?.type === 'boolean') {
    const isOn = value === '1' || value === 'true';
    return (
      <span
        className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
          isOn ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
        }`}
      >
        {isOn ? t('settings.enabled') : t('settings.disabled')}
      </span>
    );
  }

  if (meta?.type === 'number' && meta.unit) {
    return (
      <span className="rounded bg-gray-50 px-3 py-1 font-mono text-sm text-gray-700">
        {value}
        <span className="ml-1 text-xs text-gray-400">{meta.unit}</span>
      </span>
    );
  }

  return (
    <span className="max-w-xs truncate rounded bg-gray-50 px-3 py-1 font-mono text-sm text-gray-700">
      {value}
    </span>
  );
};

// Setting row component
const SettingRow: React.FC<{
  settingKey: string;
  setting: SettingData;
  isEditing: boolean;
  editValue: string;
  saving: boolean;
  canWrite: boolean;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  onDelete: () => void;
  onEditValueChange: (v: string) => void;
  t: (k: string) => string;
}> = ({
  settingKey,
  setting,
  isEditing,
  editValue,
  saving,
  canWrite,
  onEdit,
  onSave,
  onCancel,
  onDelete,
  onEditValueChange,
  t,
}) => {
  const label = getSettingLabel(settingKey, t);
  const isRegistered = !!SETTING_REGISTRY[settingKey];

  return (
    <div className="flex items-center justify-between px-6 py-4 hover:bg-gray-50">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-gray-900">{isRegistered ? label : settingKey}</p>
          {setting.is_protected && (
            <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
              {t('settings.protected')}
            </span>
          )}
        </div>
        {isRegistered && <p className="mt-0.5 font-mono text-[11px] text-gray-400">{settingKey}</p>}
        {setting.description && !isRegistered && (
          <p className="mt-0.5 text-xs text-gray-500">{setting.description}</p>
        )}
      </div>
      <div className="ml-4 flex items-center gap-3">
        {isEditing ? (
          <>
            <SettingValueEditor
              settingKey={settingKey}
              value={editValue}
              onChange={onEditValueChange}
              disabled={saving}
              t={t}
            />
            <button
              onClick={onSave}
              disabled={saving}
              className="rounded bg-green-100 px-2.5 py-1 text-xs font-medium text-green-800 hover:bg-green-200 disabled:opacity-50"
            >
              {saving ? t('settings.saving') : t('settings.save')}
            </button>
            <button
              onClick={onCancel}
              disabled={saving}
              className="rounded bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-200"
            >
              {t('settings.cancel')}
            </button>
          </>
        ) : (
          <>
            <SettingValueDisplay settingKey={settingKey} value={setting.value} t={t} />
            {canWrite && (
              <>
                <button
                  onClick={onEdit}
                  className="rounded bg-blue-100 px-2.5 py-1 text-xs font-medium text-blue-800 hover:bg-blue-200"
                >
                  {t('settings.edit')}
                </button>
                {!setting.is_protected && (
                  <button
                    onClick={onDelete}
                    className="rounded bg-red-100 px-2.5 py-1 text-xs font-medium text-red-800 hover:bg-red-200"
                  >
                    {t('settings.delete')}
                  </button>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
};

// Add Setting Modal with focus trapping
const AddSettingModal: React.FC<{
  onClose: () => void;
  onSubmit: (key: string, value: string, description: string) => Promise<void>;
  existingKeys: string[];
  saving: boolean;
  t: (k: string) => string;
}> = ({ onClose, onSubmit, existingKeys, saving, t }) => {
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  // Store the previously focused element and restore on close
  useEffect(() => {
    previousFocusRef.current = document.activeElement as HTMLElement;
    return () => {
      previousFocusRef.current?.focus();
    };
  }, []);

  // Focus trapping + ESC
  useEffect(() => {
    const dialog = modalRef.current;
    if (!dialog) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !saving) {
        onClose();
        return;
      }

      if (e.key !== 'Tab') return;

      const focusable = dialog.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose, saving]);

  const validateKey = (key: string): string | null => {
    if (!key) return t('settings.keyRequired');
    if (!KEY_FORMAT_REGEX.test(key)) return t('settings.keyFormatError');
    if (existingKeys.includes(key)) return t('settings.keyDuplicate');
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const keyError = validateKey(newKey);
    if (keyError) {
      setFormError(keyError);
      return;
    }
    if (!newValue.trim()) {
      setFormError(t('settings.valueRequired'));
      return;
    }
    if (newValue.length > 1000) {
      setFormError(t('settings.valueTooLong'));
      return;
    }
    try {
      setFormError(null);
      await onSubmit(newKey, newValue, newDescription);
    } catch (err: unknown) {
      const { message } = classifyError(err, t);
      setFormError(message);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !saving) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-label={t('settings.addNewSetting')}
    >
      <div
        ref={modalRef}
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl bg-white p-6 shadow-xl"
      >
        <h2 className="mb-4 text-lg font-semibold text-gray-900">{t('settings.addNewSetting')}</h2>
        {formError && (
          <div
            className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
            role="alert"
            id="add-form-error"
          >
            {formError}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="setting-key" className="mb-1 block text-sm font-medium text-gray-700">
              {t('settings.key')}
            </label>
            <input
              id="setting-key"
              type="text"
              required
              value={newKey}
              onChange={(e) => {
                setNewKey(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''));
                setFormError(null);
              }}
              placeholder={t('settings.keyPlaceholder')}
              maxLength={100}
              aria-describedby={formError ? 'add-form-error' : 'key-hint'}
              aria-invalid={!!formError}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary-600"
              autoFocus
            />
            <p id="key-hint" className="mt-1 text-xs text-gray-400">
              {t('settings.keyHint')}
            </p>
          </div>
          <div>
            <label htmlFor="setting-value" className="mb-1 block text-sm font-medium text-gray-700">
              {t('settings.value')}
            </label>
            <input
              id="setting-value"
              type="text"
              required
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              maxLength={1000}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-600"
            />
          </div>
          <div>
            <label
              htmlFor="setting-description"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              {t('settings.description')}
            </label>
            <input
              id="setting-description"
              type="text"
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              placeholder={t('settings.descriptionPlaceholder')}
              maxLength={500}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-600"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-lg border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              {t('settings.cancel')}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-primary-600 px-4 py-2 text-white hover:bg-primary-700 disabled:opacity-50"
            >
              {saving ? t('settings.saving') : t('settings.addSetting')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ── Main Component ─────────────────────────────────────────────────

const SettingsPage: React.FC = () => {
  const [settings, setSettings] = useState<SettingsMap>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusMessage, setStatusMessage] = useState('');

  const { getSettings, updateSetting, deleteSetting, batchUpdateSettings } = useApi();
  const { user } = useAuth();
  const { t, language, setLanguage } = useLanguage();

  const canWrite = user?.role === 'owner' || user?.role === 'manager';

  // Stable ref for t to prevent loadSettings from recreating on every render
  const tRef = useRef(t);
  tRef.current = t;

  // ── Data loading ──────────────────────────────────────────────

  const loadSettings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getSettings();
      setSettings(data.settings || {});
    } catch (err: unknown) {
      const { message } = classifyError(err, tRef.current);
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [getSettings]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  // ── Grouped & filtered settings ───────────────────────────────

  const groupedSettings = useMemo(() => {
    const entries = Object.entries(settings);
    const query = searchQuery.toLowerCase();

    const filtered = query
      ? entries.filter(
          ([key, setting]) =>
            key.toLowerCase().includes(query) ||
            (setting.description?.toLowerCase().includes(query) ?? false) ||
            getSettingLabel(key, t).toLowerCase().includes(query)
        )
      : entries;

    const groups: Record<string, [string, SettingData][]> = {};
    for (const entry of filtered) {
      const cat = getSettingCategory(entry[0]);
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(entry);
    }

    // Sort categories: defined categories first, then 'other'
    const categoryOrder = Object.keys(SETTING_CATEGORIES);
    const sorted = Object.entries(groups).sort(([a], [b]) => {
      const ia = categoryOrder.indexOf(a);
      const ib = categoryOrder.indexOf(b);
      return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
    });

    return sorted;
  }, [settings, searchQuery, t]);

  const totalSettings = Object.keys(settings).length;

  // ── Actions ───────────────────────────────────────────────────

  const statusTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const announceStatus = useCallback((message: string) => {
    clearTimeout(statusTimeoutRef.current);
    setStatusMessage(message);
    statusTimeoutRef.current = setTimeout(() => setStatusMessage(''), 3000);
  }, []);

  const showToast = useCallback((message: string, type: ToastState['type']) => {
    setToast({ message, type });
  }, []);

  const handleEdit = useCallback(
    (key: string, setting: SettingData) => {
      // Block switching if current edit has unsaved changes
      if (editingKey && editingKey !== key && editValue !== (settings[editingKey]?.value || '')) {
        showToast(t('settings.unsavedWarning'), 'warning');
        return;
      }
      setEditingKey(key);
      setEditValue(setting.value || '');
    },
    [editingKey, editValue, settings, showToast, t]
  );

  const handleCancelEdit = useCallback(() => {
    setEditingKey(null);
    setEditValue('');
  }, []);

  const handleSave = useCallback(
    async (key: string) => {
      // Validate typed settings
      const validationError = validateSettingValue(key, editValue, t);
      if (validationError) {
        showToast(validationError, 'error');
        return;
      }

      // Optimistic update
      const previousSettings = { ...settings };
      const previousValue = settings[key]?.value;
      setSettings((prev) => ({
        ...prev,
        [key]: { ...prev[key], value: editValue },
      }));
      setEditingKey(null);

      try {
        setSaving(true);
        await updateSetting(key, {
          value: editValue,
          description: settings[key]?.description || undefined,
        });
        showToast(t('settings.updateSuccess'), 'success');
        announceStatus(t('settings.updateSuccess'));
      } catch (err: unknown) {
        // Revert on failure
        setSettings(previousSettings);
        setEditingKey(key);
        setEditValue(previousValue || '');
        const { message } = classifyError(err, t);
        showToast(message, 'error');
      } finally {
        setSaving(false);
      }
    },
    [editValue, settings, updateSetting, showToast, announceStatus, t]
  );

  const handleDeleteConfirmed = useCallback(async () => {
    if (!deleteConfirm) return;
    const keyToDelete = deleteConfirm;

    try {
      setDeleting(true);
      setDeleteError(null);
      await deleteSetting(keyToDelete);
      // Remove from local state after successful API delete
      setSettings((prev) => {
        const next = { ...prev };
        delete next[keyToDelete];
        return next;
      });
      setDeleteConfirm(null);
      showToast(t('settings.deleteSuccess'), 'success');
      announceStatus(t('settings.deleteSuccess'));
    } catch (err: unknown) {
      const { message } = classifyError(err, t);
      setDeleteError(message);
    } finally {
      setDeleting(false);
    }
  }, [deleteConfirm, deleteSetting, showToast, announceStatus, t]);

  const cancelDelete = useCallback(() => {
    setDeleteConfirm(null);
    setDeleteError(null);
  }, []);

  const handleAdd = useCallback(
    async (key: string, value: string, description: string) => {
      setSaving(true);
      try {
        await updateSetting(key, { value, description });
        // Optimistic add
        setSettings((prev) => ({
          ...prev,
          [key]: { value, description, is_protected: false },
        }));
        setShowAddForm(false);
        showToast(t('settings.createSuccess'), 'success');
        announceStatus(t('settings.createSuccess'));
      } finally {
        setSaving(false);
      }
    },
    [updateSetting, showToast, announceStatus, t]
  );

  // ── Export / Import ───────────────────────────────────────────

  const handleExport = useCallback(() => {
    const exportData: Record<string, { value: string; description: string | null }> = {};
    for (const [key, setting] of Object.entries(settings)) {
      exportData[key] = { value: setting.value, description: setting.description };
    }
    const json = JSON.stringify(exportData, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `settings-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(t('settings.exportSuccess'), 'success');
  }, [settings, showToast, t]);

  const handleImport = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        if (typeof data !== 'object' || data === null || Array.isArray(data)) {
          showToast(t('settings.importInvalidFormat'), 'error');
          return;
        }

        // Validate all keys and values before sending anything
        const batch: Record<string, { value: string; description?: string | null }> = {};
        for (const [key, val] of Object.entries(data)) {
          if (!KEY_FORMAT_REGEX.test(key)) {
            showToast(t('settings.importInvalidKey').replace('{key}', key), 'error');
            return;
          }
          const setting = val as { value?: string; description?: string | null };
          if (typeof setting.value !== 'string') continue;
          if (setting.value.length > 1000) {
            showToast(t('settings.valueTooLong'), 'error');
            return;
          }

          // Validate typed settings against registry metadata
          const validationError = validateSettingValue(key, setting.value, t);
          if (validationError) {
            showToast(validationError, 'error');
            return;
          }

          batch[key] = { value: setting.value };
          if (setting.description !== undefined) {
            batch[key].description = setting.description;
          }
        }

        if (Object.keys(batch).length === 0) {
          showToast(t('settings.importInvalidFormat'), 'error');
          return;
        }

        // Single transactional batch call
        setSaving(true);
        await batchUpdateSettings(batch);
        await loadSettings();
        showToast(t('settings.importSuccess'), 'success');
      } catch {
        showToast(t('settings.importError'), 'error');
      } finally {
        setSaving(false);
      }
    };
    input.click();
    // Clean up the detached input element
    input.remove();
  }, [batchUpdateSettings, loadSettings, showToast, t]);

  // ── Render ────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* ARIA live region for screen readers */}
      <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {statusMessage}
      </div>

      {/* Toast notification */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('settings.title')}</h1>
          <p className="text-gray-600">{t('settings.subtitle')}</p>
        </div>
        <div className="flex items-center gap-3">
          {canWrite && (
            <>
              <button
                onClick={handleExport}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50"
                title={t('settings.exportSettings')}
              >
                {t('settings.export')}
              </button>
              <button
                onClick={handleImport}
                disabled={saving}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
                title={t('settings.importSettings')}
              >
                {t('settings.import')}
              </button>
              <button
                onClick={() => setShowAddForm(true)}
                className="rounded-lg bg-primary-600 px-4 py-2 text-sm text-white transition-colors hover:bg-primary-700"
              >
                {t('settings.addSetting')}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Inline error banner */}
      {error && (
        <div
          className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700"
          role="alert"
        >
          <span className="text-sm">{error}</span>
          <button
            onClick={() => {
              setError(null);
              loadSettings();
            }}
            className="text-sm font-medium text-red-600 underline"
          >
            {t('settings.tryAgain')}
          </button>
        </div>
      )}

      {/* Language selector */}
      <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">{t('settings.language')}</h2>
        <div className="flex items-center gap-4">
          <select
            aria-label={t('settings.language')}
            value={language}
            onChange={(e) => setLanguage(e.target.value as 'en' | 'id')}
            className="rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary-600"
          >
            <option value="en">{t('settings.langEnglish')}</option>
            <option value="id">{t('settings.langIndonesian')}</option>
          </select>
          <span className="text-sm text-gray-500">{t('settings.languageHint')}</span>
        </div>
      </div>

      {/* Search bar */}
      {!loading && totalSettings > 0 && (
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('settings.searchPlaceholder')}
            aria-label={t('settings.searchPlaceholder')}
            className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-600"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              aria-label={t('settings.clearSearch')}
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          )}
        </div>
      )}

      {/* System Settings — categorized */}
      <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">{t('settings.systemSettings')}</h2>
          <p className="text-sm text-gray-500">
            {totalSettings} {t('settings.settingsCount')}
            {searchQuery &&
              groupedSettings.reduce((sum, [, entries]) => sum + entries.length, 0) !==
                totalSettings && (
                <span className="ml-1">
                  ({groupedSettings.reduce((sum, [, entries]) => sum + entries.length, 0)}{' '}
                  {t('settings.matching')})
                </span>
              )}
          </p>
        </div>

        {loading ? (
          <div className="flex h-48 items-center justify-center">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-primary-600" />
          </div>
        ) : totalSettings === 0 ? (
          <div className="px-6 py-8 text-center text-gray-500">{t('settings.noSettings')}</div>
        ) : groupedSettings.length === 0 ? (
          <div className="px-6 py-8 text-center text-gray-500">{t('settings.noSearchResults')}</div>
        ) : (
          <div>
            {groupedSettings.map(([category, entries]) => (
              <div key={category}>
                {/* Category header */}
                <div className="border-b border-gray-50 bg-gray-50/50 px-6 py-2.5">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                    {t(`settings.category.${category}`) !== `settings.category.${category}`
                      ? t(`settings.category.${category}`)
                      : SETTING_CATEGORIES[category] || category}
                  </h3>
                </div>
                <div className="divide-y divide-gray-100">
                  {entries.map(([key, setting]) => (
                    <SettingRow
                      key={key}
                      settingKey={key}
                      setting={setting}
                      isEditing={editingKey === key}
                      editValue={editValue}
                      saving={saving}
                      canWrite={canWrite}
                      onEdit={() => handleEdit(key, setting)}
                      onSave={() => handleSave(key)}
                      onCancel={handleCancelEdit}
                      onDelete={() => {
                        setDeleteError(null);
                        setDeleteConfirm(key);
                      }}
                      onEditValueChange={setEditValue}
                      t={t}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Setting modal */}
      {showAddForm && (
        <AddSettingModal
          onClose={() => setShowAddForm(false)}
          onSubmit={handleAdd}
          existingKeys={Object.keys(settings)}
          saving={saving}
          t={t}
        />
      )}

      {/* Delete confirmation dialog */}
      {deleteConfirm && (
        <ConfirmDeleteDialog
          itemLabel={deleteConfirm}
          titleKey="settings.delete"
          deleting={deleting}
          onConfirm={handleDeleteConfirmed}
          onCancel={cancelDelete}
          error={deleteError}
        />
      )}
    </div>
  );
};

export default SettingsPage;
