import { Injectable } from '@angular/core';
import {Router} from "@angular/router";
import {AuthService} from "../auth/auth.service";
import {AuthResponse} from "../../models/user.model";
import {API_CONFIG} from "../../config/api.config";

@Injectable({
  providedIn: 'root'
})
export class Oauth2Service {
  private readonly BACKEND_URL = API_CONFIG.SERVER_URL;
  private readonly OAUTH2_RESULT_KEY = 'oauth2_popup_result';
  private popupWindow: Window | null = null;
  private popupResultInterval: number | null = null;
  private storageListener?: (event: StorageEvent) => void;

  constructor(
    private router: Router,
    private authService: AuthService
  ) {}

  /**
   * Initiates OAuth2 login flow in a popup window
   * @param provider - 'google', 'github', or 'facebook'
   */
  initiateOAuth2Login(provider: string): void {
    const authorizationUrl = `${this.BACKEND_URL}/oauth2/authorization/${provider}`;
    localStorage.removeItem(this.OAUTH2_RESULT_KEY);

    // Open popup window
    const width = 500;
    const height = 600;
    const left = (window.innerWidth - width) / 2;
    const top = (window.innerHeight - height) / 2;

    this.popupWindow = window.open(
      authorizationUrl,
      'OAuth2Login',
      `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
    );

    if (!this.popupWindow) {
      alert('Popup blocked. Please enable popups for this site.');
      return;
    }

    // Monitor same-origin popup result without opener/closed APIs (COOP-safe)
    this.startPopupMonitor();
  }

  /**
   * Monitor popup for messages and handle results
   */
  private startPopupMonitor(): void {
    this.stopPopupMonitor();

    this.storageListener = (event: StorageEvent) => {
      if (event.key !== this.OAUTH2_RESULT_KEY || !event.newValue) {
        return;
      }
      this.consumePopupResult(event.newValue);
    };
    window.addEventListener('storage', this.storageListener);

    // Fallback polling for browsers/storage edge cases
    const startedAt = Date.now();
    this.popupResultInterval = window.setInterval(() => {
      const raw = localStorage.getItem(this.OAUTH2_RESULT_KEY);
      if (raw) {
        this.consumePopupResult(raw);
      } else if (Date.now() - startedAt > 3 * 60 * 1000) {
        this.stopPopupMonitor();
      }
    }, 500);
  }

  private consumePopupResult(raw: string): void {
    try {
      const result = JSON.parse(raw);
      if (result.type === 'OAUTH2_SUCCESS') {
        this.handleOAuth2PopupResponse(result.payload);
      } else if (result.type === 'OAUTH2_ERROR') {
        this.handleOAuth2Error(result.error);
      }
    } catch (e) {
      console.error('Invalid OAuth2 popup result payload', e);
    } finally {
      localStorage.removeItem(this.OAUTH2_RESULT_KEY);
      this.stopPopupMonitor();
    }
  }

  private stopPopupMonitor(): void {
    if (this.popupResultInterval !== null) {
      window.clearInterval(this.popupResultInterval);
      this.popupResultInterval = null;
    }
    if (this.storageListener) {
      window.removeEventListener('storage', this.storageListener);
      this.storageListener = undefined;
    }
  }

  /**
   * Handle OAuth2 response from popup
   */
  private handleOAuth2PopupResponse(payload: any): void {
    const { access_token, refresh_token, user_id, email, first_name, last_name, profile_picture_url, requires_role_selection, roles } = payload;

    if (access_token && refresh_token) {
      const authResponse: AuthResponse = {
        access_token,
        refresh_token,
        user_id: user_id || undefined,
        email: email || undefined,
        first_name: first_name || undefined,
        last_name: last_name || undefined,
        profile_picture_url: profile_picture_url || undefined,
        requires_role_selection,
        roles: roles || []
      };

      console.log('OAuth2 Success from popup');
      this.authService.handleOAuth2Response(authResponse);

      if (requires_role_selection) {
        this.router.navigate(['/role-selection']);
      } else {
        const dashboardRoute = this.getDashboardRoute(authResponse.roles || []);
        this.router.navigate([dashboardRoute]);
      }
    }
  }

  /**
   * Handle OAuth2 error
   */
  private handleOAuth2Error(error: string): void {
    console.error('OAuth2 Error:', error);
    alert('OAuth2 authentication failed: ' + error);
  }

  /**
   * Handles OAuth2 callback from backend
   * Sends data to parent window if opened in popup, or navigates directly if full page
   */
  handleOAuth2Callback(): void {
    const urlParams = new URLSearchParams(window.location.search);

    const accessToken = urlParams.get('access_token');
    const refreshToken = urlParams.get('refresh_token');
    const userId = urlParams.get('user_id');
    const email = urlParams.get('email');
    const firstName = urlParams.get('first_name');
    const lastName = urlParams.get('last_name');
    const profilePictureUrl = urlParams.get('profile_picture_url');
    const error = urlParams.get('error');
    const requiresRoleSelection = urlParams.get('requires_role_selection') === 'true';
    const roles = (urlParams.get('roles') || '')
      .split(',')
      .map(role => role.trim())
      .filter(role => role.length > 0);

    console.log('OAuth2 Callback: Processing response', {
      hasAccessToken: !!accessToken,
      hasRefreshToken: !!refreshToken,
      error,
      requiresRoleSelection,
      rolesCount: roles.length
    });

    if (error) {
      const errorMessage = this.getErrorMessage(error);
      console.error('OAuth2 Error:', errorMessage);

      if (this.isOAuthPopupWindow()) {
        localStorage.setItem(this.OAUTH2_RESULT_KEY, JSON.stringify({
          type: 'OAUTH2_ERROR',
          error: errorMessage
        }));
        this.renderPopupDoneMessage(false, errorMessage);
      } else {
        alert(errorMessage);
        this.router.navigate(['/login']);
      }
      return;
    }

    if (accessToken && refreshToken) {
      const payload = {
        access_token: accessToken,
        refresh_token: refreshToken,
        user_id: userId,
        email: email,
        first_name: firstName,
        last_name: lastName,
        profile_picture_url: profilePictureUrl,
        requires_role_selection: requiresRoleSelection,
        roles
      };

      if (this.isOAuthPopupWindow()) {
        localStorage.setItem(this.OAUTH2_RESULT_KEY, JSON.stringify({
          type: 'OAUTH2_SUCCESS',
          payload
        }));
        this.renderPopupDoneMessage(true);
      } else {
        // Handle directly if not in popup (fallback)
        const authResponse: AuthResponse = {
          access_token: accessToken,
          refresh_token: refreshToken,
          user_id: userId || undefined,
          email: email || undefined,
          first_name: firstName || undefined,
          last_name: lastName || undefined,
          profile_picture_url: profilePictureUrl || undefined,
          requires_role_selection: requiresRoleSelection,
          roles
        };

        console.log('OAuth2 Success: Storing tokens');
        this.authService.handleOAuth2Response(authResponse);

        if (requiresRoleSelection) {
          this.router.navigate(['/role-selection']);
        } else {
          const dashboardRoute = this.getDashboardRoute(roles);
          this.router.navigate([dashboardRoute]);
        }
      }
    } else {
      console.error('OAuth2 Error: No tokens received');
      if (this.isOAuthPopupWindow()) {
        localStorage.setItem(this.OAUTH2_RESULT_KEY, JSON.stringify({
          type: 'OAUTH2_ERROR',
          error: 'No tokens received from backend'
        }));
        this.renderPopupDoneMessage(false, 'No tokens received from backend');
      } else {
        alert('OAuth2 authentication failed.');
        this.router.navigate(['/login']);
      }
    }
  }

  /**
   * Get user-friendly error message
   */
  private getErrorMessage(error: string): string {
    switch (error) {
      case 'invalid_client':
        return 'OAuth2 Configuration Error: Invalid Client ID/Secret. Please contact support.';
      case 'unauthorized_client':
        return 'The OAuth application is not authorized. Please verify your settings.';
      case 'access_denied':
        return 'You denied access to your account. Please try again and grant permissions.';
      default:
        return 'OAuth2 authentication failed: ' + error;
    }
  }

  private isOAuthPopupWindow(): boolean {
    return window.name === 'OAuth2Login';
  }

  private renderPopupDoneMessage(success: boolean, details?: string): void {
    const bg = success ? '#ecfdf3' : '#fff1f2';
    const border = success ? '#bbf7d0' : '#fecdd3';
    const title = success ? 'Authentication Complete' : 'Authentication Failed';
    const subtitle = success
      ? 'Authentication complete. Closing this window...'
      : `${details || 'Authentication failed. Please close this window and try again.'}`;

    document.body.innerHTML = `
      <div style="font-family: 'Plus Jakarta Sans', sans-serif; background:${bg}; border:1px solid ${border}; margin:40px auto; max-width:520px; border-radius:16px; padding:24px; text-align:center;">
        <h2 style="margin:0 0 10px; font-size:22px;">${title}</h2>
        <p style="margin:0; color:#4b5563;">${subtitle}</p>
      </div>
    `;

    // Attempt to close the popup automatically. If blocked, keep the message visible so user can close manually.
    try {
      // Give the UI a moment to render so users briefly see the confirmation
      setTimeout(() => {
        // If opened by a script, window.close() should succeed
        if (window.opener || window.name === 'OAuth2Login') {
          window.close();
        }
      }, 800);
    } catch (e) {
      // Ignore errors - some browsers may block programmatic close
      console.warn('[v0] Unable to auto-close OAuth popup', e);
    }
  }

  private getDashboardRoute(roles: string[]): string {
    if (roles.includes('ROLE_TEACHER')) {
      return '/teacher-dashboard';
    }

    if (roles.includes('ROLE_STUDENT')) {
      return '/student-dashboard';
    }

    return '/role-selection';
  }
}
