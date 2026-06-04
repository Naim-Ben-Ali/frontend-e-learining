-- Performance indexes for E-Learning App
-- Run this migration to add missing indexes for frequently queried columns

-- Course enrollments: student lookup with active filter
CREATE INDEX IF NOT EXISTS idx_enrollments_student_active 
ON course_enrollments(student_id, is_active);

-- Course enrollments: course lookup with active filter  
CREATE INDEX IF NOT EXISTS idx_enrollments_course_active 
ON course_enrollments(course_id, is_active);

-- Teacher calendar events: teacher lookup with cancellation and date range filter
CREATE INDEX IF NOT EXISTS idx_calendar_events_teacher_dates 
ON teacher_calendar_events(teacher_id, cancelled, start_at_utc, end_at_utc);

-- Teacher calendar events: course lookup with date range
CREATE INDEX IF NOT EXISTS idx_calendar_events_course_dates 
ON teacher_calendar_events(course_id, start_at_utc, end_at_utc);

-- Student-Teacher subscriptions: active subscription lookup
CREATE INDEX IF NOT EXISTS idx_student_teacher_active 
ON student_teacher(student_id, teacher_id, active);

-- Student-Teacher subscriptions: teacher's subscribers
CREATE INDEX IF NOT EXISTS idx_student_teacher_teacher_active 
ON teacher_calendar_events(teacher_id, active);

-- Subscription requests: pending request check
CREATE INDEX IF NOT EXISTS idx_subscription_requests_pending 
ON student_subscription_request(student_id, teacher_id, status);

-- Subscription requests: teacher's incoming requests
CREATE INDEX IF NOT EXISTS idx_subscription_requests_teacher 
ON student_subscription_request(teacher_id, status, created_date);

-- Subscription keys: active key by course
CREATE INDEX IF NOT EXISTS idx_subscription_keys_course_active 
ON subscription_keys(course_id, active);

-- Courses: active courses by teacher
CREATE INDEX IF NOT EXISTS idx_courses_teacher_active 
ON courses(teacher_id, is_active);

-- Courses: active courses for public listing
CREATE INDEX IF NOT EXISTS idx_courses_active 
ON courses(is_active, created_date);

-- Users: email lookup (case-insensitive search)
CREATE INDEX IF NOT EXISTS idx_users_email_lower 
ON users(LOWER(email));

-- Tokens: user lookup with expiration
CREATE INDEX IF NOT EXISTS idx_tokens_user_expiry 
ON tokens(user_id, is_expired, expiration_date);
