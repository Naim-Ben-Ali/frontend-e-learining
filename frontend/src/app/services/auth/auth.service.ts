import { Injectable } from '@angular/core';
import {BehaviorSubject, Observable, tap, throwError} from "rxjs";
import {AuthRequest, AuthResponse, RegisterRequest} from "../../models/user.model";
import {API_CONFIG} from "../../config/api.config";
import {HttpClient} from "@angular/common/http";
import {StorageService} from "../storage/storage.service";

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private isAuthenticatedSubject = new BehaviorSubject<boolean>(false);

  private authResponseSubject = new BehaviorSubject<AuthResponse | null>(null);

  private baseUrl = API_CONFIG.BASE_URL;

  constructor(
    private http: HttpClient,
    private storageService: StorageService
  ) {
    this.initializeAuth();
  }

  private initializeAuth(): void {
    const accessToken = this.storageService.getAccessToken();
    const refreshToken = this.storageService.getRefreshToken();
    const hasValidAccessToken = !!accessToken && !this.storageService.isTokenExpired(accessToken);
    const hasValidRefreshToken = !!refreshToken && !this.storageService.isTokenExpired(refreshToken);

    if (!hasValidAccessToken && !hasValidRefreshToken) {
      this.storageService.clearTokens();
      this.isAuthenticatedSubject.next(false);
      this.authResponseSubject.next(null);
      return;
    }

    this.isAuthenticatedSubject.next(true);
    this.authResponseSubject.next({
      access_token: accessToken || '',
      refresh_token: refreshToken || '',
      user_id: this.storageService.getUserId() || undefined,
      email: this.storageService.getUserEmail() || undefined,
      first_name: this.storageService.getFirstName() || undefined,
      last_name: this.storageService.getLastName() || undefined,
      profile_picture_url: this.storageService.getProfilePictureUrl() || undefined,
      roles: this.storageService.getUserRoles(),
      requires_role_selection: this.storageService.getRequiresRoleSelection()
    });
  }

  login(request: AuthRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(
      `${this.baseUrl}${API_CONFIG.ENDPOINTS.AUTH.LOGIN}`,
      request
    ).pipe(
      tap(response => this.handleAuthResponse(response))
    );
  }

  register(request: RegisterRequest): Observable<any> {
    return this.http.post(
      `${this.baseUrl}${API_CONFIG.ENDPOINTS.AUTH.REGISTER}`,
      request
    );
  }

  logout(): void {
    this.storageService.clearTokens();
    this.isAuthenticatedSubject.next(false);
    this.authResponseSubject.next(null);
  }

  refreshToken(): Observable<AuthResponse> {
    const refreshToken = this.storageService.getRefreshToken();
    if (!refreshToken || this.storageService.isTokenExpired(refreshToken)) {
      return throwError(() => new Error('No valid refresh token'));
    }
    return this.http.post<AuthResponse>(
      `${this.baseUrl}${API_CONFIG.ENDPOINTS.AUTH.REFRESH}`,
      { refreshToken }
    ).pipe(
      tap(response => this.handleAuthResponse(response))
    );
  }

  private handleAuthResponse(response: AuthResponse): void {
    this.storageService.setAccessToken(response.access_token);
    this.storageService.setRefreshToken(response.refresh_token);
    this.storageService.setRequiresRoleSelection(response.requires_role_selection ?? false);

    if (response.user_id || response.email) {
      this.storageService.setUserInfo(
        response.user_id || '',
        response.email || '',
        response.first_name || '',
        response.last_name || '',
        response.profile_picture_url || ''
      );
    }

    if (response.roles) {
      this.storageService.setUserRoles(response.roles);
    }

    this.isAuthenticatedSubject.next(true);
    this.authResponseSubject.next({
      ...response,
      user_id: response.user_id ?? this.storageService.getUserId() ?? undefined,
      email: response.email ?? this.storageService.getUserEmail() ?? undefined,
      first_name: response.first_name ?? this.storageService.getFirstName() ?? undefined,
      last_name: response.last_name ?? this.storageService.getLastName() ?? undefined,
      profile_picture_url: response.profile_picture_url ?? this.storageService.getProfilePictureUrl() ?? undefined,
      roles: response.roles ?? this.storageService.getUserRoles(),
      requires_role_selection: response.requires_role_selection ?? this.storageService.getRequiresRoleSelection()
    });
  }

  getAuthResponse(): AuthResponse | null {
    return this.authResponseSubject.value;
  }

  isAuthenticated(): boolean {
    return this.isAuthenticatedSubject.value;
  }

  requiresRoleSelection(): boolean {
    const response = this.authResponseSubject.value;
    return response?.requires_role_selection ?? this.storageService.getRequiresRoleSelection();
  }

  // Public method for OAuth2 flow to update auth state
  handleOAuth2Response(response: AuthResponse): void {
    this.handleAuthResponse(response);
  }
}
