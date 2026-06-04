import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { catchError, finalize } from 'rxjs/operators';
import {
  TeacherCalendarEvent,
  TeacherCalendarCreateRequest,
  TeacherCalendarUpdateRequest,
  TeacherCalendarBulkActionRequest,
  TeacherCalendarRealtimeMessage,
} from '../../models/teacher-calendar.model';
import { API_CONFIG } from '../../config/api.config';

/**
 * Teacher Calendar Service
 * Handles all API calls for teacher calendar management
 * Integrates with backend endpoints at /api/v1/teacher-calendar
 */
@Injectable({
  providedIn: 'root'
})
export class TeacherCalendarService {
  private apiUrl = `${API_CONFIG.BASE_URL}/teacher-calendar`;
  private readonly loadingSubject = new BehaviorSubject<boolean>(false);
  public readonly loading$ = this.loadingSubject.asObservable();

  private toBackendLocalDateTime(value: string): string {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return value;
    }
    const pad = (num: number) => String(num).padStart(2, '0');
    return `${parsed.getFullYear()}-${pad(parsed.getMonth() + 1)}-${pad(parsed.getDate())}T${pad(parsed.getHours())}:${pad(parsed.getMinutes())}:${pad(parsed.getSeconds())}`;
  }

  private toBackendCreatePayload(request: TeacherCalendarCreateRequest) {
    return {
      courseId: request.CourseId,
      eventType: request.EventType,
      title: request.Subject,
      description: request.Description,
      meetingLink: request.MeetingLink,
      sourceTimezone: request.SourceTimezone,
      startLocalDateTime: this.toBackendLocalDateTime(request.StartLocalDateTime),
      endLocalDateTime: this.toBackendLocalDateTime(request.EndLocalDateTime),
      notifyPolicy: request.NotifyPolicy
    };
  }

  private toBackendUpdatePayload(request: TeacherCalendarUpdateRequest) {
    return {
      title: request.Subject,
      description: request.Description,
      meetingLink: request.MeetingLink,
      eventType: request.EventType,
      sourceTimezone: request.SourceTimezone,
      startLocalDateTime: this.toBackendLocalDateTime(request.StartLocalDateTime),
      endLocalDateTime: this.toBackendLocalDateTime(request.EndLocalDateTime),
      notifyPolicy: request.NotifyPolicy,
      notifyStudentsNow: request.NotifyStudentsNow
    };
  }

  private toBackendBulkPayload(request: TeacherCalendarBulkActionRequest) {
    return {
      eventIds: request.EventIds.map((id) => String(id)),
      actionType: request.ActionType,
      meetingLink: request.MeetingLink,
      notifyPolicy: request.NotifyPolicy
    };
  }

  constructor(private http: HttpClient) {}

  /**
   * List teacher calendar events within a date range
   * @param fromUtc Start date in UTC
   * @param toUtc End date in UTC
   * @param courseId Optional course filter
   */
  listEvents(
    fromUtc: Date,
    toUtc: Date,
    courseId?: string
  ): Observable<TeacherCalendarEvent[]> {
    let params = new HttpParams()
      .set('fromUtc', fromUtc.toISOString())
      .set('toUtc', toUtc.toISOString());

    if (courseId) {
      params = params.set('courseId', courseId);
    }

    return this.withLoading(this.http.get<TeacherCalendarEvent[]>(
      `${this.apiUrl}/events`,
      { params }
    ).pipe(
      catchError(error => this.handleHttpError(error, 'Failed to load teacher calendar events'))
    ));
  }

  /**
   * List student-visible calendar events within a date range
   * Calls the student-specific backend endpoint which requires ROLE_STUDENT
   */
  listStudentEvents(
    fromUtc: Date,
    toUtc: Date
  ): Observable<TeacherCalendarEvent[]> {
    const params = new HttpParams()
      .set('fromUtc', fromUtc.toISOString())
      .set('toUtc', toUtc.toISOString());

    return this.withLoading(this.http.get<TeacherCalendarEvent[]>(
      `${API_CONFIG.BASE_URL}/student-calendar/events`,
      { params }
    ).pipe(
      catchError(error => this.handleHttpError(error, 'Failed to load student calendar events'))
    ));
  }

  /**
   * Create a new calendar event (supports recurrence)
   * @param request Event creation request
   */
  createEvent(
    request: TeacherCalendarCreateRequest
  ): Observable<TeacherCalendarEvent[]> {
    return this.withLoading(this.http.post<TeacherCalendarEvent[]>(
      `${this.apiUrl}/events`,
      this.toBackendCreatePayload(request)
    ).pipe(
      catchError(error => this.handleHttpError(error, 'Failed to create calendar event'))
    ));
  }

  /**
   * Update an existing calendar event
   * @param eventId Event ID
   * @param request Event update request
   */
  updateEvent(
    eventId: string,
    request: TeacherCalendarUpdateRequest
  ): Observable<TeacherCalendarEvent> {
    return this.withLoading(this.http.put<TeacherCalendarEvent>(
      `${this.apiUrl}/events/${eventId}`,
      this.toBackendUpdatePayload(request)
    ).pipe(
      catchError(error => this.handleHttpError(error, 'Failed to update calendar event'))
    ));
  }

  /**
   * Delete/cancel a calendar event
   * @param eventId Event ID
   */
  deleteEvent(eventId: string): Observable<void> {
    return this.withLoading(this.http.delete<void>(
      `${this.apiUrl}/events/${eventId}`
    ).pipe(
      catchError(error => this.handleHttpError(error, 'Failed to delete calendar event'))
    ));
  }

  /**
   * Duplicate an event to next week
   * @param eventId Event ID to duplicate
   */
  duplicateEvent(eventId: string): Observable<TeacherCalendarEvent> {
    return this.withLoading(this.http.post<TeacherCalendarEvent>(
      `${this.apiUrl}/events/${eventId}/duplicate`,
      {}
    ).pipe(
      catchError(error => this.handleHttpError(error, 'Failed to duplicate calendar event'))
    ));
  }

  /**
   * Apply bulk action on multiple events
   * @param request Bulk action request
   */
  bulkAction(
    request: TeacherCalendarBulkActionRequest
  ): Observable<TeacherCalendarEvent[]> {
    return this.withLoading(this.http.post<TeacherCalendarEvent[]>(
      `${this.apiUrl}/events/bulk`,
      this.toBackendBulkPayload(request)
    ).pipe(
      catchError(error => this.handleHttpError(error, 'Failed to apply calendar bulk action'))
    ));
  }

  /**
   * Subscribe to real-time calendar updates (SSE)
   * Returns an EventSource stream of calendar updates
   */
  subscribeToRealtime(): EventSource {
    return new EventSource(`${this.apiUrl}/stream`, {
      withCredentials: true
    });
  }

  /**
   * Parse real-time message from SSE
   */
  parseRealtimeMessage(data: string): TeacherCalendarRealtimeMessage {
    return JSON.parse(data);
  }

  private handleHttpError(error: HttpErrorResponse, fallbackMessage: string): Observable<never> {
    if (error.status === 404) {
      return throwError(() => new Error('Calendar resource was not found'));
    }
    if (error.status === 403) {
      return throwError(() => new Error('You do not have permission to access this calendar resource'));
    }
    if (error.status === 400 && error.error?.message) {
      return throwError(() => new Error(error.error.message));
    }
    return throwError(() => new Error(fallbackMessage));
  }

  private withLoading<T>(request$: Observable<T>): Observable<T> {
    this.loadingSubject.next(true);
    return request$.pipe(
      finalize(() => this.loadingSubject.next(false))
    );
  }

  /**
   * Get event type configurations for UI display
   */
  getEventTypeConfigs() {
    return {
      LIVE_CLASS: { label: 'Live Class', color: '#4285F4', icon: 'videocam' },
      LECTURE: { label: 'Lecture', color: '#0B7A6E', icon: 'book' },
      OFFICE_HOURS: { label: 'Office Hours', color: '#F4B400', icon: 'chat' },
      QUIZ: { label: 'Quiz', color: '#EA4335', icon: 'assessment' },
      EXAM: { label: 'Exam', color: '#D93025', icon: 'description' },
      MILESTONE: { label: 'Milestone', color: '#9334E6', icon: 'flag' },
      HOMEWORK_DEADLINE: { label: 'Homework Deadline', color: '#FBBC04', icon: 'schedule' },
      ASSIGNMENT: { label: 'Assignment', color: '#1A73E8', icon: 'assignment' },
      MEETING: { label: 'Meeting', color: '#5F6368', icon: 'people' }
    };
  }
}
