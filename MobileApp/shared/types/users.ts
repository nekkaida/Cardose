export interface UserData {
  id: string;
  username: string;
  email: string;
  full_name: string;
  phone: string;
  role: 'owner' | 'manager' | 'employee';
  is_active: number;
  created_at: string;
  updated_at?: string;
}

export interface UserStats {
  total: number;
  active: number;
  inactive: number;
  byRole: {
    owner: number;
    manager: number;
    employee: number;
  };
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
  phone?: string;
  role?: 'owner' | 'manager' | 'employee';
}

export interface UpdateUserPayload {
  email?: string;
  full_name?: string;
  phone?: string;
  role?: 'owner' | 'manager' | 'employee';
  password?: string;
}
