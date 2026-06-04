import { Component, OnInit, OnDestroy, Renderer2, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { Router } from '@angular/router';
import {
  StudentCourseDiscoveryService,
  StudentCourseResponse
} from '../../services/student/student-course-discovery.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { StorageService } from "../../services/storage/storage.service";
import { SidebarService } from "../../services/sidebar/sidebar.service";
import { API_CONFIG } from "../../config/api.config";
import Chart from 'chart.js/auto';

@Component({
  selector: 'app-student-dashboard',
  templateUrl: './student-dashboard.component.html',
  styleUrls: ['./student-dashboard.component.css']
})
export class StudentDashboardComponent implements OnInit, OnDestroy, AfterViewInit {

  // ── User info ──────────────────────────────────────────────────────
  userName: string = '';
  userEmail: string = '';

  // ── Greeting ───────────────────────────────────────────────────────
  greeting: string = '';
  greetingEmoji: string = '';

  // ── Courses ────────────────────────────────────────────────────────
  enrolledCourses: StudentCourseResponse[] = [];
  recommendations: StudentCourseResponse[] = [];

  // ── Gamification / stats ───────────────────────────────────────────
  streakDays: number = 0;
  completedLessons: number = 0;
  hoursLearned: number = 0;

  // ── Subject breakdown ──────────────────────────────────────────────
  subjectMap: { subject: string; count: number; color: string }[] = [];

  // ── UI state ───────────────────────────────────────────────────────
  isLoadingCourses: boolean = true;
  isLoadingRecommendations: boolean = true;
  errorMessage: string = '';

  // ── Course key enrollment ──────────────────────────────────────────
  showKeyForm: boolean = false;
  courseKey: string = '';
  isEnrollingWithKey: boolean = false;
  keySuccessMessage: string = '';
  keyErrorMessage: string = '';

  // ── Progress map (courseId → % complete) ──────────────────────────
  // In a real app this comes from a progress/analytics service
  private progressMap: Map<string, number> = new Map();

  private destroy$ = new Subject<void>();

  // Palette for subject breakdown dots
  private readonly COLORS = [
    '#0B7A6E', '#1A4FA8', '#C47B1A', '#C0412A',
    '#2D6A4F', '#6D28D9', '#0E7490', '#B45309'
  ];

  @ViewChild('studentProgressCanvas') private studentProgressCanvas?: ElementRef<HTMLCanvasElement>;
  @ViewChild('studentSubjectsCanvas') private studentSubjectsCanvas?: ElementRef<HTMLCanvasElement>;
  @ViewChild('studentPricingCanvas') private studentPricingCanvas?: ElementRef<HTMLCanvasElement>;
  @ViewChild('studentRatingCanvas') private studentRatingCanvas?: ElementRef<HTMLCanvasElement>;
  private progressChart?: Chart;
  private subjectsChart?: Chart;
  private pricingChart?: Chart;
  private ratingChart?: Chart;

  constructor(
    private discoveryService: StudentCourseDiscoveryService,
    private router: Router,
    private storageService: StorageService,
    private sidebarService: SidebarService,
    private renderer: Renderer2,
    private el: ElementRef
  ) {}

  ngOnInit(): void {
    this.loadUserInfo();
    this.setGreeting();
    this.loadEnrolledCourses();
    this.loadRecommendations();
    this.initScrollReveal();

    // Subscribe to sidebar state and update margin
    this.sidebarService.isExpanded$
      .pipe(takeUntil(this.destroy$))
      .subscribe(isExpanded => {
        if (isExpanded) {
          this.renderer.removeClass(this.el.nativeElement, 'sidebar-collapsed');
        } else {
          this.renderer.addClass(this.el.nativeElement, 'sidebar-collapsed');
        }
      });
  }

  ngAfterViewInit(): void {
    this.refreshCharts();
  }

  ngOnDestroy(): void {
    this.progressChart?.destroy();
    this.subjectsChart?.destroy();
    this.pricingChart?.destroy();
    this.ratingChart?.destroy();
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ── User info ──────────────────────────────────────────────────────

  private loadUserInfo(): void {
    this.userEmail = this.storageService.getUserEmail() || '';
    this.userName = this.storageService.getFirstName() || this.userEmail.split('@')[0] || 'Learner';
  }

  private setGreeting(): void {
    const hour = new Date().getHours();
    if (hour < 12) {
      this.greeting = 'Good morning';
      this.greetingEmoji = '☀️';
    } else if (hour < 18) {
      this.greeting = 'Good afternoon';
      this.greetingEmoji = '🌤️';
    } else {
      this.greeting = 'Good evening';
      this.greetingEmoji = '🌙';
    }
  }

  // ── Data loading ───────────────────────────────────────────────────

  loadEnrolledCourses(): void {
    this.isLoadingCourses = true;
    this.errorMessage = '';

    this.discoveryService.getEnrolledCourses(0, 20)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.enrolledCourses = response.content;
          this.buildSubjectMap();
          this.generateMockProgress();
          this.refreshCharts();
          this.isLoadingCourses = false;
        },
        error: () => {
          this.errorMessage = 'Could not load your courses. Please try again.';
          this.isLoadingCourses = false;
        }
      });
  }

  loadRecommendations(): void {
    this.isLoadingRecommendations = true;

    this.discoveryService.getRecommendedCourses(6)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (courses) => {
          this.recommendations = courses;
          this.isLoadingRecommendations = false;
        },
        error: () => {
          this.isLoadingRecommendations = false;
        }
      });
  }

  // ── Helpers ────────────────────────────────────────────────────────

  /**
   * Returns the progress percentage for a given course.
   * Replace with a real ProgressService call when available.
   */
  getCourseProgress(courseId: string): number {
    return this.progressMap.get(courseId) ?? 0;
  }

  /**
   * Seed mock progress so the progress bars are visible.
   * Remove / replace once a real progress API exists.
   */
  private generateMockProgress(): void {
    let totalLessons = 0;
    this.enrolledCourses.forEach((c, i) => {
      const pct = Math.min(100, (i + 1) * 15 + Math.floor(Math.random() * 20));
      this.progressMap.set(c.id, pct);
      totalLessons += Math.floor(pct / 10);
    });
    this.completedLessons = totalLessons;
    this.hoursLearned = Math.round(totalLessons * 0.75 * 10) / 10;
    this.streakDays = this.enrolledCourses.length > 0 ? 3 : 0;
  }

  private buildSubjectMap(): void {
    const counts: Record<string, number> = {};
    this.enrolledCourses.forEach(c => {
      counts[c.subject] = (counts[c.subject] || 0) + 1;
    });
    this.subjectMap = Object.entries(counts)
      .map(([subject, count], i) => ({
        subject,
        count,
        color: this.COLORS[i % this.COLORS.length]
      }))
      .sort((a, b) => b.count - a.count);
  }

  getFullImageUrl(url: string | null | undefined): string {
    if (!url) return '/assets/course-placeholder.png';
    if (url.startsWith('http')) return url;
    return `${API_CONFIG.SERVER_URL}${url.startsWith('/') ? '' : '/'}${url}`;
  }

  // ── Navigation ─────────────────────────────────────────────────────

  navigateToCourseDiscovery(): void {
    this.router.navigate(['/student/courses']);
  }

  navigateToMyCourses(): void {
    this.router.navigate(['/student/my-courses']);
  }

  viewCourseDetails(courseId: string): void {
    this.router.navigate(['/student/courses', courseId]);
  }

  // ── Course key enrollment ─────────────��────────────────────────────

  enrollWithKey(): void {
    this.router.navigate(['/student/courses']);
  }

  submitCourseKey(): void {
    this.router.navigate(['/student/courses']);
  }

  // ── Scroll reveal ──────────────────────────────────────────────────

  private initScrollReveal(): void {
    requestAnimationFrame(() => {
      document.querySelectorAll('.reveal').forEach((element) => element.classList.add('in'));
    });
  }

  private refreshCharts(): void {
    requestAnimationFrame(() => {
      this.renderProgressChart();
      this.renderSubjectsChart();
      this.renderPricingChart();
      this.renderRatingChart();
    });
  }

  private renderProgressChart(): void {
    const canvas = this.studentProgressCanvas?.nativeElement;
    if (!canvas) return;

    const labels = this.enrolledCourses.slice(0, 8).map((c) => c.title.length > 18 ? `${c.title.slice(0, 18)}...` : c.title);
    const data = this.enrolledCourses.slice(0, 8).map((c) => this.getCourseProgress(c.id));

    this.progressChart?.destroy();
    this.progressChart = new Chart(canvas, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Progress %',
            data,
            backgroundColor: 'rgba(11, 122, 110, 0.75)',
            borderColor: 'rgba(11, 122, 110, 1)',
            borderWidth: 1.2,
            borderRadius: 8
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          y: {
            min: 0,
            max: 100,
            ticks: { stepSize: 20 }
          }
        }
      }
    });
  }

  private renderSubjectsChart(): void {
    const canvas = this.studentSubjectsCanvas?.nativeElement;
    if (!canvas) return;

    const labels = this.subjectMap.map((s) => s.subject);
    const data = this.subjectMap.map((s) => s.count);
    const colors = this.subjectMap.map((s) => s.color);

    this.subjectsChart?.destroy();
    this.subjectsChart = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [
          {
            data,
            backgroundColor: colors,
            borderWidth: 0
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: { boxWidth: 10, usePointStyle: true }
          }
        }
      }
    });
  }

  private renderPricingChart(): void {
    const canvas = this.studentPricingCanvas?.nativeElement;
    if (!canvas) return;

    const freeCount = this.enrolledCourses.filter((c) => c.isFree).length;
    const paidCount = this.enrolledCourses.filter((c) => !c.isFree).length;
    const labels = ['Free', 'Paid'];
    const data = [freeCount, paidCount];

    this.pricingChart?.destroy();
    this.pricingChart = new Chart(canvas, {
      type: 'pie',
      data: {
        labels,
        datasets: [
          {
            data,
            backgroundColor: ['#0B7A6E', '#C0412A'],
            borderWidth: 0
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { boxWidth: 10, usePointStyle: true } }
        }
      }
    });
  }

  private renderRatingChart(): void {
    const canvas = this.studentRatingCanvas?.nativeElement;
    if (!canvas) return;

    const labels = this.enrolledCourses.slice(0, 8).map((c) => c.title.length > 14 ? `${c.title.slice(0, 14)}...` : c.title);
    const data = this.enrolledCourses.slice(0, 8).map((c) => c.rating || 0);

    this.ratingChart?.destroy();
    this.ratingChart = new Chart(canvas, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Rating',
            data,
            borderColor: '#1A4FA8',
            backgroundColor: 'rgba(26, 79, 168, 0.18)',
            tension: 0.35,
            fill: true,
            pointRadius: 3
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          y: {
            min: 0,
            max: 5,
            ticks: { stepSize: 1 }
          }
        }
      }
    });
  }
}
