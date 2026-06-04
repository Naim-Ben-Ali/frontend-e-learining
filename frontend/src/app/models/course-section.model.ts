export interface CourseSection {
  id: string;
  title: string;
  description?: string;
  order_index: number;
  is_active: boolean;
  created_date: Date;
  contents?: CourseContent[];
}

export interface CourseContent {
  id: string;
  title: string;
  description?: string;
  type: 'DOCUMENT' | 'VIDEO' | 'LINK';
  content_url: string;
  file_size?: string;
  file_name?: string;
  section_id?: string;
  order_index: number;
  is_active: boolean;
  created_date: Date;
}

export interface CreateSectionRequest {
  title: string;
  description?: string;
  order_index?: number;
}

export interface CreateContentRequest {
  title: string;
  description?: string;
  type: 'DOCUMENT' | 'VIDEO' | 'LINK';
  content_url: string;
  file_size?: string;
  file_name?: string;
  section_id?: string;
  order_index?: number;
}
