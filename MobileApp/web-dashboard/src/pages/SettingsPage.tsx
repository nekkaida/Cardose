import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useApi } from '../contexts/ApiContext';
import { useLanguage } from '../contexts/LanguageContext';
import ConfirmDeleteDialog from '../components/ConfirmDeleteDialog';
import type { SettingData, SettingsMap } from '@shared/types/settings';

// ── Component ─────────────────────────────────────────────────────

const SettingsPage: React.FC = () => {
  const [settings, setSettings] = useState<SettingsMap>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const { getSettings, updateSetting, deleteSetting } = useApi();
  const { t, language, setLanguage } = useLanguage();

  // ── Data loading ──────────────────────────────────────────────

  const loadSettings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getSettings();
      setSettings(data.settings || {});
    } catch {
      setError(t('settings.loadError'));
    } finally {
      setLoading(false);
    }
  }, [getSettings, t]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  // ── Actions ───────────────────────────────────────────────────

  const handleEdit = useCallback((key: string, setting: SettingData) => {
    setEditingKey(key);
    setEditValue(setting.value || '');
  }, []);

  const handleCancelEdit = useCallback(() => {
    setEditingKey(null);
    setEditValue('');
  }, []);

  const handleSave = useCallback(
    async (key: string) => {
      try {
        setSaving(true);
        setError(null);
        await updateSetting(key, {
          value: editValue,
          description: settings[key]?.description || undefined,
        });
        setEditingKey(null);
        loadSettings();
      } catch (err: unknown) {
        const msg =
          (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
          t('settings.saveError');
        setError(msg);
      } finally {
        setSaving(false);
      }
    },
    [editValue, settings, updateSetting, loadSettings, t]
  );

  const handleDeleteConfirmed = useCallback(async () => {
    if (!deleteConfirm) return;
    try {
      setDeleting(true);
      setDeleteError(null);
      await deleteSetting(deleteConfirm);
      setDeleteConfirm(null);
      setDeleteError(null);
      loadSettings();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } } };
      setDeleteError(axiosErr?.response?.data?.error || t('settings.deleteError'));
    } finally {
      setDeleting(false);
    }
  }, [deleteConfirm, deleteSetting, loadSettings, t]);

  const cancelDelete = useCallback(() => {
    setDeleteConfirm(null);
    setDeleteError(null);
  }, []);

  const closeAddForm = useCallback(() => {
    setShowAddForm(false);
    setNewKey('');
    setNewValue('');
    setNewDescription('');
    setFormError(null);
  }, []);

  const handleAdd = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      try {
        setSaving(true);
        setFormError(null);
        await updateSetting(newKey, { value: newValue, description: newDescription });
        closeAddForm();
        loadSettings();
      } catch (err: unknown) {
        const msg =
          (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
          t('settings.saveError');
        setFormError(msg);
      } finally {
        setSaving(false);
      }
    },
    [newKey, newValue, newDescription, updateSetting, closeAddForm, loadSettings, t]
  );

  // ── Modal keyboard / outside-click ────────────────────────────

  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showAddForm) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeAddForm();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showAddForm, closeAddForm]);

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        closeAddForm();
      }
    },
    [closeAddForm]
  );

  // ── Render ────────────────────────────────────────────────────

  const settingEntries = Object.entries(settings);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('settings.title')}</h1>
          <p className="text-gray-600">{t('settings.subtitle')}</p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="rounded-lg bg-primary-600 px-4 py-2 text-white transition-colors hover:bg-primary-700"
        >
          {t('settings.addSetting')}
        </button>
      </div>

      {/* Inline error banner */}
      {error && (
        <div className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700">
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

      {/* System Settings */}
      <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">{t('settings.systemSettings')}</h2>
          <p className="text-sm text-gray-500">
            {settingEntries.length} {t('settings.settingsCount')}
          </p>
        </div>

        {loading ? (
          <div className="flex h-48 items-center justify-center">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-primary-600"></div>
          </div>
        ) : settingEntries.length === 0 ? (
          <div className="px-6 py-8 text-center text-gray-500">{t('settings.noSettings')}</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {settingEntries.map(([key, setting]) => (
              <div
                key={key}
                className="flex items-center justify-between px-6 py-4 hover:bg-gray-50"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-mono text-sm font-medium text-gray-900">{key}</p>
                  {setting.description && (
                    <p className="mt-0.5 text-xs text-gray-500">{setting.description}</p>
                  )}
                </div>
                <div className="ml-4 flex items-center gap-3">
                  {editingKey === key ? (
                    <>
                      <input
                        type="text"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        aria-label={t('settings.value')}
                        className="rounded-lg border border-gray-300 px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600"
                        autoFocus
                      />
                      <button
                        onClick={() => handleSave(key)}
                        disabled={saving}
                        className="rounded bg-green-100 px-2 py-1 text-xs text-green-800 hover:bg-green-200 disabled:opacity-50"
                      >
                        {t('settings.save')}
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        className="rounded bg-gray-100 px-2 py-1 text-xs text-gray-800 hover:bg-gray-200"
                      >
                        {t('settings.cancel')}
                      </button>
                    </>
                  ) : (
                    <>
                      <span className="max-w-xs truncate rounded bg-gray-50 px-3 py-1 font-mono text-sm text-gray-700">
                        {setting.value}
                      </span>
                      <button
                        onClick={() => handleEdit(key, setting)}
                        className="rounded bg-blue-100 px-2 py-1 text-xs text-blue-800 hover:bg-blue-200"
                      >
                        {t('settings.edit')}
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(key)}
                        className="rounded bg-red-100 px-2 py-1 text-xs text-red-800 hover:bg-red-200"
                      >
                        {t('settings.delete')}
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Setting modal */}
      {showAddForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
          onClick={handleBackdropClick}
          role="dialog"
          aria-modal="true"
        >
          <div
            ref={modalRef}
            className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl bg-white p-6"
          >
            <h2 className="mb-4 text-lg font-semibold text-gray-900">
              {t('settings.addNewSetting')}
            </h2>
            {formError && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {formError}
              </div>
            )}
            <form onSubmit={handleAdd} className="space-y-4">
              <div>
                <label
                  htmlFor="setting-key"
                  className="mb-1 block text-sm font-medium text-gray-700"
                >
                  {t('settings.key')}
                </label>
                <input
                  id="setting-key"
                  type="text"
                  required
                  value={newKey}
                  onChange={(e) => setNewKey(e.target.value)}
                  placeholder={t('settings.keyPlaceholder')}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-600"
                />
              </div>
              <div>
                <label
                  htmlFor="setting-value"
                  className="mb-1 block text-sm font-medium text-gray-700"
                >
                  {t('settings.value')}
                </label>
                <input
                  id="setting-value"
                  type="text"
                  required
                  value={newValue}
                  onChange={(e) => setNewValue(e.target.value)}
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
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-600"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeAddForm}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50"
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
