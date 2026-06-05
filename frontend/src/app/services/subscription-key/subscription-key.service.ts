import { Injectable } from '@angular/core';
import {API_CONFIG} from "../../config/api.config";
import {BehaviorSubject, Observable, throwError, tap} from "rxjs";
import {SubscriptionKey, SubscriptionRequest} from "../../models/subscription-key.model";
import {HttpClient, HttpErrorResponse} from "@angular/common/http";
import {catchError, retry, map} from "rxjs/operators";

@Injectable({
  providedIn: 'root'
})
export class SubscriptionKeyService {

  private baseUrl = API_CONFIG.BASE_URL;
  private courseKeysSubject = new BehaviorSubject<Map<string, SubscriptionKey>>(new Map());
  public courseKeys$ = this.courseKeysSubject.asObservable();

  constructor(private http: HttpClient) {}

    /**
   * Normalize backend camelCase response to frontend snake_case model
   */
  private normalizeKey(raw: any): SubscriptionKey {
    return {
      id: raw?.id,
      subscription_key: raw?.subscriptionKey ?? raw?.subscription_key,
      course_id: raw?.courseId ?? raw?.course_id,
      course_name: raw?.courseName ?? raw?.course_name,
      teacher_id: raw?.teacherId ?? raw?.teacher_id,
      is_active: raw?.active ?? raw?.is_active,
      created_date: raw?.createdDate ?? raw?.created_date,
      deactivated_date: raw?.deactivatedDate ?? raw?.deactivated_date ?? null
    } as SubscriptionKey;
  }

  /**
   * Get the current active subscription key for a specific course
   */
  getActiveCourseKey(courseId: string): Observable<SubscriptionKey> {
    return this.http.get<SubscriptionKey>(
      `${this.baseUrl}/subscriptions/courses/${courseId}/key/active`
    ).pipe(
      retry(1),
      map(key => this.normalizeKey(key)),
      tap(key => this.cacheKey(courseId, key)),
      catchError((error: HttpErrorResponse) => {
        if (error.status === 404) {
          return throwError(() => new Error('No active subscription key for this course'));
        }
        if (error.status === 403) {
          return throwError(() => new Error('Subscription required for this course'));
        }
        return this.handleHttpError(error, 'Failed to load subscription key');
      })
    );
  }

  /**
   * Get all subscription keys for a teacher's courses
   */
  getTeacherKeys(): Observable<SubscriptionKey[]> {
    return this.http.get<SubscriptionKey[]>(
      `${this.baseUrl}/subscriptions/teacher/keys`
    ).pipe(
      map((keys: any[]) => keys.map(k => this.normalizeKey(k))),
      tap(keys => {
        keys.forEach(key => this.cacheKey(key.course_id, key));
      }),
      catchError(error => this.handleHttpError(error, 'Failed to load teacher subscription keys'))
    );
  }

  /**
   * Regenerate subscription key for a course
   * Deactivates the old key and creates a new one
   * All students enrolled with the old key are unenrolled
   */
  regenerateKeyForCourse(courseId: string): Observable<SubscriptionKey> {
    return this.http.post<SubscriptionKey>(
      `${this.baseUrl}/subscriptions/courses/${courseId}/key/regenerate`,
      {}
    ).pipe(
      map(key => this.normalizeKey(key)),
      tap(key => this.cacheKey(courseId, key)),
      catchError(error => this.handleHttpError(error, 'Failed to regenerate subscription key'))
    );
  }

  getTeacherRequests(): Observable<SubscriptionRequest[]> {
    return this.http.get<SubscriptionRequest[]>(
      `${this.baseUrl}${API_CONFIG.ENDPOINTS.SUBSCRIPTIONS.REQUESTS}`
    ).pipe(
      catchError(error => this.handleHttpError(error, 'Failed to load teacher subscription requests'))
    );
  }

  approveRequest(requestId: string): Observable<SubscriptionRequest> {
    return this.http.post<SubscriptionRequest>(
      `${this.baseUrl}${API_CONFIG.ENDPOINTS.SUBSCRIPTIONS.APPROVE_REQUEST(requestId)}`,
      {}
    ).pipe(
      catchError(error => this.handleHttpError(error, 'Failed to approve subscription request'))
    );
  }

  denyRequest(requestId: string): Observable<SubscriptionRequest> {
    return this.http.post<SubscriptionRequest>(
      `${this.baseUrl}${API_CONFIG.ENDPOINTS.SUBSCRIPTIONS.DENY_REQUEST(requestId)}`,
      {}
    ).pipe(
      catchError(error => this.handleHttpError(error, 'Failed to deny subscription request'))
    );
  }

  /**
   * Cache a subscription key by course ID
   */
  private cacheKey(courseId: string, key: SubscriptionKey): void {
    const keys = new Map(this.courseKeysSubject.value);
    keys.set(courseId, key);
    this.courseKeysSubject.next(keys);
  }

  private handleHttpError(error: HttpErrorResponse, fallbackMessage: string): Observable<never> {
    if (error.status === 404) {
      return throwError(() => new Error('Requested subscription resource was not found'));
    }
    if (error.status === 403) {
      return throwError(() => new Error('You do not have permission for this subscription action'));
    }
    if (error.status === 400 && error.error?.message) {
      return throwError(() => new Error(error.error.message));
    }
    return throwError(() => new Error(fallbackMessage));
  }
}
