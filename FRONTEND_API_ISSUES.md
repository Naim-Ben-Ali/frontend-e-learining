# Frontend API Integration Issues

## 🔴 Critical Issues

### 1. **Missing Student Service**
**File:** `src/app/services/student/` - No main student service exists

The `StudentCourseDiscoveryService` exists but there's no unified `StudentService` to handle:
- Student enrollment management
- Subscription status checks
- Teacher directory access

**Impact:** Scattered service calls, potential duplicate HTTP requests

**Fix:** Create `student.service.ts` with methods:
```typescript
- getMySubscriptions(): Observable<Subscription[]>
- isSubscribedToTeacher(teacherId: string): Observable<boolean>
- getMyEnrollments(): Observable<CourseEnrollmentResponse[]>
```

---

### 2. **Environment Configuration Mismatch**
**File:** `src/app/services/teacher-calendar/teacher-calendar.service.ts:11`
```typescript
private apiUrl = `${environment.apiUrl}/teacher-calendar`;
```

**Issue:** Uses `environment.apiUrl` (`http://localhost:8080/api/v1`) but should use `API_CONFIG.BASE_URL` for consistency.

**Impact:** If `API_CONFIG.SERVER_URL` changes, teacher-calendar service won't update.

**Fix:**
```typescript
private apiUrl = `${API_CONFIG.BASE_URL}/teacher-calendar`;
```

---

### 3. **API Endpoint Mismatch - Student Course Discovery**

**File:** `src/app/services/student/student-course-discovery.service.ts`

| Method | Frontend Calls | Backend Endpoint | Status |
|--------|---------------|------------------|--------|
| `searchCourses()` | POST `/student/courses/search` | ❌ Not found in backend | **MISSING** |
| `getAllCourses()` | GET `/student/courses?page=0&pageSize=10` | ❌ Backend uses `StudentCourseDiscoveryController` | Need to verify |
| `getCourseDetails(courseId)` | GET `/student/courses/{id}` | ❌ Backend: `/student/courses/{id}` exists but returns `StudentCourseResponse` | ✅ OK |
| `getEnrolledCourses()` | GET `/student/enrollments` | ❌ Backend: No `/enrollments` endpoint | **MISSING** |
| `getRecommendedCourses()` | GET `/student/courses/recommendations` | ❌ Backend method exists, endpoint unclear | Need controller |

**Backend Controller Check:**
Looking at `StudentCourseDiscoveryServiceImpl`, the service methods exist but the controller endpoints are unclear. Need to verify `StudentCourseDiscoveryController`.

**Fix Options:**
1. Create missing controller endpoints in backend
2. Update frontend to match existing backend endpoints

---

### 4. **Subscription Key Request Payload Mismatch**

**File:** `src/app/services/student/student-course-discovery.service.ts:104`
```typescript
enrollWithCourseKey(courseKey: string): Observable<EnrollmentResponse> {
  return this.http.post<EnrollmentResponse>(
    `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.SUBSCRIPTIONS.SUBSCRIBE}`,
    { subscription_key: courseKey }  // ❌ snake_case
  );
}
```

**Backend expects:** `subscriptionKey` (camelCase)
**File:** `StudentSubscriptionServiceImpl.java:41`
```java
public StudentTeacher subscribeStudentWithKey(final String studentId, final String subscriptionKey)
```

**Impact:** Backend will receive `null` for `subscriptionKey`, causing `EntityNotFoundException`

**Fix:**
```typescript
{ subscriptionKey: courseKey }
```

---

### 5. **Missing Error Handling in Services**

**Files:** All service files

**Issue:** No HTTP error handling, no retry logic, no user-friendly error messages.

**Example:**
```typescript
// Current - no error handling
getActiveCourseKey(courseId: string): Observable<SubscriptionKey> {
  return this.http.get<SubscriptionKey>(`${this.baseUrl}/subscriptions/courses/${courseId}/key/active`);
}

// Should be:
getActiveCourseKey(courseId: string): Observable<SubscriptionKey> {
  return this.http.get<SubscriptionKey>(`${this.baseUrl}/subscriptions/courses/${courseId}/key/active`)
    .pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status === 404) {
          return throwError(() => new Error('No active subscription key for this course'));
        }
        if (error.status === 403) {
          return throwError(() => new Error('Subscription required for this course'));
        }
        return throwError(() => new Error('Failed to load subscription key'));
      })
    );
}
```

---

## 🟡 Medium Priority Issues

### 6. **API Config Endpoint Definitions Incomplete**

**File:** `src/app/config/api.config.ts`

