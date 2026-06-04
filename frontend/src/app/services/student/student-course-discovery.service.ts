import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import {API_CONFIG} from "../../config/api.config";
import { CourseSectionResponse } from '../../models/course.model';
import { catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';
import { finalize } from 'rxjs/operators';

export interface StudentCourseResponse {
  id: string;
  title: string;
  description: string;
  coverImageUrl: string;
  educationLevel: string;
  section: string;
  specificGrade: string;
  subject: string;
  isFree: boolean;
  price?: number;
  teacherName: string;
  teacherId: string;
  enrollmentCount: number;
  isEnrolled: boolean;
  rating: number;
  reviewCount: number;
  createdAt: number;
}

export interface CourseSearchRequest {
  searchQuery?: string;
  educationLevel?: string;
  section?: string;
  subject?: string;
  specificGrade?: string;
  isFree?: boolean;
  page?: number;
  pageSize?: number;
  sortBy?: string;
}

export interface PagedResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
}

export interface EnrollmentResponse {
  enrollmentId: string;
  courseId: string;
  courseTitle?: string;
  teacherName?: string;
  coverImageUrl?: string;
  subject?: string;
  isActive?: boolean;
  enrolledAt?: number;
}

@Injectable({
  providedIn: 'root'
})
export class StudentCourseDiscoveryService {
  private readonly baseUrl = API_CONFIG.BASE_URL;
  private readonly loadingSubject = new BehaviorSubject<boolean>(false);
  public readonly loading$ = this.loadingSubject.asObservable();

  constructor(private http: HttpClient) {}

  searchCourses(request: CourseSearchRequest): Observable<PagedResponse<StudentCourseResponse>> {
    return this.withLoading(this.http.post<PagedResponse<StudentCourseResponse>>(
      `${this.baseUrl}${API_CONFIG.ENDPOINTS.STUDENT.COURSES_SEARCH}`,
      request
    ).pipe(
      catchError(error => this.handleHttpError(error, 'Failed to search courses'))
    ));
  }

  getAllCourses(page: number = 0, pageSize: number = 10): Observable<PagedResponse<StudentCourseResponse>> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('pageSize', pageSize.toString());

    return this.withLoading(this.http.get<PagedResponse<StudentCourseResponse>>(
      `${this.baseUrl}${API_CONFIG.ENDPOINTS.STUDENT.COURSES_ALL}`,
      { params }
    ).pipe(
      catchError(error => this.handleHttpError(error, 'Failed to load courses'))
    ));
  }


  getCourseDetails(courseId: string): Observable<StudentCourseResponse> {
    return this.withLoading(this.http.get<StudentCourseResponse>(
      `${this.baseUrl}${API_CONFIG.ENDPOINTS.STUDENT.COURSE_DETAILS(courseId)}`
    ).pipe(
      catchError(error => this.handleHttpError(error, 'Failed to load course details'))
    ));
  }

  getEnrolledCourses(page: number = 0, pageSize: number = 10): Observable<PagedResponse<StudentCourseResponse>> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('pageSize', pageSize.toString());

    return this.withLoading(this.http.get<PagedResponse<StudentCourseResponse>>(
      `${this.baseUrl}${API_CONFIG.ENDPOINTS.STUDENT.ENROLLMENTS}`,
      { params }
    ).pipe(
      catchError(error => this.handleHttpError(error, 'Failed to load enrolled courses'))
    ));
  }

  getRecommendedCourses(limit: number = 5): Observable<StudentCourseResponse[]> {
    const params = new HttpParams().set('limit', limit.toString());

    return this.withLoading(this.http.get<StudentCourseResponse[]>(
      `${this.baseUrl}${API_CONFIG.ENDPOINTS.STUDENT.RECOMMENDATIONS}`,
      { params }
    ).pipe(
      catchError(error => this.handleHttpError(error, 'Failed to load recommendations'))
    ));
  }

  enrollWithCourseKey(courseKey: string): Observable<EnrollmentResponse> {
    return this.withLoading(this.http.post<EnrollmentResponse>(
      `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.SUBSCRIPTIONS.SUBSCRIBE}`,
      { subscriptionKey: courseKey }
    ).pipe(
      catchError(error => this.handleHttpError(error, 'Failed to subscribe with course key'))
    ));
  }

  enrollInCourse(courseId: string): Observable<EnrollmentResponse> {
    return this.withLoading(this.http.post<EnrollmentResponse>(
      `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.COURSES.ENROLL(courseId)}`,
      {}
    ).pipe(
      catchError(error => this.handleHttpError(error, 'Failed to enroll in course'))
    ));
  }

  enrollInFreeCourse(courseId: string): Observable<EnrollmentResponse> {
    return this.withLoading(this.http.post<EnrollmentResponse>(
      `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.COURSES.ENROLL(courseId)}`,
      {}
    ).pipe(
      catchError(error => this.handleHttpError(error, 'Failed to enroll in free course'))
    ));
  }

  getAvailableSubjects(): Observable<string[]> {
    return this.withLoading(this.http.get<string[]>(
      `${this.baseUrl}/student/filters/subjects`
    ).pipe(
      catchError(error => this.handleHttpError(error, 'Failed to load available subjects'))
    ));
  }

  getAvailableEducationLevels(): Observable<string[]> {
    return this.withLoading(this.http.get<string[]>(
      `${this.baseUrl}/student/filters/education-levels`
    ).pipe(
      catchError(error => this.handleHttpError(error, 'Failed to load education levels'))
    ));
  }

  getCourseSections(courseId: string): Observable<CourseSectionResponse[]> {
    return this.withLoading(this.http.get<CourseSectionResponse[]>(
      `${API_CONFIG.BASE_URL}/courses/${courseId}/sections/public`
    ).pipe(
      catchError(error => this.handleHttpError(error, 'Failed to load course sections'))
    ));
  }

  private handleHttpError(error: HttpErrorResponse, fallbackMessage: string): Observable<never> {
    if (error.status === 404) {
      return throwError(() => new Error('Requested resource was not found'));
    }
    if (error.status === 403) {
      return throwError(() => new Error('You do not have access to this resource'));
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
}
