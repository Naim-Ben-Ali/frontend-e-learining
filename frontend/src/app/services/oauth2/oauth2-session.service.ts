import { Injectable } from '@angular/core';
import { Router } from '@angular/router';

/**
 * Service to manage OAuth2 session and account switching
 * Handles automatic account selection and switching between accounts
 */
@Injectable({
  providedIn: 'root'
})
export class Oauth2SessionService {

  constructor(private router: Router) { }

  /**
   * Initiates Google logout and account switching flow
   * This clears the Google session so user can select a different account on next login
   *
   * Works by:
   * 1. Opens Google logout URL in a popup/window
   * 2. Clears local auth tokens
   * 3. Redirects to login page
   */
  switchGoogleAccount(): void {
    console.log('[v0] Initiating Google account switch...');

    // Clear application tokens first
    this.clearAppTokens();

    // Open Google logout URL in a popup to clear Google session
    // This forces Google to show account chooser on next login
    const googleLogoutUrl = 'https://accounts.google.com/logout';

    try {
      // Try opening in a popup window (less disruptive)
      const popup = window.open(googleLogoutUrl, 'google_logout', 'width=500,height=600,noopener,noreferrer');

      // If popup was blocked, fall back to redirect
      if (!popup) {
        console.warn('Popup was blocked, using redirect instead');
        this.redirectToLogin();
        return;
      }

      // Redirect after a short delay; do not touch popup.closed/window.close (COOP-safe)
      setTimeout(() => {
        this.redirectToLogin();
      }, 1500);

    } catch (error) {
      console.error('Error during account switch:', error);
      this.redirectToLogin();
    }
  }

  /**
   * Clears all application authentication tokens
   */
  private clearAppTokens(): void {
    console.log('Clearing application tokens');
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user_id');
    localStorage.removeItem('user_email');
    sessionStorage.clear();
  }

  /**
   * Redirects user to login page
   */
  private redirectToLogin(): void {
    console.log('Redirecting to login page');
    this.router.navigate(['/login']).catch(err => {
      console.error('Navigation error:', err);
      window.location.href = '/login';
    });
  }
}
