export interface SubscriptionKey {
  id: string;
  subscription_key: string;
  course_id: string;
  course_name?: string;
  teacher_id?: string;
  /** Backend JSON field from SubscriptionKeyResponse */
  is_active: boolean;
  created_date: string;
  deactivated_date?: string | null;
}

export interface SubscriptionRequest {
  id: string;
  student_id: string;
  student_name: string;
  student_email: string;
  teacher_id: string;
  teacher_name: string;
  request_message?: string | null;
  status: 'PENDING' | 'APPROVED' | 'DENIED' | 'BLOCKED';
  created_date: string;
  responded_date?: string | null;
}

export interface SubscriptionRequestActionRequest {
  requestMessage?: string;
}
