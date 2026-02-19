export interface User {
  id: string;
  username: string;
  email: string;
  role: string;
  full_name?: string;
  is_active?: boolean;
}

export interface LoginResponse {
  success: boolean;
  token: string;
  user: User;
}

export interface VerifyResponse {
  valid: boolean;
  user?: User;
}
