import React, { useState, useEffect, useCallback } from 'react';
import {
  useListUsers,
  useCreateUser,
  useSetUserRole,
  useSetUserPassword,
  useBanUser,
  useUnbanUser,
  useListUserSessions,
  useRemoveUser,
  useAuditLogs,
  useRoles,
  useRoleMenuPermissions,
  UserItem,
  SessionItem,
  RoleItem,
} from '../hooks/api/useUsers';

// ─── Role label map ───
const ROLE_LABELS: Record<string, string> = {
  admin: 'Super Admin',
  kepala_madrasah: 'Kepala Madrasah',
  wakil_kepala: 'Wakil Kepala',
  kepala_unit: 'Kepala Unit',
  wali_kelas: 'Wali Kelas',
  pembina_ekstra: 'Pembina Ekstra',
  guru: 'Guru',
  student: 'Siswa',
};

const ROLE_COLORS: Record<string, string> = {
  admin: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  kepala_madrasah: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  wakil_kepala: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
  kepala_unit: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  wali_kelas: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
  pembina_ekstra: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
  guru: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  student: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
};

const ACTION_LABELS: Record<string, string> = {
  login: 'Login',
  create_user: 'Buat User',
  ban_user: 'Ban User',
  unban_user: 'Unban User',
  set_role: 'Ubah Role',
  reset_password: 'Reset Password',
  delete_user: 'Hapus User',
  revoke_session: 'Revoke Session',
  update_user: 'Update User',
};

// ─── Tabs ───
type Tab = 'users' | 'audit' | 'sessions' | 'permissions';

