import { Injectable } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor, HttpErrorResponse
} from '@angular/common/http';
import {BehaviorSubject, catchError, filter, Observable, of, switchMap, take, throwError} from 'rxjs';
import {StorageService} from "../../services/storage/storage.service";
import {AuthService} from "../../services/auth/auth.service";
import { API_CONFIG } from '../../config/api.config';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  private isRefreshing = false;
  private refreshTokenSubject = new BehaviorSubject<string | null>(null);

  constructor(
    private storageService: StorageService,
    private authService: AuthService
  ) {}

  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    const token = this.storageService.getAccessToken();
    const refreshToken = this.storageService.getRefreshToken();
    const isSubscriptionUrl = request.url.includes('/subscriptions');
    const isApiRequest = request.url.startsWith(API_CONFIG.BASE_URL) || request.url.startsWith(`${API_CONFIG.SERVER_URL}/api/`);
    const isAuthLoginUrl = request.url.includes('/auth/login');
    const isAuthRegisterUrl = request.url.includes('/auth/register');
    const isAuthRefreshUrl = request.url.includes('/auth/refresh');
    const isAuthUrl = isAuthLoginUrl || isAuthRegisterUrl || isAuthRefreshUrl;
    const tokenExpired = !!token && this.storageService.isTokenExpired(token);
    const hasValidRefreshToken = !!refreshToken && !this.storageService.isTokenExpired(refreshToken);

    console.log('AuthInterceptor - intercept called:', {
      url: request.url,
      method: request.method,
      hasToken: !!token,
      tokenLength: token ? token.length : 0,
      tokenExpired: tokenExpired,
      hasRefreshToken: !!refreshToken,
      isApiRequest: isApiRequest,
      isAuthUrl: isAuthUrl,
      isSubscriptionUrl: isSubscriptionUrl
    });

    // Add token to all requests except auth endpoints when access token is valid
    if (isApiRequest && token && !tokenExpired && !isAuthUrl) {
      if (isSubscriptionUrl) {
        console.log('AuthInterceptor - Adding Authorization header to subscription request');
      }
      request = request.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`
        }
      });
    } else {
      console.log('AuthInterceptor - Skipping header (no token or auth endpoint)');
    }

    // Proactively refresh token before protected API calls to avoid immediate 401
    if (isApiRequest && !isAuthUrl && (!token || tokenExpired) && hasValidRefreshToken) {
      return this.refreshAccessToken().pipe(
        switchMap((newToken) => next.handle(request.clone({
          setHeaders: {
            Authorization: `Bearer ${newToken}`
          }
        })))
      );
    }

    return next.handle(request).pipe(
      catchError(error => {
        if (
          error instanceof HttpErrorResponse &&
          error.status === 401 &&
          isApiRequest &&
          !request.url.includes('/auth/refresh')
        ) {
          return this.handle401Error(request, next);
        }
        return throwError(() => error);
      })
    );
  }

  private handle401Error(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    const refreshToken = this.storageService.getRefreshToken();
    if (!refreshToken || this.storageService.isTokenExpired(refreshToken)) {
      this.authService.logout();
      return throwError(() => new Error('No valid refresh token available'));
    }

    return this.refreshAccessToken().pipe(
      switchMap((newToken) => next.handle(request.clone({
        setHeaders: {
          Authorization: `Bearer ${newToken}`
        }
      })))
    );
  }

  private refreshAccessToken(): Observable<string> {
    if (!this.isRefreshing) {
      this.isRefreshing = true;
      this.refreshTokenSubject.next(null);

      return this.authService.refreshToken().pipe(
        switchMap((response) => {
          const newToken = response.access_token;
          this.isRefreshing = false;
          this.refreshTokenSubject.next(newToken);
          return of(newToken);
        }),
        catchError(error => {
          this.isRefreshing = false;
          this.authService.logout();
          this.refreshTokenSubject.error(error);
          this.refreshTokenSubject = new BehaviorSubject<string | null>(null);
          return throwError(() => error);
        })
      );
    }

    return this.refreshTokenSubject.pipe(
      filter((token): token is string => token !== null),
      take(1)
    );
  }
}
