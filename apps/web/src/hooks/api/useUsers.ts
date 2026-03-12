import { useState, useCallback } from 'react';
import { authClient } from '../../lib/auth-client';
import { apiClient } from '../../lib/api';

// ─── Types ───
export interface UserItem {
  id: string;
  name: string;
  email: string;
  role: string;
  image?: string | null;
  banned?: boolean;
  banReason?: string | null;
  banExpires?: number | null;
  emailVerified: boolean;
  createdAt: string;
}

export interface SessionItem {
  id: string;
  token: string;
  userId: string;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export interface AuditLogItem {
  id: string;
  userId: string | null;
  userName: string | null;
  userEmail: string | null;
  action: string;
  targetType: string | null;
  targetId: string | null;
  details: string | null;
  ipAddress: string | null;
  createdAt: string;
}

export interface RoleItem {
  value: string;
  label: string;
}

// ─── List Users ───
export function useListUsers() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  const fetchUsers = useCallback(async (params?: {
    limit?: number;
    offset?: number;
    searchValue?: string;
    searchField?: 'email' | 'name';
    filterField?: string;
    filterValue?: string;
    sortBy?: string;
    sortDirection?: 'asc' | 'desc';
  }) => {
    setLoading(true);
    try {
      const { data, error } = await (authClient.admin as any).listUsers({
        query: {
          limit: params?.limit || 20,
          offset: params?.offset || 0,
          ...(params?.searchValue ? {
            searchValue: params.searchValue,
            searchField: params.searchField || 'name',
            searchOperator: 'contains',
          } : {}),
          ...(params?.filterField && params?.filterValue ? {
            filterField: params.filterField,
            filterValue: params.filterValue,
            filterOperator: 'eq',
          } : {}),
          sortBy: params?.sortBy || 'createdAt',
          sortDirection: params?.sortDirection || 'desc',
        },
      });
      if (error) throw new Error(error.message);
      setUsers(data?.users || []);
      setTotal(data?.total || 0);
    } catch (err) {
      console.error('Failed to fetch users:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  return { users, total, loading, fetchUsers };
}

// ─── Create User ───
export function useCreateUser() {
  const [loading, setLoading] = useState(false);

  const createUser = useCallback(async (params: {
    email: string;
    password: string;
    name: string;
    role: string;
  }) => {
    setLoading(true);
    try {
      const { data, error } = await (authClient.admin as any).createUser({
        email: params.email,
        password: params.password,
        name: params.name,
        role: params.role,
      });
      if (error) throw new Error(error.message);
      return data;
    } finally {
      setLoading(false);
    }
  }, []);

  return { createUser, loading };
}

// ─── Set Role ───
export function useSetUserRole() {
  const [loading, setLoading] = useState(false);

  const setRole = useCallback(async (userId: string, role: string) => {
    setLoading(true);
    try {
      const { data, error } = await (authClient.admin as any).setRole({
        userId,
        role,
      });
      if (error) throw new Error(error.message);
      return data;
    } finally {
      setLoading(false);
    }
  }, []);

  return { setRole, loading };
}

// ─── Set Password ───
export function useSetUserPassword() {
  const [loading, setLoading] = useState(false);

  const setPassword = useCallback(async (userId: string, newPassword: string) => {
    setLoading(true);
    try {
      const { data, error } = await (authClient.admin as any).setUserPassword({
        userId,
        newPassword,
      });
      if (error) throw new Error(error.message);
      return data;
    } finally {
      setLoading(false);
    }
  }, []);

  return { setPassword, loading };
}

// ─── Ban / Unban ───
export function useBanUser() {
  const [loading, setLoading] = useState(false);

  const banUser = useCallback(async (userId: string, banReason?: string, banExpiresIn?: number) => {
    setLoading(true);
    try {
      const { error } = await (authClient.admin as any).banUser({
        userId,
        ...(banReason ? { banReason } : {}),
        ...(banExpiresIn ? { banExpiresIn } : {}),
      });
      if (error) throw new Error(error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  return { banUser, loading };
}

export function useUnbanUser() {
  const [loading, setLoading] = useState(false);

  const unbanUser = useCallback(async (userId: string) => {
    setLoading(true);
    try {
      const { error } = await (authClient.admin as any).unbanUser({ userId });
      if (error) throw new Error(error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  return { unbanUser, loading };
}

// ─── Sessions ───
export function useListUserSessions() {
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchSessions = useCallback(async (userId: string) => {
    setLoading(true);
    try {
      const { data, error } = await (authClient.admin as any).listUserSessions({ userId });
      if (error) throw new Error(error.message);
      setSessions(data || []);
    } catch (err) {
      console.error('Failed to fetch sessions:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const revokeSession = useCallback(async (sessionToken: string) => {
    try {
      const { error } = await (authClient.admin as any).revokeUserSession({ sessionToken });
      if (error) throw new Error(error.message);
    } catch (err) {
      console.error('Failed to revoke session:', err);
      throw err;
    }
  }, []);

  const revokeAllSessions = useCallback(async (userId: string) => {
    try {
      const { error } = await (authClient.admin as any).revokeUserSessions({ userId });
      if (error) throw new Error(error.message);
    } catch (err) {
      console.error('Failed to revoke all sessions:', err);
      throw err;
    }
  }, []);

  return { sessions, loading, fetchSessions, revokeSession, revokeAllSessions };
}

// ─── Remove User ───
export function useRemoveUser() {
  const [loading, setLoading] = useState(false);

  const removeUser = useCallback(async (userId: string) => {
    setLoading(true);
    try {
      const { error } = await (authClient.admin as any).removeUser({ userId });
      if (error) throw new Error(error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  return { removeUser, loading };
}

// ─── Audit Logs (custom API) ───
export function useAuditLogs() {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  const fetchLogs = useCallback(async (params?: {
    userId?: string;
    action?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
    offset?: number;
  }) => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (params?.userId) queryParams.set('userId', params.userId);
      if (params?.action) queryParams.set('action', params.action);
      if (params?.startDate) queryParams.set('startDate', params.startDate);
      if (params?.endDate) queryParams.set('endDate', params.endDate);
      if (params?.limit) queryParams.set('limit', String(params.limit));
      if (params?.offset) queryParams.set('offset', String(params.offset));

      const result = await apiClient<{ logs: AuditLogItem[]; total: number }>(
        `/users/audit-logs?${queryParams.toString()}`
      );
      setLogs(result.logs);
      setTotal(result.total);
    } catch (err) {
      console.error('Failed to fetch audit logs:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  return { logs, total, loading, fetchLogs };
}

// ─── Roles List ───
export function useRoles() {
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchRoles = useCallback(async () => {
    setLoading(true);
    try {
      const result = await apiClient<RoleItem[]>('/users/roles');
      setRoles(result);
    } catch (err) {
      console.error('Failed to fetch roles:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  return { roles, loading, fetchRoles };
}

// ─── Role Menu Permissions ───
export interface RoleMenuPermissions {
  permissions: Record<string, string[]>;
  allMenus: string[];
}

export function useRoleMenuPermissions() {
  const [data, setData] = useState<RoleMenuPermissions | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchPermissions = useCallback(async () => {
    setLoading(true);
    try {
      const result = await apiClient<RoleMenuPermissions>('/users/role-permissions');
      setData(result);
    } catch (err) {
      console.error('Failed to fetch role permissions:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const updatePermissions = useCallback(async (role: string, menus: string[]) => {
    setSaving(true);
    try {
      const result = await apiClient<{ success: boolean; permissions: Record<string, string[]> }>(
        '/users/role-permissions',
        {
          method: 'PUT',
          body: JSON.stringify({ role, menus }),
          headers: { 'Content-Type': 'application/json' },
        }
      );
      if (result.success && data) {
        setData({ ...data, permissions: result.permissions });
      }
      return result;
    } finally {
      setSaving(false);
    }
  }, [data]);

  return { data, loading, saving, fetchPermissions, updatePermissions };
}