**Missing endpoints:**
```typescript
STUDENT: {
  COURSES_SEARCH: '/student/courses/search',
  COURSES_ALL: '/student/courses',
  COURSES_BY_SUBJECT: (subject: string) => `/student/courses/subject/${subject}`,
  COURSE_DETAILS: (courseId: string) => `/student/courses/${courseId}`,
  ENROLLMENTS: '/student/enrollments',
  RECOMMENDATIONS: '/student/courses/recommendations',
  TEACHERS: '/student/teachers',
  TEACHER_DETAILS: (teacherId: string) => `/student/teachers/${teacherId}`,
}
```

---

### 7. **Token Refresh Logic May Cause Race Conditions**

**File:** `src/app/interceptors/auth/auth.interceptor.ts`

**Issue:** Multiple simultaneous 401 errors could trigger multiple refresh token requests.

**Current code (line 72-88):**
```typescript
private handle401Error(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
  // ...
  if (!this.isRefreshing) {
    this.isRefreshing = true;
    return this.authService.refreshToken().pipe(/*...*/);
  }
  return throwError(() => new Error('Token refresh failed')); // ❌ Fails immediately
}
```

**Problem:** If 5 requests get 401 simultaneously, only the first succeeds. The other 4 fail immediately instead of waiting for the refresh to complete.

**Fix:** Queue requests during refresh:
```typescript
private refreshTokenSubject = new BehaviorSubject<string | null>(null);

private handle401Error(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
  if (!this.isRefreshing) {
    this.isRefreshing = true;
    return this.authService.refreshToken().pipe(
      tap(token => {
        this.isRefreshing = false;
        this.refreshTokenSubject.next(token.access_token);
      }),
      catchError(error => {
        this.isRefreshing = false;
        this.authService.logout();
        return throwError(() => error);
      })
    );
  } else {
    // Wait for ongoing refresh to complete
    return this.refreshTokenSubject.pipe(
      filter(token => token !== null),
      take(1),
      switchMap(token => next.handle(request.clone({
        setHeaders: { Authorization: `Bearer ${token}` }
      })))
    );
  }
}
```

---

### 8. **No Request/Response Typing for Subscription Requests**

**File:** `src/app/models/subscription-key.model.ts` (need to verify)

**Issue:** `SubscriptionRequestActionRequest` interface may not match backend's `SubscriptionRequestActionRequest` DTO.

**Backend expects:**
```java
public record SubscriptionRequestActionRequest(String requestMessage) {}
```

**Frontend should have:**
```typescript
export interface SubscriptionRequestActionRequest {
  requestMessage?: string;
}
```

---

## 🟢 Low Priority / Best Practices

### 9. **Inconsistent URL Construction**

Some services use:
- `API_CONFIG.BASE_URL + endpoint`
- Others use `environment.apiUrl + endpoint`

**Recommendation:** Standardize on `API_CONFIG.BASE_URL` everywhere.

---

### 10. **Missing Loading States**

Services don't expose loading states. Components must manage their own loading flags.

**Recommendation:** Add loading state management:
```typescript
private loadingSubject = new BehaviorSubject<boolean>(false);
public loading$ = this.loadingSubject.asObservable();

getActiveCourseKey(courseId: string): Observable<SubscriptionKey> {
  this.loadingSubject.next(true);
  return this.http.get<SubscriptionKey>(/*...*/).pipe(
    finalize(() => this.loadingSubject.next(false))
  );
}
```

---

## ✅ What's Working Well

1. **Auth Interceptor** - Properly adds Bearer tokens
2. **Token Refresh** - Auto-refresh on 401 (with race condition issue noted above)
3. **API Config** - Centralized endpoint definitions
4. **Service Structure** - Clean separation by feature

---

## 🔧 Immediate Action Items

1. **Fix `enrollWithCourseKey()` payload** - Change `subscription_key` to `subscriptionKey`
2. **Verify backend endpoints** - Check if `StudentCourseDiscoveryController` exists and matches frontend calls
3. **Add error handling** - At minimum, catch and rethrow with user-friendly messages
4. **Run database migration** - Execute `V1__add_indexes.sql` for performance

---

## 📝 Backend Controller Gaps

Need to verify/create these endpoints:

| Endpoint | Method | Purpose | Status |
|----------|--------|---------|--------|
| `/student/courses/search` | POST | Search courses with filters | ❓ Need controller |
| `/student/enrollments` | GET | Get student's enrollments | ❓ Need controller |
| `/student/courses/recommendations` | GET | Get recommended courses | ❓ Service exists, need endpoint |
| `/student/teachers` | GET | List all teachers | ❓ Need controller |
| `/student/teachers/{id}` | GET | Get teacher details with courses | ❓ Need controller |
