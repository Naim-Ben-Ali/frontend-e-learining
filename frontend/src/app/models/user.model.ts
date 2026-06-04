export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  dateOfBirth?: string | null;
  profilePictureUrl?: string | null;
  enabled: boolean;
  hasSelectedRole: boolean;
  roles: string[];
  createdDate: Date;
}

export interface AuthRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  phoneNumber: string;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  token_type?: string;
  requires_role_selection: boolean;
  user_id?: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  profile_picture_url?: string;
  roles?: string[]; // User's assigned roles
}

export interface RoleSelectionRequest {
  user_id: string;
  selected_roles: string[];
}

export interface ProfileUpdateRequest {
  firstName: string;
  lastName: string;
  phoneNumber?: string | null;
  dateOfBirth?: string | null;
  profilePictureUrl?: string | null;
}
