import {StudentCourseResponse} from "../services/student/student-course-discovery.service";

export interface TeacherDirectoryResponse {
  teacher_id: string;
  first_name: string;
  last_name: string;
  full_name: string;
  email: string;
  profile_picture_url?: string | null;
  course_count: number;
  student_count: number;
  subscribed: boolean;
  pending_request: boolean;
}

export interface PagedTeacherResponse {
  content: TeacherDirectoryResponse[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

export interface TeacherCoursesResponse {
  content: StudentCourseResponse[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}