export const DashboardUsers = () => {
  const [activeTab, setActiveTab] = useState<Tab>('users');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-heading font-bold text-text-primary dark:text-text-darkPrimary">
          Manajemen Users
        </h1>
        <p className="text-text-secondary mt-1">Kelola pengguna, role, sesi, dan audit log sistem.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 dark:bg-[#111] p-1 rounded-xl w-fit flex-wrap">
        {([
          { key: 'users', label: 'Daftar Pengguna', icon: UsersIcon },
          { key: 'permissions', label: 'Hak Akses Menu', icon: LockIcon },
          { key: 'audit', label: 'Audit Log', icon: ClipboardIcon },
          { key: 'sessions', label: 'Sessions Aktif', icon: MonitorIcon },
        ] as { key: Tab; label: string; icon: React.FC }[]).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-150 ${
              activeTab === key
                ? 'bg-white dark:bg-[#1a1a1a] text-primary shadow-sm'
                : 'text-text-secondary hover:text-text-primary dark:hover:text-text-darkPrimary'
            }`}
          >
            <Icon />
            {label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'users' && <UsersTab />}
      {activeTab === 'permissions' && <PermissionsTab />}
      {activeTab === 'audit' && <AuditTab />}
      {activeTab === 'sessions' && <SessionsTab />}
    </div>
  );
};

// ══════════════════════════════════════════
// TAB 1: DAFTAR PENGGUNA
// ══════════════════════════════════════════
function UsersTab() {
  const { users, total, loading, fetchUsers } = useListUsers();
  const { roles, fetchRoles } = useRoles();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [page, setPage] = useState(0);
  const pageSize = 20;

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditRoleModal, setShowEditRoleModal] = useState<UserItem | null>(null);
  const [showResetPwModal, setShowResetPwModal] = useState<UserItem | null>(null);
  const [showBanModal, setShowBanModal] = useState<UserItem | null>(null);
  const [showSessionsModal, setShowSessionsModal] = useState<UserItem | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<UserItem | null>(null);

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  const loadUsers = useCallback(() => {
    fetchUsers({
      limit: pageSize,
      offset: page * pageSize,
      ...(search ? { searchValue: search, searchField: 'name' } : {}),
      ...(roleFilter ? { filterField: 'role', filterValue: roleFilter } : {}),
    });
  }, [fetchUsers, page, search, roleFilter, pageSize]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const totalPages = Math.ceil(total / pageSize);

  return (
    <>
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex gap-3 flex-1 w-full sm:w-auto">
          <div className="relative flex-1 max-w-xs">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
            <input
              type="text"
              placeholder="Cari nama pengguna..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0); }}
              className="w-full pl-9 pr-4 py-2 rounded-lg border border-border-light dark:border-border-dark bg-white dark:bg-[#0a0a0a] text-text-primary dark:text-text-darkPrimary text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <select
            value={roleFilter}
            onChange={(e) => { setRoleFilter(e.target.value); setPage(0); }}
            className="px-3 py-2 rounded-lg border border-border-light dark:border-border-dark bg-white dark:bg-[#0a0a0a] text-text-primary dark:text-text-darkPrimary text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="">Semua Role</option>
            {roles.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-hover transition-colors shadow-sm"
        >
          <PlusIcon /> Tambah User
        </button>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-[#0a0a0a] border border-border-light dark:border-border-dark rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-light dark:border-border-dark bg-gray-50 dark:bg-[#111]">
                <th className="text-left px-4 py-3 font-semibold text-text-secondary">Pengguna</th>
                <th className="text-left px-4 py-3 font-semibold text-text-secondary">Email</th>
                <th className="text-left px-4 py-3 font-semibold text-text-secondary">Role</th>
                <th className="text-left px-4 py-3 font-semibold text-text-secondary">Status</th>
                <th className="text-left px-4 py-3 font-semibold text-text-secondary">Terdaftar</th>
                <th className="text-right px-4 py-3 font-semibold text-text-secondary">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-text-secondary">
                    <div className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-5 w-5 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Memuat...
                    </div>
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-text-secondary">
                    Belum ada pengguna terdaftar.
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="border-b border-border-light dark:border-border-dark hover:bg-gray-50 dark:hover:bg-[#111] transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold uppercase">
                          {u.name?.charAt(0) || '?'}
                        </div>
                        <span className="font-medium text-text-primary dark:text-text-darkPrimary">{u.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-text-secondary">{u.email}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${ROLE_COLORS[u.role] || ROLE_COLORS.student}`}>
                        {ROLE_LABELS[u.role] || u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {u.banned ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                          Banned
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                          Active
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-text-secondary text-xs">
                      {u.createdAt ? new Date(u.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <ActionButton title="Ubah Role" onClick={() => setShowEditRoleModal(u)}>
                          <ShieldIcon />
                        </ActionButton>
                        <ActionButton title="Reset Password" onClick={() => setShowResetPwModal(u)}>
                          <KeyIcon />
                        </ActionButton>
                        <ActionButton title="Lihat Sessions" onClick={() => setShowSessionsModal(u)}>
                          <MonitorIcon />
                        </ActionButton>
                        {u.banned ? (
                          <ActionButton title="Unban" onClick={() => setShowBanModal(u)} className="text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20">
                            <UnlockIcon />
                          </ActionButton>
                        ) : (
                          <ActionButton title="Ban" onClick={() => setShowBanModal(u)} className="text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20">
                            <BanIcon />
                          </ActionButton>
                        )}
                        <ActionButton title="Hapus" onClick={() => setShowDeleteConfirm(u)} className="text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20">
                          <TrashIcon />
                        </ActionButton>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border-light dark:border-border-dark">
            <span className="text-xs text-text-secondary">
              Menampilkan {page * pageSize + 1}–{Math.min((page + 1) * pageSize, total)} dari {total} pengguna
            </span>
            <div className="flex gap-1">
              <button
                onClick={() => setPage(Math.max(0, page - 1))}
                disabled={page === 0}
                className="px-3 py-1 text-xs rounded-md border border-border-light dark:border-border-dark disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-[#111] transition-colors"
              >
                ← Prev
              </button>
              <button
                onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                disabled={page >= totalPages - 1}
                className="px-3 py-1 text-xs rounded-md border border-border-light dark:border-border-dark disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-[#111] transition-colors"
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {showCreateModal && (
        <CreateUserModal roles={roles} onClose={() => setShowCreateModal(false)} onSuccess={loadUsers} />
      )}
      {showEditRoleModal && (
        <EditRoleModal user={showEditRoleModal} roles={roles} onClose={() => setShowEditRoleModal(null)} onSuccess={loadUsers} />
      )}
      {showResetPwModal && (
        <ResetPasswordModal user={showResetPwModal} onClose={() => setShowResetPwModal(null)} />
      )}
      {showBanModal && (
        <BanModal user={showBanModal} onClose={() => setShowBanModal(null)} onSuccess={loadUsers} />
      )}
      {showSessionsModal && (
        <UserSessionsModal user={showSessionsModal} onClose={() => setShowSessionsModal(null)} />
      )}
      {showDeleteConfirm && (
        <DeleteConfirmModal user={showDeleteConfirm} onClose={() => setShowDeleteConfirm(null)} onSuccess={loadUsers} />
      )}
    </>
  );
}

// ══════════════════════════════════════════
// TAB 2: AUDIT LOG
// ══════════════════════════════════════════
function AuditTab() {
  const { logs, total, loading, fetchLogs } = useAuditLogs();
  const [actionFilter, setActionFilter] = useState('');
  const [page, setPage] = useState(0);
  const pageSize = 30;

  useEffect(() => {
    fetchLogs({
      limit: pageSize,
      offset: page * pageSize,
      ...(actionFilter ? { action: actionFilter } : {}),
    });
  }, [fetchLogs, page, actionFilter, pageSize]);

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="bg-white dark:bg-[#0a0a0a] border border-border-light dark:border-border-dark rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-border-light dark:border-border-dark flex items-center gap-3">
        <select
          value={actionFilter}
          onChange={(e) => { setActionFilter(e.target.value); setPage(0); }}
          className="px-3 py-1.5 rounded-lg border border-border-light dark:border-border-dark bg-white dark:bg-[#111] text-text-primary dark:text-text-darkPrimary text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
        >
          <option value="">Semua Aktivitas</option>
          {Object.entries(ACTION_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border-light dark:border-border-dark bg-gray-50 dark:bg-[#111]">
              <th className="text-left px-4 py-3 font-semibold text-text-secondary">Waktu</th>
              <th className="text-left px-4 py-3 font-semibold text-text-secondary">Pengguna</th>
              <th className="text-left px-4 py-3 font-semibold text-text-secondary">Aksi</th>
              <th className="text-left px-4 py-3 font-semibold text-text-secondary">Target</th>
              <th className="text-left px-4 py-3 font-semibold text-text-secondary">Detail</th>
              <th className="text-left px-4 py-3 font-semibold text-text-secondary">IP</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="text-center py-12 text-text-secondary">Memuat...</td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-12 text-text-secondary">Belum ada aktivitas tercatat.</td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id} className="border-b border-border-light dark:border-border-dark hover:bg-gray-50 dark:hover:bg-[#111] transition-colors">
                  <td className="px-4 py-3 text-text-secondary text-xs whitespace-nowrap">
                    {log.createdAt ? new Date(log.createdAt).toLocaleString('id-ID') : '-'}
                  </td>
                  <td className="px-4 py-3 text-text-primary dark:text-text-darkPrimary">
                    {log.userName || log.userEmail || '-'}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                      {ACTION_LABELS[log.action] || log.action}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-text-secondary text-xs">
                    {log.targetType ? `${log.targetType}: ${log.targetId || '-'}` : '-'}
                  </td>
                  <td className="px-4 py-3 text-text-secondary text-xs max-w-[200px] truncate">
                    {log.details || '-'}
                  </td>
                  <td className="px-4 py-3 text-text-secondary text-xs font-mono">
                    {log.ipAddress || '-'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-border-light dark:border-border-dark">
          <span className="text-xs text-text-secondary">
            {page * pageSize + 1}–{Math.min((page + 1) * pageSize, total)} dari {total}
          </span>
          <div className="flex gap-1">
            <button onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0} className="px-3 py-1 text-xs rounded-md border border-border-light dark:border-border-dark disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-[#111]">← Prev</button>
            <button onClick={() => setPage(Math.min(totalPages - 1, page + 1))} disabled={page >= totalPages - 1} className="px-3 py-1 text-xs rounded-md border border-border-light dark:border-border-dark disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-[#111]">Next →</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════
// TAB 3: SESSIONS AKTIF
// ══════════════════════════════════════════
function SessionsTab() {
  const { users, loading: usersLoading, fetchUsers } = useListUsers();
  const { sessions, loading: sessionsLoading, fetchSessions, revokeSession, revokeAllSessions } = useListUserSessions();
  const [selectedUser, setSelectedUser] = useState<string>('');

  useEffect(() => {
    fetchUsers({ limit: 100 });
  }, [fetchUsers]);

  useEffect(() => {
    if (selectedUser) fetchSessions(selectedUser);
  }, [selectedUser, fetchSessions]);

  const handleRevoke = async (token: string) => {
    if (!confirm('Yakin ingin revoke session ini?')) return;
    await revokeSession(token);
    if (selectedUser) fetchSessions(selectedUser);
  };

  const handleRevokeAll = async () => {
    if (!selectedUser || !confirm('Yakin ingin revoke SEMUA session user ini?')) return;
    await revokeAllSessions(selectedUser);
    fetchSessions(selectedUser);
  };

  return (
    <div className="bg-white dark:bg-[#0a0a0a] border border-border-light dark:border-border-dark rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-border-light dark:border-border-dark flex items-center gap-3">
        <select
          value={selectedUser}
          onChange={(e) => setSelectedUser(e.target.value)}
          className="px-3 py-1.5 rounded-lg border border-border-light dark:border-border-dark bg-white dark:bg-[#111] text-text-primary dark:text-text-darkPrimary text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 min-w-[200px]"
        >
          <option value="">Pilih pengguna...</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
          ))}
        </select>
        {selectedUser && sessions.length > 0 && (
          <button
            onClick={handleRevokeAll}
            className="px-3 py-1.5 text-xs font-medium text-red-600 border border-red-200 dark:border-red-800 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          >
            Revoke Semua
          </button>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border-light dark:border-border-dark bg-gray-50 dark:bg-[#111]">
              <th className="text-left px-4 py-3 font-semibold text-text-secondary">Session ID</th>
              <th className="text-left px-4 py-3 font-semibold text-text-secondary">IP Address</th>
              <th className="text-left px-4 py-3 font-semibold text-text-secondary">User Agent</th>
              <th className="text-left px-4 py-3 font-semibold text-text-secondary">Dibuat</th>
              <th className="text-left px-4 py-3 font-semibold text-text-secondary">Kedaluwarsa</th>
              <th className="text-right px-4 py-3 font-semibold text-text-secondary">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {!selectedUser ? (
              <tr><td colSpan={6} className="text-center py-12 text-text-secondary">Pilih pengguna untuk melihat sessions.</td></tr>
            ) : sessionsLoading ? (
              <tr><td colSpan={6} className="text-center py-12 text-text-secondary">Memuat...</td></tr>
            ) : sessions.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-12 text-text-secondary">Tidak ada session aktif.</td></tr>
            ) : (
              sessions.map((s) => (
                <tr key={s.id} className="border-b border-border-light dark:border-border-dark hover:bg-gray-50 dark:hover:bg-[#111] transition-colors">
                  <td className="px-4 py-3 text-xs font-mono text-text-secondary">{s.id?.slice(0, 12)}...</td>
                  <td className="px-4 py-3 text-text-secondary text-xs font-mono">{s.ipAddress || '-'}</td>
                  <td className="px-4 py-3 text-text-secondary text-xs max-w-[200px] truncate">{s.userAgent || '-'}</td>
                  <td className="px-4 py-3 text-text-secondary text-xs">{new Date(s.createdAt).toLocaleString('id-ID')}</td>
                  <td className="px-4 py-3 text-text-secondary text-xs">{new Date(s.expiresAt).toLocaleString('id-ID')}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleRevoke(s.token)}
                      className="px-2.5 py-1 text-xs font-medium text-red-600 border border-red-200 dark:border-red-800 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    >
                      Revoke
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════
// MODALS
// ══════════════════════════════════════════

function ModalOverlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-[#0a0a0a] border border-border-light dark:border-border-dark rounded-xl shadow-xl w-full max-w-md p-6 animate-in fade-in zoom-in-95">
        {children}
      </div>
    </div>
  );
}

// ─── Create User ───
function CreateUserModal({ roles, onClose, onSuccess }: { roles: RoleItem[]; onClose: () => void; onSuccess: () => void }) {
  const { createUser, loading } = useCreateUser();
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'student' });
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await createUser(form);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Gagal membuat user');
    }
  };

  return (
    <ModalOverlay onClose={onClose}>
      <h2 className="text-lg font-heading font-bold text-text-primary dark:text-text-darkPrimary mb-4">Tambah Pengguna Baru</h2>
      {error && <div className="mb-3 p-2 text-xs bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg">{error}</div>}
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormField label="Nama Lengkap">
          <input type="text" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="modal-input" placeholder="Nama lengkap" />
        </FormField>
        <FormField label="Email">
          <input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="modal-input" placeholder="email@sekolah.id" />
        </FormField>
        <FormField label="Password">
          <input type="password" required minLength={8} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="modal-input" placeholder="Minimal 8 karakter" />
        </FormField>
        <FormField label="Role">
          <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="modal-input">
            {roles.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
        </FormField>
        <div className="flex gap-2 justify-end pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-text-secondary rounded-lg hover:bg-gray-100 dark:hover:bg-[#111] transition-colors">Batal</button>
          <button type="submit" disabled={loading} className="px-4 py-2 text-sm text-white bg-primary rounded-lg hover:bg-primary-hover transition-colors disabled:opacity-50">
            {loading ? 'Menyimpan...' : 'Simpan'}
          </button>
        </div>
      </form>
    </ModalOverlay>
  );
}

// ─── Edit Role ───
function EditRoleModal({ user, roles, onClose, onSuccess }: { user: UserItem; roles: RoleItem[]; onClose: () => void; onSuccess: () => void }) {
  const { setRole, loading } = useSetUserRole();
  const [selectedRole, setSelectedRole] = useState(user.role);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await setRole(user.id, selectedRole);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Gagal mengubah role');
    }
  };

  return (
    <ModalOverlay onClose={onClose}>
      <h2 className="text-lg font-heading font-bold text-text-primary dark:text-text-darkPrimary mb-4">Ubah Role</h2>
      <p className="text-sm text-text-secondary mb-4">User: <strong>{user.name}</strong> ({user.email})</p>
      {error && <div className="mb-3 p-2 text-xs bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg">{error}</div>}
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormField label="Role Baru">
          <select value={selectedRole} onChange={(e) => setSelectedRole(e.target.value)} className="modal-input">
            {roles.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
        </FormField>
        <div className="flex gap-2 justify-end pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-text-secondary rounded-lg hover:bg-gray-100 dark:hover:bg-[#111] transition-colors">Batal</button>
          <button type="submit" disabled={loading} className="px-4 py-2 text-sm text-white bg-primary rounded-lg hover:bg-primary-hover transition-colors disabled:opacity-50">
            {loading ? 'Menyimpan...' : 'Simpan Role'}
          </button>
        </div>
      </form>
    </ModalOverlay>
  );
}

// ─── Reset Password ───
function ResetPasswordModal({ user, onClose }: { user: UserItem; onClose: () => void }) {
  const { setPassword, loading } = useSetUserPassword();
  const [newPw, setNewPw] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await setPassword(user.id, newPw);
      setSuccess(true);
    } catch (err: any) {
      setError(err?.message || 'Gagal reset password');
    }
  };

  return (
    <ModalOverlay onClose={onClose}>
      <h2 className="text-lg font-heading font-bold text-text-primary dark:text-text-darkPrimary mb-4">Reset Password</h2>
      <p className="text-sm text-text-secondary mb-4">User: <strong>{user.name}</strong> ({user.email})</p>
      {error && <div className="mb-3 p-2 text-xs bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg">{error}</div>}
      {success ? (
        <div className="space-y-4">
          <div className="p-3 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 text-sm rounded-lg">Password berhasil direset!</div>
          <div className="flex justify-end">
            <button onClick={onClose} className="px-4 py-2 text-sm text-white bg-primary rounded-lg hover:bg-primary-hover transition-colors">Tutup</button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormField label="Password Baru">
            <input type="password" required minLength={8} value={newPw} onChange={(e) => setNewPw(e.target.value)} className="modal-input" placeholder="Minimal 8 karakter" />
          </FormField>
          <div className="flex gap-2 justify-end pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-text-secondary rounded-lg hover:bg-gray-100 dark:hover:bg-[#111] transition-colors">Batal</button>
            <button type="submit" disabled={loading} className="px-4 py-2 text-sm text-white bg-primary rounded-lg hover:bg-primary-hover transition-colors disabled:opacity-50">
              {loading ? 'Menyimpan...' : 'Reset Password'}
            </button>
          </div>
        </form>
      )}
    </ModalOverlay>
  );
}

// ─── Ban / Unban ───
function BanModal({ user, onClose, onSuccess }: { user: UserItem; onClose: () => void; onSuccess: () => void }) {
  const { banUser, loading: banLoading } = useBanUser();
  const { unbanUser, loading: unbanLoading } = useUnbanUser();
  const [reason, setReason] = useState('');
  const [duration, setDuration] = useState('permanent');
  const [error, setError] = useState('');

  const isBanned = user.banned;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      if (isBanned) {
        await unbanUser(user.id);
      } else {
        const expiresIn = duration === 'permanent' ? undefined
          : duration === '1d' ? 86400
          : duration === '7d' ? 604800
          : duration === '30d' ? 2592000
          : undefined;
        await banUser(user.id, reason || undefined, expiresIn);
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Gagal memproses');
    }
  };

  return (
    <ModalOverlay onClose={onClose}>
      <h2 className="text-lg font-heading font-bold text-text-primary dark:text-text-darkPrimary mb-4">
        {isBanned ? 'Unban Pengguna' : 'Ban Pengguna'}
      </h2>
      <p className="text-sm text-text-secondary mb-4">User: <strong>{user.name}</strong> ({user.email})</p>
      {error && <div className="mb-3 p-2 text-xs bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg">{error}</div>}

      {isBanned ? (
        <div className="space-y-4">
          <p className="text-sm text-text-primary dark:text-text-darkPrimary">
            Alasan ban: <em>{user.banReason || 'Tidak ada'}</em>
          </p>
          <p className="text-sm text-text-secondary">Yakin ingin membuka blokir pengguna ini?</p>
          <div className="flex gap-2 justify-end pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-text-secondary rounded-lg hover:bg-gray-100 dark:hover:bg-[#111] transition-colors">Batal</button>
            <button onClick={handleSubmit} disabled={unbanLoading} className="px-4 py-2 text-sm text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50">
              {unbanLoading ? 'Memproses...' : 'Unban'}
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormField label="Alasan Ban">
            <input type="text" value={reason} onChange={(e) => setReason(e.target.value)} className="modal-input" placeholder="Pelanggaran aturan, spam, dll" />
          </FormField>
          <FormField label="Durasi">
            <select value={duration} onChange={(e) => setDuration(e.target.value)} className="modal-input">
              <option value="permanent">Permanen</option>
              <option value="1d">1 Hari</option>
              <option value="7d">7 Hari</option>
              <option value="30d">30 Hari</option>
            </select>
          </FormField>
          <div className="flex gap-2 justify-end pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-text-secondary rounded-lg hover:bg-gray-100 dark:hover:bg-[#111] transition-colors">Batal</button>
            <button type="submit" disabled={banLoading} className="px-4 py-2 text-sm text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50">
              {banLoading ? 'Memproses...' : 'Ban User'}
            </button>
          </div>
        </form>
      )}
    </ModalOverlay>
  );
}

// ─── View Sessions for a specific user ───
function UserSessionsModal({ user, onClose }: { user: UserItem; onClose: () => void }) {
  const { sessions, loading, fetchSessions, revokeSession, revokeAllSessions } = useListUserSessions();

  useEffect(() => {
    fetchSessions(user.id);
  }, [fetchSessions, user.id]);

  const handleRevoke = async (token: string) => {
    await revokeSession(token);
    fetchSessions(user.id);
  };

  const handleRevokeAll = async () => {
    await revokeAllSessions(user.id);
    fetchSessions(user.id);
  };

  return (
    <ModalOverlay onClose={onClose}>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-heading font-bold text-text-primary dark:text-text-darkPrimary">Sessions: {user.name}</h2>
          {sessions.length > 0 && (
            <button onClick={handleRevokeAll} className="px-2.5 py-1 text-xs font-medium text-red-600 border border-red-200 dark:border-red-800 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20">
              Revoke Semua
            </button>
          )}
        </div>
        {loading ? (
          <p className="text-sm text-text-secondary">Memuat...</p>
        ) : sessions.length === 0 ? (
          <p className="text-sm text-text-secondary">Tidak ada session aktif.</p>
        ) : (
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {sessions.map((s) => (
              <div key={s.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-[#111] text-xs">
                <div className="space-y-1">
                  <p className="text-text-primary dark:text-text-darkPrimary font-mono">{s.ipAddress || 'Unknown IP'}</p>
                  <p className="text-text-secondary truncate max-w-[250px]">{s.userAgent || 'Unknown'}</p>
                  <p className="text-text-secondary">Expires: {new Date(s.expiresAt).toLocaleString('id-ID')}</p>
                </div>
                <button onClick={() => handleRevoke(s.token)} className="px-2 py-1 text-red-600 border border-red-200 dark:border-red-800 rounded hover:bg-red-50 dark:hover:bg-red-900/20">
                  Revoke
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="flex justify-end pt-2">
          <button onClick={onClose} className="px-4 py-2 text-sm text-text-secondary rounded-lg hover:bg-gray-100 dark:hover:bg-[#111] transition-colors">Tutup</button>
        </div>
      </div>
    </ModalOverlay>
  );
}

// ─── Delete Confirm ───
function DeleteConfirmModal({ user, onClose, onSuccess }: { user: UserItem; onClose: () => void; onSuccess: () => void }) {
  const { removeUser, loading } = useRemoveUser();
  const [error, setError] = useState('');

  const handleDelete = async () => {
    setError('');
    try {
      await removeUser(user.id);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Gagal menghapus user');
    }
  };

  return (
    <ModalOverlay onClose={onClose}>
      <h2 className="text-lg font-heading font-bold text-red-600 mb-4">Hapus Pengguna</h2>
      <p className="text-sm text-text-primary dark:text-text-darkPrimary mb-2">
        Yakin ingin menghapus <strong>{user.name}</strong> ({user.email})?
      </p>
      <p className="text-xs text-text-secondary mb-4">Tindakan ini tidak dapat dibatalkan. Semua data yang terhubung dengan user ini mungkin terdampak.</p>
      {error && <div className="mb-3 p-2 text-xs bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg">{error}</div>}
      <div className="flex gap-2 justify-end">
        <button onClick={onClose} className="px-4 py-2 text-sm text-text-secondary rounded-lg hover:bg-gray-100 dark:hover:bg-[#111] transition-colors">Batal</button>
        <button onClick={handleDelete} disabled={loading} className="px-4 py-2 text-sm text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50">
          {loading ? 'Menghapus...' : 'Hapus Permanen'}
        </button>
      </div>
    </ModalOverlay>
  );
}

// ══════════════════════════════════════════
// HELPERS & ICONS
// ══════════════════════════════════════════

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-sm font-medium text-text-primary dark:text-text-darkPrimary">{label}</label>
      {children}
      <style>{`
        .modal-input {
          width: 100%;
          padding: 0.5rem 0.75rem;
          border-radius: 0.5rem;
          border: 1px solid var(--border-light, #e5e7eb);
          background: white;
          font-size: 0.875rem;
          color: var(--text-primary, #111);
          outline: none;
          transition: box-shadow 0.15s;
        }
        .modal-input:focus {
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
        }
        .dark .modal-input {
          border-color: var(--border-dark, #333);
          background: #111;
          color: var(--text-darkPrimary, #f5f5f5);
        }
      `}</style>
    </div>
  );
}

function ActionButton({ children, title, onClick, className = '' }: { children: React.ReactNode; title: string; onClick: () => void; className?: string }) {
  return (
    <button
      title={title}
      onClick={onClick}
      className={`p-1.5 rounded-md text-text-secondary hover:bg-gray-100 dark:hover:bg-[#1a1a1a] transition-colors ${className}`}
    >
      {children}
    </button>
  );
}

// ══════════════════════════════════════════
// TAB 4: HAK AKSES MENU
// ══════════════════════════════════════════

const MENU_LABELS: Record<string, { label: string; description: string }> = {
  overview: { label: 'Overview', description: 'Dashboard utama & statistik' },
  news: { label: 'News Portal', description: 'Berita & pengumuman' },
  calendar: { label: 'Calendar', description: 'Jadwal & kalender akademik' },
  'student-card': { label: 'Kartu Pelajar', description: 'Kartu identitas siswa' },
  gallery: { label: 'Galeri', description: 'Galeri foto & media' },
  contacts: { label: 'Pesan Masuk', description: 'Pesan dari pengunjung' },
  settings: { label: 'Pengaturan', description: 'Konfigurasi sistem' },
  users: { label: 'Manajemen Users', description: 'Kelola pengguna & role' },
};

function PermissionsTab() {
  const { roles, fetchRoles } = useRoles();
  const { data, loading, saving, fetchPermissions, updatePermissions } = useRoleMenuPermissions();
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  // Local optimistic state for instant toggle feedback
  const [localMenus, setLocalMenus] = useState<Record<string, string[]>>({});

  useEffect(() => {
    fetchRoles();
    fetchPermissions();
  }, [fetchRoles, fetchPermissions]);

  // Sync server data into local state when data changes
  useEffect(() => {
    if (data?.permissions) {
      setLocalMenus(data.permissions);
    }
  }, [data]);

  // Auto-select first non-admin role
  useEffect(() => {
    if (!selectedRole && roles.length > 0) {
      const firstNonAdmin = roles.find((r) => r.value !== 'admin');
      if (firstNonAdmin) setSelectedRole(firstNonAdmin.value);
    }
  }, [roles, selectedRole]);

  const currentMenus = localMenus[selectedRole] || [];
  const allMenus = data?.allMenus || [];
  const isAdmin = selectedRole === 'admin';

  const handleToggle = async (menuKey: string) => {
    if (isAdmin) return;
    setSuccessMsg('');
    setErrorMsg('');

    const newMenus = currentMenus.includes(menuKey)
      ? currentMenus.filter((m) => m !== menuKey)
      : [...currentMenus, menuKey];

    // Optimistic update — instantly reflect in UI
    setLocalMenus((prev) => ({ ...prev, [selectedRole]: newMenus }));

    try {
      await updatePermissions(selectedRole, newMenus);
      setSuccessMsg('Hak akses berhasil disimpan!');
      setTimeout(() => setSuccessMsg(''), 2500);
    } catch (err: any) {
      // Revert on error
      setLocalMenus((prev) => ({ ...prev, [selectedRole]: currentMenus }));
      setErrorMsg(err?.message || 'Gagal menyimpan perubahan');
      setTimeout(() => setErrorMsg(''), 5000);
    }
  };

  if (loading && Object.keys(localMenus).length === 0) {
    return (
      <div className="bg-white dark:bg-[#0a0a0a] border border-border-light dark:border-border-dark rounded-xl p-12 text-center text-text-secondary">
        <svg className="animate-spin h-5 w-5 text-primary mx-auto mb-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        Memuat konfigurasi...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Fixed-height feedback area — prevents layout shift */}
      <div className="h-10 flex items-center">
        {successMsg && (
          <div className="p-2 px-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-sm text-green-700 dark:text-green-400 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
            {successMsg}
          </div>
        )}
        {errorMsg && (
          <div className="p-2 px-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400">
            {errorMsg}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4">
        {/* Role selector */}
        <div className="bg-white dark:bg-[#0a0a0a] border border-border-light dark:border-border-dark rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-border-light dark:border-border-dark">
            <h3 className="font-semibold text-sm text-text-primary dark:text-text-darkPrimary">Pilih Role</h3>
          </div>
          <div className="p-2 space-y-1">
            {roles.map((r) => (
              <button
                key={r.value}
                onClick={() => { setSelectedRole(r.value); setSuccessMsg(''); setErrorMsg(''); }}
                className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150 flex items-center justify-between ${
                  selectedRole === r.value
                    ? 'bg-primary/10 text-primary dark:bg-primary/20'
                    : 'text-text-secondary hover:bg-gray-50 dark:hover:bg-[#111] hover:text-text-primary dark:hover:text-text-darkPrimary'
                }`}
              >
                <span className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full transition-colors duration-150 ${
                    selectedRole === r.value ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-600'
                  }`} />
                  {r.label}
                </span>
                {r.value === 'admin' && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-text-secondary">Full</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Menu toggles */}
        <div className="bg-white dark:bg-[#0a0a0a] border border-border-light dark:border-border-dark rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-border-light dark:border-border-dark flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-sm text-text-primary dark:text-text-darkPrimary">
                Menu untuk: <span className="text-primary">{ROLE_LABELS[selectedRole] || selectedRole}</span>
              </h3>
              <p className="text-xs text-text-secondary mt-0.5">
                {isAdmin ? 'Super Admin memiliki akses ke semua menu (tidak dapat diubah).' : 'Aktifkan/nonaktifkan menu yang tersedia untuk role ini.'}
              </p>
            </div>
          </div>
          <div className="p-4 grid gap-2">
            {allMenus.map((menuKey) => {
              const menuInfo = MENU_LABELS[menuKey] || { label: menuKey, description: '' };
              const isEnabled = currentMenus.includes(menuKey);
              return (
                <div
                  key={menuKey}
                  onClick={() => !isAdmin && handleToggle(menuKey)}
                  className={`flex items-center justify-between p-3 rounded-lg border border-border-light dark:border-border-dark select-none ${
                    isAdmin ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer hover:bg-gray-50 dark:hover:bg-[#111]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors duration-150 ${
                      isEnabled
                        ? 'bg-primary/10 text-primary'
                        : 'bg-gray-100 dark:bg-gray-800 text-text-secondary'
                    }`}>
                      <MenuItemIcon menuKey={menuKey} />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-text-primary dark:text-text-darkPrimary">
                        {menuInfo.label}
                      </div>
                      <div className="text-xs text-text-secondary">
                        {menuInfo.description}
                      </div>
                    </div>
                  </div>
                  {/* Toggle switch — only this part animates */}
                  <div
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors duration-150 ${
                      isEnabled ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-600'
                    } ${isAdmin ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    <span
                      className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform duration-150 ease-in-out ${
                        isEnabled ? 'translate-x-[22px]' : 'translate-x-[3px]'
                      }`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function MenuItemIcon({ menuKey }: { menuKey: string }) {
  const props = { width: 16, height: 16, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  switch (menuKey) {
    case 'overview': return <svg {...props} xmlns="http://www.w3.org/2000/svg"><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></svg>;
    case 'news': return <svg {...props} xmlns="http://www.w3.org/2000/svg"><path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"/></svg>;
    case 'calendar': return <svg {...props} xmlns="http://www.w3.org/2000/svg"><path d="M8 2v4"/><path d="M16 2v4"/><path d="M3 10h18"/><rect width="18" height="18" x="3" y="4" rx="2"/></svg>;
    case 'student-card': return <svg {...props} xmlns="http://www.w3.org/2000/svg"><rect width="18" height="14" x="3" y="5" rx="2"/><path d="M7 15h0M2 9h20"/></svg>;
    case 'gallery': return <svg {...props} xmlns="http://www.w3.org/2000/svg"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>;
    case 'contacts': return <svg {...props} xmlns="http://www.w3.org/2000/svg"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>;
    case 'settings': return <svg {...props} xmlns="http://www.w3.org/2000/svg"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>;
    case 'users': return <svg {...props} xmlns="http://www.w3.org/2000/svg"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
    default: return <svg {...props} xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="10"/></svg>;
  }
}

// ─── SVG Icons (inline to avoid dependency) ───
function SearchIcon({ className = '' }: { className?: string }) {
  return <svg className={className} xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>;
}
function UsersIcon() {
  return <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
}
function ClipboardIcon() {
  return <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect width="8" height="4" x="8" y="2" rx="1" ry="1"/></svg>;
}
function MonitorIcon() {
  return <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="14" x="2" y="3" rx="2"/><line x1="8" x2="16" y1="21" y2="21"/><line x1="12" x2="12" y1="17" y2="21"/></svg>;
}
function PlusIcon() {
  return <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>;
}
function ShieldIcon() {
  return <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/></svg>;
}
function KeyIcon() {
  return <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15.5 7.5 2.3 2.3a1 1 0 0 0 1.4 0l2.1-2.1a1 1 0 0 0 0-1.4L19 4"/><path d="m21 2-9.6 9.6"/><circle cx="7.5" cy="15.5" r="5.5"/></svg>;
}
function BanIcon() {
  return <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="m4.9 4.9 14.2 14.2"/></svg>;
}
function UnlockIcon() {
  return <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg>;
}
function TrashIcon() {
  return <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>;
}
function LockIcon() {
  return <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>;
}
