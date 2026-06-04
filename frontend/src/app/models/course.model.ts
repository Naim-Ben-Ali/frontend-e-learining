export interface FileUploadResponse {
  file_path: string;
  file_name: string;
  file_size: number;
  /** Absolute URL (profile picture upload) */
  file_url?: string;
}

export interface CourseContentResponse {
  id: string;
  title: string;
  description: string;
  type: string;
  content_url: string;
  file_size: string;
  file_name: string;
  section_id?: string;
  order_index: number;
  is_active: boolean;
  created_date: string;
}

export interface CourseSectionResponse {
  id: string;
  title: string;
  description?: string;
  order_index: number;
  is_active: boolean;
  created_date: string;
  contents?: CourseContentResponse[];
}

export interface CourseResponse {
  id: string;
  title: string;
  description: string;
  cover_image_url?: string;
  education_level: string;
  section: string;
  specific_grade?: string;
  subject: string;
  is_free: boolean;
  price?: number;
  teacher_id: string;
  teacher_email: string;
  is_active: boolean;
  created_date: string;
  updated_date: string;
  student_count: number;
  content_count: number;
  contents: CourseContentResponse[];
}

export interface CourseEnrollmentResponse {
  id: string;
  course_id: string;
  student_id: string;
  student_email: string;
  student_name: string;
  is_active: boolean;
  enrolled_date: string;
}

export enum EducationLevel {
  PRIMARY = 'PRIMARY',
  COLLEGE = 'COLLEGE',
  SECONDARY = 'SECONDARY',
  UNIVERSITY = 'UNIVERSITY',
  PROFESSIONAL = 'PROFESSIONAL',
  OTHER = 'OTHER'
}

export enum Section {
  MATH = 'MATH',
  SCIENCES_EXP = 'SCIENCES_EXP',
  TECHNIQUE = 'TECHNIQUE',
  INFORMATIQUE = 'INFORMATIQUE',
  ECONOMIE_GESTION = 'ECONOMIE_GESTION',
  LETTRES = 'LETTRES',
  SPORT = 'SPORT',
  TRONC_COMMUN = 'TRONC_COMMUN',
  NONE = 'NONE'
}

export interface CreateCourseRequest {
  title: string;
  description?: string;
  cover_image_url?: string;
  education_level: string;
  section?: string;
  specific_grade?: string;
  subject: string;
  is_free?: boolean;
  price?: number;
}

export interface CourseContentRequest {
  title: string;
  description?: string;
  type: 'DOCUMENT' | 'VIDEO' | 'LINK';
  content_url: string;
  file_size?: string;
  file_name?: string;
  section_id?: string | null;
  order_index?: number;
}
