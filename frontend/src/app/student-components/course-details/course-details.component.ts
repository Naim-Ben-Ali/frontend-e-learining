import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
  StudentCourseDiscoveryService,
  StudentCourseResponse
} from '../../services/student/student-course-discovery.service';
import {
  SubscriptionRequestResponseDto,
  SubscriptionRequestService
} from '../../services/subscription-key/subscription-request.service';
import { SubscriptionKeyService } from '../../services/subscription-key/subscription-key.service';
import { CourseSectionResponse } from '../../models/course.model';
import { of, Subject } from 'rxjs';
import { catchError, map, switchMap, takeUntil } from 'rxjs/operators';
import { API_CONFIG } from '../../config/api.config';

@Component({
  selector: 'app-course-details',
  templateUrl: './course-details.component.html',
  styleUrls: ['./course-details.component.css']
})
export class CourseDetailsComponent implements OnInit, OnDestroy {

  course: StudentCourseResponse | null = null;
  courseId: string = '';

  isLoading: boolean = true;
  isEnrolling: boolean = false;
  isLoadingSections: boolean = false;
  errorMessage: string = '';
  successMessage: string = '';
  courseKey: string = '';
  activeTab: string = 'overview';
  requestStatus: 'NONE' | 'PENDING' | 'APPROVED' | 'DENIED' | 'BLOCKED' = 'NONE';
  sections: CourseSectionResponse[] = [];
  isFromMyCourses: boolean = false;

  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    public router: Router,
    private discoveryService: StudentCourseDiscoveryService,
    private subscriptionRequestService: SubscriptionRequestService,
    private subscriptionKeyService: SubscriptionKeyService
  ) {}

  ngOnInit(): void {
    this.route.paramMap
      .pipe(takeUntil(this.destroy$))
      .subscribe(params => {
        this.courseId = params.get('courseId') || '';
        this.isFromMyCourses = this.router.url.includes('/student/my-courses/');
        if (this.courseId) this.loadCourseDetails();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadCourseDetails(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.discoveryService.getCourseDetails(this.courseId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (course) => {
          this.course = course;
          this.isLoading = false;
          this.loadRequestStatus();
          this.loadSections();
          this.initScrollReveal();
        },
        error: () => {
          this.errorMessage = 'Failed to load course details. Please try again.';
          this.isLoading = false;
        }
      });
  }

  private loadSections(): void {
    this.isLoadingSections = true;
    this.discoveryService.getCourseSections(this.courseId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (sections) => {
          this.sections = sections;
          this.isLoadingSections = false;
        },
        error: () => {
          this.sections = [];
          this.isLoadingSections = false;
        }
      });
  }

  private loadRequestStatus(): void {
    this.subscriptionRequestService.getStudentResponses()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (responses) => {
          const courseResponses = responses.filter((r) => r.courseId === this.courseId);
          if (!courseResponses.length) {
            this.requestStatus = 'NONE';
            return;
          }

          const latest = [...courseResponses].sort((a: SubscriptionRequestResponseDto, b: SubscriptionRequestResponseDto) =>
            this.getRequestEventTime(b) - this.getRequestEventTime(a)
          )[0];

          if (latest.status !== 'APPROVED') {
            this.requestStatus = latest.status;
            return;
          }

          this.subscriptionKeyService.getActiveCourseKey(this.courseId)
            .pipe(
              map((key: any) => {
                const keyCreatedRaw = key?.createdDate ?? key?.created_date;
                const keyCreatedTime = keyCreatedRaw ? new Date(keyCreatedRaw).getTime() : Number.MAX_SAFE_INTEGER;
                const approvedAt = latest.respondedDate ? new Date(latest.respondedDate).getTime() : 0;
                return approvedAt >= keyCreatedTime ? 'APPROVED' : 'NONE';
              }),
              catchError(() => of<'NONE'>('NONE')),
              takeUntil(this.destroy$)
            )
            .subscribe((status) => {
              this.requestStatus = status;
            });
        },
        error: () => {
          this.requestStatus = 'NONE';
        }
      });
  }

  private getRequestEventTime(request: SubscriptionRequestResponseDto): number {
    const eventDate = request.respondedDate || request.createdDate;
    return new Date(eventDate).getTime();
  }

  enrollCourse(): void {
    if (!this.course) return;

    // For free courses, enroll directly without subscription key
    if (this.course.isFree) {
      this.enrollInFreeCourse();
      return;
    }

    if (this.requestStatus === 'APPROVED') {
      this.errorMessage = 'Your request is approved. Enter the subscription key below to enroll.';
      return;
    }

    if (this.requestStatus === 'PENDING') {
      this.errorMessage = 'Your request is already pending. Please wait for the teacher response.';
      return;
    }

    if (this.requestStatus === 'BLOCKED') {
      this.errorMessage = 'You are blocked from requesting this course.';
      return;
    }

    if (!this.course.teacherId) {
      this.errorMessage = 'Teacher information is missing for this course.';
      return;
    }

    this.isEnrolling = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.subscriptionRequestService.requestSubscriptionKey({
      courseId: this.course.id,
      teacherId: this.course.teacherId,
      requestMessage: `Requesting subscription key for course: ${this.course.title}`
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.requestStatus = response.status;
          this.successMessage = 'Request sent to the teacher. Check Subscription Responses for updates.';
          this.isEnrolling = false;
        },
        error: (error) => {
          this.errorMessage = error?.error?.message || 'Failed to send request. Please try again.';
          this.isEnrolling = false;
        }
      });
  }

  private enrollInFreeCourse(): void {
    if (!this.course) return;

    this.isEnrolling = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.discoveryService.enrollInFreeCourse(this.courseId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.successMessage = 'Successfully enrolled in this free course! Redirecting...';
          this.isEnrolling = false;
          if (this.course) this.course.isEnrolled = true;
          setTimeout(() => this.router.navigate(['/student/my-courses']), 2000);
        },
        error: (error) => {
          this.errorMessage = error?.error?.message || 'Failed to enroll. Please try again.';
          this.isEnrolling = false;
        }
      });
  }

  enrollWithKey(): void {
    if (!this.course) return;

    if (!this.courseKey.trim()) {
      this.errorMessage = 'Please enter the subscription key.';
      return;
    }

    this.isEnrolling = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.discoveryService.enrollWithCourseKey(this.courseKey.trim())
      .pipe(
        switchMap(() => this.discoveryService.enrollInCourse(this.courseId)),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: () => {
          this.successMessage = 'Successfully subscribed and enrolled! Redirecting...';
          this.isEnrolling = false;
          this.courseKey = '';
          if (this.course) this.course.isEnrolled = true;
          setTimeout(() => this.router.navigate(['/student/my-courses']), 2000);
        },
        error: (error) => {
          this.errorMessage = error?.error?.message || 'Invalid key or enrollment failed. Please try again.';
          this.isEnrolling = false;
        }
      });
  }

  getRequestButtonLabel(): string {
    if (this.course?.isFree) return 'Enroll Now';
    if (this.requestStatus === 'PENDING') return 'Request Sent';
    if (this.requestStatus === 'APPROVED') return 'Approved - Enter Key Below';
    if (this.requestStatus === 'BLOCKED') return 'Blocked';
    return 'Request Subscription Key';
  }

  isRequestButtonDisabled(): boolean {
    if (!this.course) return true;
    if (this.isEnrolling) return true;
    if (this.course.isFree) return false;
    return this.requestStatus === 'PENDING' || this.requestStatus === 'APPROVED' || this.requestStatus === 'BLOCKED';
  }

  switchTab(tab: string): void {
    this.activeTab = tab;
  }

  goBack(): void {
    this.router.navigate([this.isFromMyCourses ? '/student/my-courses' : '/student/courses']);
  }

  getFullImageUrl(path: string | null | undefined): string {
    if (!path) return '/assets/course-placeholder.png';
    if (path.startsWith('http')) return path;
    return `${API_CONFIG.SERVER_URL}${path.startsWith('/') ? '' : '/'}${path}`;
  }

  getContentIcon(type: string): string {
    switch (type) {
      case 'VIDEO': return '🎬';
      case 'LINK': return '🔗';
      case 'DOCUMENT': default: return '📄';
    }
  }

  openContent(url: string): void {
    if (url) {
      const fullUrl = url.startsWith('http') ? url : `${API_CONFIG.SERVER_URL}${url}`;
      window.open(fullUrl, '_blank');
    }
  }

  private initScrollReveal(): void {
    setTimeout(() => {
      const obs = new IntersectionObserver(
        (entries) => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('in'); }),
        { threshold: 0.07 }
      );
      document.querySelectorAll('.reveal').forEach(el => obs.observe(el));
    }, 120);
  }
}
