import { Component, OnInit, OnDestroy, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth/auth.service';
import { StorageService } from '../../services/storage/storage.service';
import { CourseService } from '../../services/course/course.service';
import { CourseResponse } from '../../models/course.model';
import { Subject, takeUntil } from 'rxjs';
import Chart from 'chart.js/auto';

@Component({
  selector: 'app-teacher-dashboard',
  templateUrl: './teacher-dashboard.component.html',
  styleUrls: ['./teacher-dashboard.component.css']
})
export class TeacherDashboardComponent implements OnInit, OnDestroy, AfterViewInit {
  userName: string = '';
  userEmail: string = '';
  currentHour: number = new Date().getHours();

  courses: CourseResponse[] = [];
  isLoading = true;

  // Derived analytics
  totalStudents = 0;
  totalContent  = 0;
  activeCourses = 0;
  freeCourses   = 0;
  paidCourses   = 0;

  // Top courses by student count
  topCourses: CourseResponse[] = [];

  // Recent courses (last 3)
  recentCourses: CourseResponse[] = [];

  // Subject distribution
  subjectMap: { subject: string; count: number; pct: number }[] = [];

  // Education level distribution
  levelMap: { level: string; count: number; color: string }[] = [];

  private destroy$ = new Subject<void>();

  readonly levelColors: Record<string, string> = {
    PRIMARY:      '#1A4FA8',
    COLLEGE:      '#0B7A6E',
    SECONDARY:    '#C47B1A',
    UNIVERSITY:   '#6D28D9',
    PROFESSIONAL: '#C0412A',
    OTHER:        '#7A6050',
  };

  @ViewChild('teacherStudentsCanvas') private teacherStudentsCanvas?: ElementRef<HTMLCanvasElement>;
  @ViewChild('teacherPricingCanvas') private teacherPricingCanvas?: ElementRef<HTMLCanvasElement>;
  @ViewChild('teacherContentCanvas') private teacherContentCanvas?: ElementRef<HTMLCanvasElement>;
  @ViewChild('teacherSubjectsCanvas') private teacherSubjectsCanvas?: ElementRef<HTMLCanvasElement>;
  private studentsChart?: Chart;
  private pricingChart?: Chart;
  private contentChart?: Chart;
  private subjectsChart?: Chart;

  constructor(
    private router: Router,
    private authService: AuthService,
    private storageService: StorageService,
    private courseService: CourseService
  ) {}

  ngOnInit(): void {
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/login']);
      return;
    }

    this.userEmail = this.storageService.getUserEmail() || '';
    this.userName  = this.storageService.getFirstName() || this.userEmail.split('@')[0] || 'Teacher';;

    this.loadDashboard();
  }

  ngAfterViewInit(): void {
    this.refreshCharts();
  }

  ngOnDestroy(): void {
    this.studentsChart?.destroy();
    this.pricingChart?.destroy();
    this.contentChart?.destroy();
    this.subjectsChart?.destroy();
    this.destroy$.next();
    this.destroy$.complete();
  }

  get greeting(): string {
    if (this.currentHour < 12) return 'Good morning';
    if (this.currentHour < 18) return 'Good afternoon';
    return 'Good evening';
  }

  get greetingEmoji(): string {
    if (this.currentHour < 12) return '☀️';
    if (this.currentHour < 18) return '👋';
    return '🌙';
  }

  loadDashboard(): void {
    this.isLoading = true;
    this.courseService.getAllTeacherCourses()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (courses) => {
          this.courses = courses;
          this.computeAnalytics(courses);
          this.refreshCharts();
          this.isLoading = false;
          setTimeout(() => this.initReveal(), 80);
        },
        error: () => { this.isLoading = false; }
      });
  }

  private computeAnalytics(courses: CourseResponse[]): void {
    this.activeCourses  = courses.filter(c => c.is_active).length;
    this.totalStudents  = courses.reduce((s, c) => s + (c.student_count || 0), 0);
    this.totalContent   = courses.reduce((s, c) => s + (c.content_count || 0), 0);
    this.freeCourses    = courses.filter(c => c.is_free).length;
    this.paidCourses    = courses.filter(c => !c.is_free).length;

    this.topCourses    = [...courses]
      .sort((a, b) => (b.student_count || 0) - (a.student_count || 0))
      .slice(0, 5);

    this.recentCourses = [...courses]
      .sort((a, b) => new Date(b.created_date).getTime() - new Date(a.created_date).getTime())
      .slice(0, 4);

    // Subject distribution
    const subjectCount: Record<string, number> = {};
    courses.forEach(c => {
      const s = c.subject || 'Other';
      subjectCount[s] = (subjectCount[s] || 0) + 1;
    });
    const maxSubj = Math.max(...Object.values(subjectCount), 1);
    this.subjectMap = Object.entries(subjectCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([subject, count]) => ({ subject, count, pct: Math.round((count / maxSubj) * 100) }));

    // Education level distribution
    const levelCount: Record<string, number> = {};
    courses.forEach(c => {
      const l = c.education_level || 'OTHER';
      levelCount[l] = (levelCount[l] || 0) + 1;
    });
    this.levelMap = Object.entries(levelCount).map(([level, count]) => ({
      level,
      count,
      color: this.levelColors[level] || '#7A6050'
    }));
  }

  navigateToCourse(id: string): void {
    this.router.navigate(['/teacher-dashboard/courses', id]);
  }

  navigateToCourses(): void {
    this.router.navigate(['/teacher-dashboard/courses']);
  }

  navigateToCalendar(): void {
    this.router.navigate(['/teacher-dashboard/calendar']);
  }

  private initReveal(): void {
    const obs = new IntersectionObserver(
      entries => entries.forEach(e => {
        if (e.isIntersecting) { e.target.classList.add('in'); obs.unobserve(e.target); }
      }),
      { threshold: 0.08 }
    );
    document.querySelectorAll('.reveal').forEach(el => obs.observe(el));
  }

  private refreshCharts(): void {
    requestAnimationFrame(() => {
      this.renderStudentsChart();
      this.renderPricingChart();
      this.renderContentChart();
      this.renderSubjectsChart();
    });
  }

  private renderStudentsChart(): void {
    const canvas = this.teacherStudentsCanvas?.nativeElement;
    if (!canvas) return;

    const labels = this.topCourses.map((c) => c.title.length > 18 ? `${c.title.slice(0, 18)}...` : c.title);
    const data = this.topCourses.map((c) => c.student_count || 0);

    this.studentsChart?.destroy();
    this.studentsChart = new Chart(canvas, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Students',
            data,
            backgroundColor: 'rgba(26, 79, 168, 0.78)',
            borderColor: 'rgba(26, 79, 168, 1)',
            borderWidth: 1.2,
            borderRadius: 8
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } }
      }
    });
  }

  private renderPricingChart(): void {
    const canvas = this.teacherPricingCanvas?.nativeElement;
    if (!canvas) return;

    this.pricingChart?.destroy();
    this.pricingChart = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels: ['Free Courses', 'Paid Courses', 'Inactive Courses'],
        datasets: [
          {
            data: [this.freeCourses, this.paidCourses, Math.max(0, this.courses.length - this.activeCourses)],
            backgroundColor: ['#0B7A6E', '#C0412A', '#7A6050'],
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

  private renderContentChart(): void {
    const canvas = this.teacherContentCanvas?.nativeElement;
    if (!canvas) return;

    const labels = this.topCourses.map((c) => c.title.length > 16 ? `${c.title.slice(0, 16)}...` : c.title);
    const data = this.topCourses.map((c) => c.content_count || 0);

    this.contentChart?.destroy();
    this.contentChart = new Chart(canvas, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Content Items',
            data,
            borderColor: '#0B7A6E',
            backgroundColor: 'rgba(11, 122, 110, 0.16)',
            fill: true,
            tension: 0.32,
            pointRadius: 3
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } }
      }
    });
  }

  private renderSubjectsChart(): void {
    const canvas = this.teacherSubjectsCanvas?.nativeElement;
    if (!canvas) return;

    const labels = this.subjectMap.map((s) => s.subject);
    const data = this.subjectMap.map((s) => s.count);

    this.subjectsChart?.destroy();
    this.subjectsChart = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [
          {
            data,
            backgroundColor: ['#1A4FA8', '#0B7A6E', '#C47B1A', '#6D28D9', '#C0412A', '#7A6050'],
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
}
