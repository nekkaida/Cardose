import React, { useState, useEffect } from 'react';
import { useApi } from '../contexts/ApiContext';
import { useLanguage } from '../contexts/LanguageContext';

interface Setting {
  value: string;
  description: string;
}

const SettingsPage: React.FC = () => {
  const [settings, setSettings] = useState<Record<string, Setting>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');
  const [newDescription, setNewDescription] = useState('');

  const { getSettings, updateSetting, deleteSetting } = useApi();
  const { t, language, setLanguage } = useLanguage();

  useEffect(() => {
    loadSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getSettings();
      setSettings(data.settings || {});
    } catch (err) {
      console.error('Error loading settings:', err);
      setError('Failed to load settings. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (key: string) => {
    setEditingKey(key);
    setEditValue(settings[key]?.value || '');
  };

  const handleSave = async (key: string) => {
    try {
      setSaving(true);
      await updateSetting(key, { value: editValue, description: settings[key]?.description });
      setEditingKey(null);
      loadSettings();
    } catch (err) {
      console.error('Error saving setting:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (key: string) => {
    if (!window.confirm(`Are you sure you want to delete setting "${key}"?`)) return;
    try {
      await deleteSetting(key);
      loadSettings();
    } catch (err) {
      console.error('Error deleting setting:', err);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      await updateSetting(newKey, { value: newValue, description: newDescription });
      setShowAddForm(false);
      setNewKey('');
      setNewValue('');
      setNewDescription('');
      loadSettings();
    } catch (err) {
      console.error('Error adding setting:', err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-32 w-32 animate-spin rounded-full border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-6 py-4 text-red-700">
        <p className="font-medium">Error</p>
        <p className="text-sm">{error}</p>
        <button
          onClick={() => {
            setError(null);
            loadSettings();
          }}
          className="mt-2 text-sm text-red-600 underline"
        >
          Try Again
        </button>
      </div>
    );
  }

  const settingEntries = Object.entries(settings);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('settings.title')}</h1>
          <p className="text-gray-600">Manage application settings</p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="rounded-lg bg-primary-600 px-4 py-2 text-white transition-colors hover:bg-primary-700"
        >
          Add Setting
        </button>
      </div>

      <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Language</h2>
        <div className="flex items-center gap-4">
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value as 'en' | 'id')}
            className="rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary-600"
          >
            <option value="en">English</option>
            <option value="id">Bahasa Indonesia</option>
          </select>
          <span className="text-sm text-gray-500">Choose your preferred language</span>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">System Settings</h2>
          <p className="text-sm text-gray-500">{settingEntries.length} settings configured</p>
        </div>
        {settingEntries.length === 0 ? (
          <div className="px-6 py-8 text-center text-gray-500">No settings configured yet.</div>
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
                        className="rounded-lg border border-gray-300 px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600"
                        /* eslint-disable-next-line jsx-a11y/no-autofocus */
                        autoFocus
                      />
                      <button
                        onClick={() => handleSave(key)}
                        disabled={saving}
                        className="rounded bg-green-100 px-2 py-1 text-xs text-green-800 hover:bg-green-200 disabled:opacity-50"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingKey(null)}
                        className="rounded bg-gray-100 px-2 py-1 text-xs text-gray-800 hover:bg-gray-200"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <span className="max-w-xs truncate rounded bg-gray-50 px-3 py-1 font-mono text-sm text-gray-700">
                        {setting.value}
                      </span>
                      <button
                        onClick={() => handleEdit(key)}
                        className="rounded bg-blue-100 px-2 py-1 text-xs text-blue-800 hover:bg-blue-200"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(key)}
                        className="rounded bg-red-100 px-2 py-1 text-xs text-red-800 hover:bg-red-200"
                      >
                        Delete
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showAddForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-md rounded-xl bg-white p-6">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">Add New Setting</h2>
            <form onSubmit={handleAdd} className="space-y-4">
              <div>
                <label
                  htmlFor="setting-key"
                  className="mb-1 block text-sm font-medium text-gray-700"
                >
                  Key
                </label>
                <input
                  id="setting-key"
                  type="text"
                  required
                  value={newKey}
                  onChange={(e) => setNewKey(e.target.value)}
                  placeholder="e.g. company_name"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-600"
                />
              </div>
              <div>
                <label
                  htmlFor="setting-value"
                  className="mb-1 block text-sm font-medium text-gray-700"
                >
                  Value
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
                  Description
                </label>
                <input
                  id="setting-description"
                  type="text"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Optional description"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-600"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-primary-600 px-4 py-2 text-white hover:bg-primary-700 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Add Setting'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsPage;
