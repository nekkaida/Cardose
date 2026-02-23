import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useApi } from '../contexts/ApiContext';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import ConfirmDeleteDialog from '../components/ConfirmDeleteDialog';
import UserFormModal from '../components/users/UserFormModal';
import Toast from '../components/Toast';
import { SkeletonRow, Pagination, SortIcon } from '../components/TableHelpers';
import { formatDate } from '../utils/formatters';
import type {
  UserData,
  UserStats,
  CreateUserPayload,
  UpdateUserPayload,
} from '@shared/types/users';

// ── Constants ─────────────────────────────────────────────────────

const PAGE_SIZE = 25;

const ROLE_BADGE: Record<string, string> = {
  owner: 'bg-primary-100 text-primary-800',
  manager: 'bg-blue-100 text-blue-800',
  employee: 'bg-gray-100 text-gray-800',
};

// ── Helpers ───────────────────────────────────────────────────────

function classifyError(
  err: unknown,
  t: (k: string) => string
): { message: string; type: 'network' | 'permission' | 'server' } {
  const axiosErr = err as {
    response?: { status?: number; data?: { error?: string } };
    request?: unknown;
  };
  if (!axiosErr.response && axiosErr.request) {
    return { message: t('users.networkError'), type: 'network' };
  }
  if (axiosErr.response?.status === 403) {
    return {
      message: axiosErr.response.data?.error || t('users.permissionError'),
      type: 'permission',
    };
  }
  return {
    message: axiosErr.response?.data?.error || t('users.loadError'),
    type: 'server',
  };
}

// ── Component ─────────────────────────────────────────────────────

