export type UserRole = 'owner' | 'manager' | 'employee';

export interface UserData {
  id: string;
  username: string;
  email: string;
  full_name: string;
  phone: string | null;
  role: UserRole;
  /** Normalized to boolean by the API hook (SQLite stores as 0/1) */
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}

export interface UserStats {
  total: number;
  active: number;
  inactive: number;
  byRole: Record<UserRole, number>;
}

export interface UsersListParams {
  page?: number;
  limit?: number;
  role?: string;
  search?: string;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

export interface UsersListResponse {
  success: boolean;
  users: UserData[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  stats: UserStats;
}

export interface CreateUserPayload {
  username: string;
  email: string;
  password: string;
  full_name: string;
  phone?: string | null;
  role?: UserRole;
}

export interface UpdateUserPayload {
  email?: string;
  full_name?: string;
  phone?: string | null;
  role?: UserRole;
  password?: string;
}
