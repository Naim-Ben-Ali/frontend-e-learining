import { Injectable } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor, HttpErrorResponse
} from '@angular/common/http';
import {catchError, Observable, throwError} from 'rxjs';

export interface ErrorResponse {
  message: string;
  status: number;
}


@Injectable()
export class ErrorInterceptor implements HttpInterceptor {
  constructor() {}

  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    if (request.url.includes('/select-roles')) {
      console.log('ErrorInterceptor - select-roles request started:', {
        url: request.url,
        method: request.method,
        hasAuthHeader: !!request.headers.get('Authorization')
      });
    }

    return next.handle(request).pipe(
      catchError((error: HttpErrorResponse) => {
        // Only handle actual errors (4xx, 5xx status codes)
        // Do not treat successful responses as errors
        if (error.status >= 200 && error.status < 300) {
          console.log('Skipping error handling for successful response:', error.status);
          return throwError(() => error);
        }

        if (request.url.includes('/select-roles')) {
          console.log('ErrorInterceptor - select-roles error caught:', {
            status: error.status,
            statusText: error.statusText,
            url: error.url,
            hasContent: !!error.error
          });
        }

        let errorResponse: ErrorResponse = {
          message: 'An unexpected error occurred',
          status: error.status
        };

        if (error.error instanceof ErrorEvent) {
          // Client-side error
          errorResponse.message = error.error.message;
        } else {
          // Server-side error
          if (error.error && typeof error.error === 'object') {
            const validationErrors = (error.error as any).validationErrors as Record<string, string> | undefined;
            const validationMessage = validationErrors
              ? Object.entries(validationErrors).map(([field, message]) => `${field}: ${message}`).join(', ')
              : '';
            errorResponse.message =
              validationMessage ||
              error.error.message ||
              error.error.error ||
              error.error.title ||
              error.statusText ||
              errorResponse.message;
          } else {
            errorResponse.message = error.statusText || errorResponse.message;
          }
        }

        console.error('Error intercepted:', errorResponse);
        return throwError(() => errorResponse);
      })
    );
  }
}