const UsersPage: React.FC = () => {
  // Data state
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [totalUsers, setTotalUsers] = useState(0);

  // Search & filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  // Pagination & sort state
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const sortByRef = useRef(sortBy);
  const sortOrderRef = useRef(sortOrder);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingUser, setEditingUser] = useState<UserData | null>(null);

  // Delete state
  const [deleteConfirm, setDeleteConfirm] = useState<UserData | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Status toggle state
  const [togglingStatus, setTogglingStatus] = useState<string | null>(null);

  // Toast state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const { getUsers, createUser, updateUser, updateUserStatus, deleteUser } = useApi();
  const { user: currentUser } = useAuth();
  const { t } = useLanguage();

  // Role-based permissions
  const canManageUsers = currentUser?.role === 'owner' || currentUser?.role === 'manager';
  const canDeleteUsers = currentUser?.role === 'owner';

  // Derived
  const hasFilters = searchTerm !== '' || roleFilter !== 'all';

  // ── Debounced search ──────────────────────────────────────────

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // ── Sync sort refs ───────────────────────────────────────────

  useEffect(() => {
    sortByRef.current = sortBy;
    sortOrderRef.current = sortOrder;
  }, [sortBy, sortOrder]);

  // ── Data loading ──────────────────────────────────────────────

  const loadUsers = useCallback(
    async (
      currentPage: number,
      currentRole: string,
      currentSearch: string,
      currentSortBy?: string,
      currentSortOrder?: 'asc' | 'desc'
    ) => {
      try {
        setLoading(true);
        setError(null);
        const params: Record<string, string | number> = {
          page: currentPage,
          limit: PAGE_SIZE,
          sort_by: currentSortBy || sortByRef.current,
          sort_order: currentSortOrder || sortOrderRef.current,
        };
        if (currentRole !== 'all') params.role = currentRole;
        if (currentSearch) params.search = currentSearch;
        const data = await getUsers(params);
        setUsers(data.users || []);
        setTotalPages(data.totalPages || 1);
        setTotalUsers(data.total || 0);
        if (data.stats) setStats(data.stats);
      } catch (err) {
        const classified = classifyError(err, t);
        setError(classified.message);
      } finally {
        setLoading(false);
      }
    },
    [getUsers, t]
  );

  useEffect(() => {
    loadUsers(page, roleFilter, debouncedSearch, sortBy, sortOrder);
  }, [page, roleFilter, debouncedSearch, sortBy, sortOrder, loadUsers]);

  // ── Sort ────────────────────────────────────────────────────────

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
    setPage(1);
  };

  // ── Clear filters ───────────────────────────────────────────────

  const clearFilters = () => {
    setSearchTerm('');
    setRoleFilter('all');
    setPage(1);
  };

  // ── Actions ───────────────────────────────────────────────────

  const handleToggleStatus = async (user: UserData) => {
    try {
      setTogglingStatus(user.id);
      await updateUserStatus(user.id, { is_active: !user.is_active });
      setToast({ message: t('users.statusSuccess'), type: 'success' });
      loadUsers(page, roleFilter, debouncedSearch, sortBy, sortOrder);
    } catch (err) {
      const classified = classifyError(err, t);
      setToast({ message: classified.message, type: 'error' });
    } finally {
      setTogglingStatus(null);
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
      setToast({ message: t('users.deleteSuccess'), type: 'success' });
      loadUsers(page, roleFilter, debouncedSearch, sortBy, sortOrder);
    } catch (err: unknown) {
      const classified = classifyError(err, t);
      setDeleteError(classified.message);
    } finally {
      setDeleting(false);
    }
  }, [
    deleteConfirm,
    deleteUser,
    loadUsers,
    page,
    roleFilter,
    debouncedSearch,
    sortBy,
    sortOrder,
    t,
  ]);

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
    async (formData: CreateUserPayload | UpdateUserPayload) => {
      setSaving(true);
      try {
        if (editingUser) {
          await updateUser(editingUser.id, formData as UpdateUserPayload);
          setToast({ message: t('users.updateSuccess'), type: 'success' });
        } else {
          await createUser(formData as CreateUserPayload);
          setToast({ message: t('users.createSuccess'), type: 'success' });
        }
        closeModal();
        loadUsers(page, roleFilter, debouncedSearch, sortBy, sortOrder);
      } catch (err) {
        throw err; // Re-throw so UserFormModal.handleSubmit catches it for inline error
      } finally {
        setSaving(false);
      }
    },
    [
      editingUser,
      updateUser,
      createUser,
      closeModal,
      loadUsers,
      page,
      roleFilter,
      debouncedSearch,
      sortBy,
      sortOrder,
      t,
    ]
  );

  // ── Accessibility helpers ──────────────────────────────────────

  const ariaSort = (column: string): 'ascending' | 'descending' | 'none' =>
    sortBy !== column ? 'none' : sortOrder === 'asc' ? 'ascending' : 'descending';

  // ── Render ────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('users.title')}</h1>
          <p className="text-gray-600">{t('users.subtitle')}</p>
        </div>
        {canManageUsers && (
          <button
            onClick={openCreateModal}
            className="rounded-lg bg-primary-600 px-4 py-2 text-white transition-colors hover:bg-primary-700"
          >
            {t('users.addUser')}
          </button>
        )}
      </div>

      {/* Inline error banner */}
      {error && (
        <div className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700">
          <span className="text-sm">{error}</span>
          <button
            onClick={() => {
              setError(null);
              loadUsers(page, roleFilter, debouncedSearch, sortBy, sortOrder);
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
        <div className="flex flex-col gap-4 md:flex-row md:items-center">
          <div className="flex-1">
            <input
              type="text"
              placeholder={t('users.searchPlaceholder')}
              aria-label={t('users.searchPlaceholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary-500"
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
          {hasFilters && (
            <button
              onClick={clearFilters}
              className="whitespace-nowrap rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-600 transition-colors hover:bg-gray-50"
            >
              {t('users.clearFilters')}
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th
                  onClick={() => handleSort('full_name')}
                  aria-sort={ariaSort('full_name')}
                  className="cursor-pointer select-none px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 hover:text-gray-700"
                >
                  {t('users.name')}{' '}
                  <SortIcon column="full_name" sortBy={sortBy} sortOrder={sortOrder} />
                </th>
                <th
                  onClick={() => handleSort('email')}
                  aria-sort={ariaSort('email')}
                  className="cursor-pointer select-none px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 hover:text-gray-700"
                >
                  {t('users.email')}{' '}
                  <SortIcon column="email" sortBy={sortBy} sortOrder={sortOrder} />
                </th>
                <th
                  onClick={() => handleSort('role')}
                  aria-sort={ariaSort('role')}
                  className="cursor-pointer select-none px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 hover:text-gray-700"
                >
                  {t('users.role')} <SortIcon column="role" sortBy={sortBy} sortOrder={sortOrder} />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  {t('users.status')}
                </th>
                <th
                  onClick={() => handleSort('created_at')}
                  aria-sort={ariaSort('created_at')}
                  className="cursor-pointer select-none px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 hover:text-gray-700"
                >
                  {t('users.joined')}{' '}
                  <SortIcon column="created_at" sortBy={sortBy} sortOrder={sortOrder} />
                </th>
                {canManageUsers && (
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    {t('users.actions')}
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <SkeletonRow key={i} columns={canManageUsers ? 6 : 5} />
                ))
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={canManageUsers ? 6 : 5} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center">
                      <svg
                        className="mb-4 h-16 w-16 text-gray-300"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        aria-hidden="true"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
                        />
                      </svg>
                      <p className="mb-1 font-medium text-gray-500">
                        {hasFilters ? t('users.noUsers') : t('users.noUsersYet')}
                      </p>
                      <p className="mb-4 text-sm text-gray-400">
                        {hasFilters ? t('users.adjustFilters') : t('users.noUsersDesc')}
                      </p>
                      {hasFilters && (
                        <button
                          onClick={clearFilters}
                          className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-600 transition-colors hover:bg-gray-50"
                        >
                          {t('users.clearFilters')}
                        </button>
                      )}
                    </div>
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
                        {t(`users.${user.role}`) !== `users.${user.role}`
                          ? t(`users.${user.role}`)
                          : user.role}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <span
                        className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${user.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}
                      >
                        {user.is_active ? t('users.active') : t('users.inactive')}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      {formatDate(user.created_at)}
                    </td>
                    {canManageUsers && (
                      <td className="whitespace-nowrap px-6 py-4 text-sm">
                        <button
                          onClick={() => handleEditUser(user)}
                          className="mr-2 rounded bg-blue-100 px-2 py-1 text-xs text-blue-800 hover:bg-blue-200"
                        >
                          {t('users.edit')}
                        </button>
                        <button
                          onClick={() => handleToggleStatus(user)}
                          disabled={togglingStatus === user.id}
                          className={`mr-2 rounded px-2 py-1 text-xs disabled:opacity-50 ${user.is_active ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200' : 'bg-green-100 text-green-800 hover:bg-green-200'}`}
                        >
                          {togglingStatus === user.id
                            ? user.is_active
                              ? t('users.deactivating')
                              : t('users.activating')
                            : user.is_active
                              ? t('users.deactivate')
                              : t('users.activate')}
                        </button>
                        {canDeleteUsers && (
                          <button
                            onClick={() => setDeleteConfirm(user)}
                            className="rounded bg-red-100 px-2 py-1 text-xs text-red-800 hover:bg-red-200"
                          >
                            {t('users.delete')}
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {!loading && users.length > 0 && (
          <Pagination
            page={page}
            totalPages={totalPages}
            total={totalUsers}
            label={t('users.users')}
            onPrev={() => setPage((p) => p - 1)}
            onNext={() => setPage((p) => p + 1)}
            prevText={t('users.previous')}
            nextText={t('users.next')}
          />
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

      {/* Toast notifications */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
};

export default UsersPage;
