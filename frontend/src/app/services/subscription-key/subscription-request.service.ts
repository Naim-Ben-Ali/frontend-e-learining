import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { API_CONFIG } from '../../config/api.config';

export interface SubscriptionRequestCreateDto {
  courseId: string;
  teacherId: string;
  requestMessage?: string;
}

export interface SubscriptionRequestResponseDto {
  id: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  teacherId: string;
  courseId: string;
  courseName: string;
  requestMessage: string;
  status: 'PENDING' | 'APPROVED' | 'DENIED' | 'BLOCKED';
  createdDate: string;
  respondedDate?: string;
  subscriptionKey?: string;
}

export interface SubscriptionRequestActionDto {
  requestId: string;
  action: 'APPROVED' | 'DENIED' | 'BLOCKED';
  responseMessage?: string;
}

export interface NotificationCountDto {
  pendingRequests: number;
  pendingResponses: number;
  totalNotifications: number;
}

@Injectable({
  providedIn: 'root'
})
export class SubscriptionRequestService {
  private readonly API_URL = `${API_CONFIG.SERVER_URL}/api/v1/subscription-requests`;
  private notificationCount$ = new BehaviorSubject<number>(0);

  constructor(private http: HttpClient) {}

  /**
   * Student requests a subscription key
   */
  requestSubscriptionKey(dto: SubscriptionRequestCreateDto): Observable<SubscriptionRequestResponseDto> {
    return this.http.post<SubscriptionRequestResponseDto>(
      `${this.API_URL}/request`,
      dto
    );
  }

  /**
   * Get all pending requests for teacher
   */
  getTeacherPendingRequests(): Observable<SubscriptionRequestResponseDto[]> {
    return this.http.get<SubscriptionRequestResponseDto[]>(
      `${this.API_URL}/teacher/pending`
    );
  }

  /**
   * Get all responses for student
   */
  getStudentResponses(): Observable<SubscriptionRequestResponseDto[]> {
    return this.http.get<SubscriptionRequestResponseDto[]>(
      `${this.API_URL}/student/responses`
    );
  }

  /**
   * Teacher responds to a request
   */
  respondToRequest(dto: SubscriptionRequestActionDto): Observable<SubscriptionRequestResponseDto> {
    return this.http.post<SubscriptionRequestResponseDto>(
      `${this.API_URL}/respond`,
      dto
    );
  }

  /**
   * Get notification count
   */
  getNotificationCount(): Observable<NotificationCountDto> {
    return this.http.get<NotificationCountDto>(
      `${this.API_URL}/notifications/count`
    );
  }

  /**
   * Get teacher notification count
   */
  getTeacherNotificationCount(): Observable<number> {
    return this.http.get<number>(
      `${this.API_URL}/teacher/notifications/count`
    );
  }

  /**
   * Get student notification count
   */
  getStudentNotificationCount(): Observable<number> {
    return this.http.get<number>(
      `${this.API_URL}/student/notifications/count`
    );
  }

  /**
   * Update notification count observable
   */
  updateNotificationCount(count: number): void {
    this.notificationCount$.next(count);
  }

  /**
   * Get notification count observable
   */
  getNotificationCount$(): Observable<number> {
    return this.notificationCount$.asObservable();
  }

  /**
   * Poll for notification updates
   */
  startNotificationPolling(intervalMs: number = 30000): void {
    setInterval(() => {
      this.getTeacherNotificationCount().subscribe({
        next: (count) => this.updateNotificationCount(count),
        error: (err) => console.error('Notification polling error:', err)
      });
    }, intervalMs);
  }
}
