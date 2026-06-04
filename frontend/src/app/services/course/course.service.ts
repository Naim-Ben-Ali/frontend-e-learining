import { Injectable } from '@angular/core';
import {API_CONFIG} from "../../config/api.config";
import {HttpClient} from "@angular/common/http";
import {
  CourseContentRequest,
  CourseContentResponse, CourseEnrollmentResponse,
  CourseResponse, CourseSectionResponse,
  FileUploadResponse,
  CreateCourseRequest
} from "../../models/course.model";
import {Observable, map} from "rxjs";

@Injectable({
  providedIn: 'root'
})
export class CourseService {

  private readonly baseUrl = `${API_CONFIG.BASE_URL}/courses`;

  constructor(private http: HttpClient) {}

  // Course Management
  createCourse(request: CreateCourseRequest): Observable<CourseResponse> {
    return this.http.post<CourseResponse>(this.baseUrl, request);
  }

  getAllTeacherCourses(): Observable<CourseResponse[]> {
    return this.http.get<any>(this.baseUrl).pipe(
      map((response: any) => {
        if (Array.isArray(response)) {
          return response as CourseResponse[];
        }
        if (Array.isArray(response?.courses)) {
          return response.courses as CourseResponse[];
        }
        if (Array.isArray(response?.content)) {
          return response.content as CourseResponse[];
        }
        if (Array.isArray(response?.data)) {
          return response.data as CourseResponse[];
        }
        return [];
      })
    );
  }

  getCourseById(courseId: string): Observable<CourseResponse> {
    return this.http.get<CourseResponse>(`${this.baseUrl}/${courseId}`);
  }

  updateCourse(courseId: string, request: CreateCourseRequest): Observable<CourseResponse> {
    return this.http.put<CourseResponse>(`${this.baseUrl}/${courseId}`, request);
  }

  deleteCourse(courseId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${courseId}`);
  }

  // Course Content Management
  addContent(courseId: string, request: CourseContentRequest): Observable<CourseContentResponse> {
    return this.http.post<CourseContentResponse>(`${this.baseUrl}/${courseId}/contents`, request);
  }

  deleteContent(courseId: string, contentId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${courseId}/contents/${contentId}`);
  }

  // Course Section Management
  createSection(courseId: string, request: any): Observable<CourseSectionResponse> {
    return this.http.post<CourseSectionResponse>(`${this.baseUrl}/${courseId}/sections`, request);
  }

  getAllSections(courseId: string): Observable<CourseSectionResponse[]> {
    return this.http.get<CourseSectionResponse[]>(`${this.baseUrl}/${courseId}/sections`);
  }

  getSection(courseId: string, sectionId: string): Observable<CourseSectionResponse> {
    return this.http.get<CourseSectionResponse>(`${this.baseUrl}/${courseId}/sections/${sectionId}`);
  }

  deleteSection(courseId: string, sectionId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${courseId}/sections/${sectionId}`);
  }

  // File Upload
  uploadFile(courseId: string, file: File, sectionId?: string | null): Observable<FileUploadResponse> {
    const formData = new FormData();
    formData.append('file', file);
    if (sectionId) {
      formData.append('sectionId', sectionId);
    }

    return this.http.post<FileUploadResponse>(`${this.baseUrl}/${courseId}/upload`, formData);
  }

  uploadCourseImage(courseId: string, file: File): Observable<FileUploadResponse> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<FileUploadResponse>(`${this.baseUrl}/${courseId}/upload/image`, formData);
  }

  uploadCoverImage(courseId: string, file: File): Observable<FileUploadResponse> {
    return this.uploadCourseImage(courseId, file);
  }

  getCourseEnrollments(courseId: string): Observable<CourseEnrollmentResponse[]> {
    return this.http.get<CourseEnrollmentResponse[]>(`${this.baseUrl}/${courseId}/enrollments`);
  }

  removeStudentFromCourse(courseId: string, enrollmentId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${courseId}/enrollments/${enrollmentId}`);
  }

}
