import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class StorageService {
  private readonly ACCESS_TOKEN_KEY = 'access_token';
  private readonly REFRESH_TOKEN_KEY = 'refresh_token';
  private readonly USER_ID_KEY = 'user_id';
  private readonly USER_EMAIL_KEY = 'user_email';
  private readonly FIRST_NAME_KEY = 'first_name';
  private readonly LAST_NAME_KEY = 'last_name';
  private readonly PROFILE_PICTURE_URL_KEY = 'profile_picture_url';
  private readonly USER_ROLES_KEY = 'user_roles';
  private readonly REQUIRES_ROLE_SELECTION_KEY = 'requires_role_selection';

  setAccessToken(token: string): void {
    localStorage.setItem(this.ACCESS_TOKEN_KEY, token);
  }

  getAccessToken(): string | null {
    return localStorage.getItem(this.ACCESS_TOKEN_KEY);
  }

  setRefreshToken(token: string): void {
    localStorage.setItem(this.REFRESH_TOKEN_KEY, token);
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(this.REFRESH_TOKEN_KEY);
  }

  setUserInfo(userId: string, email: string, firstName: string = '', lastName: string = '', profilePictureUrl: string = ''): void {
    localStorage.setItem(this.USER_ID_KEY, userId);
    localStorage.setItem(this.USER_EMAIL_KEY, email);
    localStorage.setItem(this.FIRST_NAME_KEY, firstName);
    localStorage.setItem(this.LAST_NAME_KEY, lastName);
    localStorage.setItem(this.PROFILE_PICTURE_URL_KEY, profilePictureUrl);
  }

  getUserId(): string | null {
    return localStorage.getItem(this.USER_ID_KEY);
  }

  getUserEmail(): string | null {
    return localStorage.getItem(this.USER_EMAIL_KEY);
  }

  getFirstName(): string | null {
    return localStorage.getItem(this.FIRST_NAME_KEY);
  }

  getLastName(): string | null {
    return localStorage.getItem(this.LAST_NAME_KEY);
  }

  getProfilePictureUrl(): string | null {
    return localStorage.getItem(this.PROFILE_PICTURE_URL_KEY);
  }

  setUserRoles(roles: string[]): void {
    localStorage.setItem(this.USER_ROLES_KEY, JSON.stringify(roles));
  }

  getUserRoles(): string[] {
    const roles = localStorage.getItem(this.USER_ROLES_KEY);
    return roles ? JSON.parse(roles) : [];
  }

  setRequiresRoleSelection(requiresRoleSelection: boolean): void {
    localStorage.setItem(this.REQUIRES_ROLE_SELECTION_KEY, JSON.stringify(requiresRoleSelection));
  }

  getRequiresRoleSelection(): boolean {
    const value = localStorage.getItem(this.REQUIRES_ROLE_SELECTION_KEY);
    return value ? JSON.parse(value) : false;
  }

  clearTokens(): void {
    localStorage.removeItem(this.ACCESS_TOKEN_KEY);
    localStorage.removeItem(this.REFRESH_TOKEN_KEY);
    localStorage.removeItem(this.USER_ID_KEY);
    localStorage.removeItem(this.USER_EMAIL_KEY);
    localStorage.removeItem(this.FIRST_NAME_KEY);
    localStorage.removeItem(this.LAST_NAME_KEY);
    localStorage.removeItem(this.PROFILE_PICTURE_URL_KEY);
    localStorage.removeItem(this.USER_ROLES_KEY);
    localStorage.removeItem(this.REQUIRES_ROLE_SELECTION_KEY);
  }

  isTokenExpired(token: string): boolean {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const exp = payload.exp * 1000;
      return Date.now() >= exp;
    } catch {
      return true;
    }
  }
}
