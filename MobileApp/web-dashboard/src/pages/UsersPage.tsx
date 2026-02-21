import React, { useState, useEffect, useCallback } from 'react';
import { useApi } from '../contexts/ApiContext';
import { useLanguage } from '../contexts/LanguageContext';
import ConfirmDeleteDialog from '../components/ConfirmDeleteDialog';
import UserFormModal from '../components/users/UserFormModal';
import type { UserData, UserStats, CreateUserPayload } from '@shared/types/users';

// ── Constants ─────────────────────────────────────────────────────

const PAGE_SIZE = 25;

const ROLE_BADGE: Record<string, string> = {
  owner: 'bg-primary-100 text-primary-800',
  manager: 'bg-blue-100 text-blue-800',
  employee: 'bg-gray-100 text-gray-800',
};

// ── Component ─────────────────────────────────────────────────────

const UsersPage: React.FC = () => {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [stats, setStats] = useState<UserStats | null>(null);

  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingUser, setEditingUser] = useState<UserData | null>(null);

  const [deleteConfirm, setDeleteConfirm] = useState<UserData | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const { getUsers, createUser, updateUser, updateUserStatus, deleteUser } = useApi();
  const { t } = useLanguage();

  // ── Data loading ──────────────────────────────────────────────

  const loadUsers = useCallback(
    async (currentPage: number, currentRole: string, currentSearch: string) => {
      try {
        setLoading(true);
        setError(null);
        const params: Record<string, string | number> = { page: currentPage, limit: PAGE_SIZE };
        if (currentRole !== 'all') params.role = currentRole;
        if (currentSearch) params.search = currentSearch;
        const data = await getUsers(params);
        setUsers(data.users || []);
        setTotalPages(data.totalPages || 1);
        if (data.stats) setStats(data.stats);
      } catch {
        setError(t('users.loadError'));
      } finally {
        setLoading(false);
      }
    },
    [getUsers, t]
  );

  useEffect(() => {
    loadUsers(page, roleFilter, searchTerm);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- searchTerm excluded: uses explicit Search button
  }, [page, roleFilter, loadUsers]);

  const handleSearch = () => {
    setPage(1);
    loadUsers(1, roleFilter, searchTerm);
  };

  // ── Actions ───────────────────────────────────────────────────

  const handleToggleStatus = async (user: UserData) => {
    try {
      await updateUserStatus(user.id, { is_active: !user.is_active });
      loadUsers(page, roleFilter, searchTerm);
    } catch {
      setError(t('users.statusError'));
    }
  };

  const handleDeleteConfirmed = useCallback(async () => {
    if (!deleteConfirm) return;
    try {
      setDeleting(true);
      setDeleteError(null);
      await deleteUser(deleteConfirm.id);
      setDeleteConfirm(null);
      setDeleteError(null);
      loadUsers(page, roleFilter, searchTerm);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } } };
      setDeleteError(axiosErr?.response?.data?.error || t('users.deleteError'));
    } finally {
      setDeleting(false);
    }
  }, [deleteConfirm, deleteUser, loadUsers, page, roleFilter, searchTerm, t]);

  const cancelDelete = useCallback(() => {
    setDeleteConfirm(null);
    setDeleteError(null);
  }, []);

  // ── Modal open / close / save ─────────────────────────────────

  const handleEditUser = (user: UserData) => {
    setEditingUser(user);
    setShowModal(true);
  };

  const openCreateModal = () => {
    setEditingUser(null);
    setShowModal(true);
  };

  const closeModal = useCallback(() => {
    setShowModal(false);
    setEditingUser(null);
  }, []);

  const handleSave = useCallback(
    async (formData: CreateUserPayload | Record<string, string>) => {
      setSaving(true);
      try {
        if (editingUser) {
          await updateUser(editingUser.id, formData as Record<string, string>);
        } else {
          await createUser(formData as CreateUserPayload);
        }
        closeModal();
        loadUsers(page, roleFilter, searchTerm);
      } finally {
        setSaving(false);
      }
    },
    [editingUser, updateUser, createUser, closeModal, loadUsers, page, roleFilter, searchTerm]
  );

  // ── Render ────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('users.title')}</h1>
          <p className="text-gray-600">{t('users.subtitle')}</p>
        </div>
        <button
          onClick={openCreateModal}
          className="rounded-lg bg-primary-600 px-4 py-2 text-white transition-colors hover:bg-primary-700"
        >
          {t('users.addUser')}
        </button>
      </div>

      {/* Inline error banner */}
      {error && (
        <div className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700">
          <span className="text-sm">{error}</span>
          <button
            onClick={() => {
              setError(null);
              loadUsers(page, roleFilter, searchTerm);
            }}
            className="text-sm font-medium text-red-600 underline"
          >
            {t('users.tryAgain')}
          </button>
        </div>
      )}

      {/* Stats cards */}
      {stats && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
            <p className="text-sm text-gray-600">{t('users.totalUsers')}</p>
            <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
          </div>
          <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
            <p className="text-sm text-gray-600">{t('users.active')}</p>
            <p className="text-2xl font-bold text-green-600">{stats.active}</p>
          </div>
          <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
            <p className="text-sm text-gray-600">{t('users.inactive')}</p>
            <p className="text-2xl font-bold text-red-600">{stats.inactive}</p>
          </div>
          <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
            <p className="text-sm text-gray-600">{t('users.byRole')}</p>
            <div className="mt-1 flex gap-2">
              <span className="rounded-full bg-primary-100 px-2 py-0.5 text-xs text-primary-800">
                {stats.byRole?.owner || 0} {t('users.owners')}
              </span>
              <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-800">
                {stats.byRole?.manager || 0} {t('users.mgr')}
              </span>
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-800">
                {stats.byRole?.employee || 0} {t('users.emp')}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Search / Filter */}
      <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row">
          <div className="flex-1">
            <input
              type="text"
              placeholder={t('users.searchPlaceholder')}
              aria-label={t('users.searchPlaceholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary-600"
            />
          </div>
          <div>
            <select
              aria-label={t('users.filterByRole')}
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value);
                setPage(1);
              }}
              className="rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary-600"
            >
              <option value="all">{t('users.allRoles')}</option>
              <option value="owner">{t('users.owner')}</option>
              <option value="manager">{t('users.manager')}</option>
              <option value="employee">{t('users.employee')}</option>
            </select>
          </div>
          <button
            onClick={handleSearch}
            className="rounded-lg bg-primary-600 px-4 py-2 text-white transition-colors hover:bg-primary-700"
          >
            {t('common.search')}
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
        {loading ? (
          <div className="flex h-48 items-center justify-center">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-primary-600"></div>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      {t('users.name')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      {t('users.email')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      {t('users.role')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      {t('users.status')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      {t('users.actions')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {users.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                        {t('users.noUsers')}
                      </td>
                    </tr>
                  ) : (
                    users.map((user) => (
                      <tr key={user.id} className="hover:bg-gray-50">
                        <td className="whitespace-nowrap px-6 py-4">
                          <div className="text-sm font-medium text-gray-900">{user.full_name}</div>
                          <div className="text-xs text-gray-500">@{user.username}</div>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4">
                          <div className="text-sm text-gray-600">{user.email}</div>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4">
                          <span
                            className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${ROLE_BADGE[user.role] || ROLE_BADGE.employee}`}
                          >
                            {t('users.' + user.role)}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4">
                          <span
                            className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${user.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}
                          >
                            {user.is_active ? t('users.active') : t('users.inactive')}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm">
                          <button
                            onClick={() => handleEditUser(user)}
                            className="mr-2 rounded bg-blue-100 px-2 py-1 text-xs text-blue-800 hover:bg-blue-200"
                          >
                            {t('users.edit')}
                          </button>
                          <button
                            onClick={() => handleToggleStatus(user)}
                            className={`mr-2 rounded px-2 py-1 text-xs ${user.is_active ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200' : 'bg-green-100 text-green-800 hover:bg-green-200'}`}
                          >
                            {user.is_active ? t('users.deactivate') : t('users.activate')}
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(user)}
                            className="rounded bg-red-100 px-2 py-1 text-xs text-red-800 hover:bg-red-200"
                          >
                            {t('users.delete')}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between border-t px-6 py-3">
              <span className="text-sm text-gray-700">
                {t('users.page')} {page} {t('users.of')} {totalPages}
              </span>
              <div className="space-x-2">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="rounded border px-3 py-1 text-sm disabled:opacity-50"
                >
                  {t('users.previous')}
                </button>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="rounded border px-3 py-1 text-sm disabled:opacity-50"
                >
                  {t('users.next')}
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Create/Edit modal */}
      <UserFormModal
        open={showModal}
        editingUser={editingUser}
        onClose={closeModal}
        onSave={handleSave}
        saving={saving}
      />

      {/* Delete confirmation dialog */}
      {deleteConfirm && (
        <ConfirmDeleteDialog
          itemLabel={deleteConfirm.full_name}
          titleKey="users.delete"
          deleting={deleting}
          onConfirm={handleDeleteConfirmed}
          onCancel={cancelDelete}
          error={deleteError}
        />
      )}
    </div>
  );
};

export default UsersPage;
