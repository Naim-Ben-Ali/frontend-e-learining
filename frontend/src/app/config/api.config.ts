export const API_CONFIG = {
  SERVER_URL: 'https://backend-e-learing.onrender.com',
  BASE_URL: 'https://backend-e-learing.onrender.com/api/v1',
  ENDPOINTS: {
    AUTH: {
      LOGIN: '/auth/login',
      REGISTER: '/auth/register',
      REFRESH: '/auth/refresh',
      LOGOUT: '/auth/logout'
    },
    COURSES: {
      LIST: '/courses',
      CREATE: '/courses',
      GET_BY_ID: (courseId: string) => `/courses/${courseId}`,
      UPDATE: (courseId: string) => `/courses/${courseId}`,
      DELETE: (courseId: string) => `/courses/${courseId}`,
      ENROLL: (courseId: string) => `/courses/${courseId}/enroll`,
      GET_SECTIONS: (courseId: string) => `/courses/${courseId}/sections`,
      CREATE_SECTION: (courseId: string) => `/courses/${courseId}/sections`,
      GET_CONTENTS: (courseId: string) => `/courses/${courseId}/contents`,
      ADD_CONTENT: (courseId: string) => `/courses/${courseId}/contents`,
      UPLOAD_FILE: (courseId: string) => `/courses/${courseId}/upload`,
      UPLOAD_IMAGE: (courseId: string) => `/courses/${courseId}/upload/image`
    },
    USERS: {
      PROFILE: '/users/me',
      SELECT_ROLES: '/users/select-roles',
      UPDATE_PROFILE: '/users/me',
      CHANGE_PASSWORD: '/users/me/password'
    },
    SUBSCRIPTIONS: {
      GET_ACTIVE_KEY: '/subscriptions/teacher/key/active',
      GENERATE_KEY: '/subscriptions/teacher/key/generate',
      REGENERATE_KEY: '/subscriptions/teacher/key/regenerate',
      SUBSCRIBE: '/subscriptions/student/subscribe',
      REQUESTS: '/subscriptions/teacher/requests',
      REQUEST_TEACHER: (teacherId: string) => `/subscriptions/requests/teachers/${teacherId}`,
      APPROVE_REQUEST: (requestId: string) => `/subscriptions/teacher/requests/${requestId}/approve`,
      DENY_REQUEST: (requestId: string) => `/subscriptions/teacher/requests/${requestId}/deny`
    },
    STUDENT: {
      COURSES_SEARCH: '/student/courses/search',
      COURSES_ALL: '/student/courses',
      COURSES_BY_SUBJECT: (subject: string) => `/student/courses/subject/${subject}`,
      COURSE_DETAILS: (courseId: string) => `/student/courses/${courseId}`,
      ENROLLMENTS: '/student/enrollments',
      RECOMMENDATIONS: '/student/courses/recommendations',
      SUBSCRIPTIONS: '/student/subscriptions',
      TEACHERS: '/student/teachers',
      TEACHER_DETAILS: (teacherId: string) => `/student/teachers/${teacherId}`,
      TEACHER_COURSES: (teacherId: string) => `/student/teachers/${teacherId}/courses`
    },
    ENROLLMENTS: {
      GET_BY_COURSE: (courseId: string) => `/courses/${courseId}/enrollments`,
      REMOVE: (courseId: string, enrollmentId: string) => `/courses/${courseId}/enrollments/${enrollmentId}`
    }
  }
};
