import {Component, OnDestroy, OnInit} from '@angular/core';
import {
  StudentCourseDiscoveryService,
  StudentCourseResponse
} from "../../services/student/student-course-discovery.service";
import {Subject} from "rxjs";
import {Router} from "@angular/router";
import {takeUntil} from "rxjs/operators";
import {API_CONFIG} from "../../config/api.config";

@Component({
  selector: 'app-my-courses',
  templateUrl: './my-courses.component.html',
  styleUrls: ['./my-courses.component.css']
})
export class MyCoursesComponent implements OnInit, OnDestroy {

  enrolledCourses: StudentCourseResponse[] = [];
  filteredCourses: StudentCourseResponse[] = [];

  // Pagination
  currentPage: number = 0;
  pageSize: number = 12;
  totalPages: number = 0;

  // UI state
  isLoading: boolean = true;
  errorMessage: string = '';
  filterMode: string = 'all';   // 'all' | 'in-progress' | 'completed' | 'free'
  sortMode: string = 'recent';  // 'recent' | 'progress' | 'title'

  // KPI computed values
  completedCount: number = 0;
  inProgressCount: number = 0;
  avgProgress: number = 0;

  // Progress map (courseId → %)
  private progressMap: Map<string, number> = new Map();

  private destroy$ = new Subject<void>();

  constructor(
    private discoveryService: StudentCourseDiscoveryService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadCourses();
    this.initScrollReveal();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ── Data loading ──────────────────────────────────────────────────
  loadCourses(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.discoveryService.getEnrolledCourses(this.currentPage, 100) // fetch all for client-side filtering
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.enrolledCourses = response.content;
          this.seedProgress();
          this.computeKpis();
          this.applyFilterAndSort();
          this.isLoading = false;
          this.initScrollReveal();
        },
        error: () => {
          this.errorMessage = 'Could not load your courses. Please try again.';
          this.isLoading = false;
        }
      });
  }

  // ── Filtering & sorting ───────────────────────────────────────────
  setFilter(mode: string): void {
    this.filterMode = mode;
    this.currentPage = 0;
    this.applyFilterAndSort();
  }

  applySort(): void {
    this.applyFilterAndSort();
  }

  private applyFilterAndSort(): void {
    let result = [...this.enrolledCourses];

    // Filter
    switch (this.filterMode) {
      case 'in-progress':
        result = result.filter(c => {
          const p = this.getProgress(c.id);
          return p > 0 && p < 100;
        });
        break;
      case 'completed':
        result = result.filter(c => this.getProgress(c.id) === 100);
        break;
      case 'free':
        result = result.filter(c => c.isFree);
        break;
    }

    // Sort
    switch (this.sortMode) {
      case 'progress':
        result.sort((a, b) => this.getProgress(b.id) - this.getProgress(a.id));
        break;
      case 'title':
        result.sort((a, b) => a.title.localeCompare(b.title));
        break;
      default:
        // 'recent' — keep server order (most recently enrolled first)
        result.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        break;
    }

    // Paginate client-side
    this.totalPages = Math.ceil(result.length / this.pageSize);
    const start = this.currentPage * this.pageSize;
    this.filteredCourses = result.slice(start, start + this.pageSize);
  }

  // ── KPIs ──────────────────────────────────────────────────────────
  private computeKpis(): void {
    this.completedCount = this.enrolledCourses.filter(c => this.getProgress(c.id) === 100).length;
    this.inProgressCount = this.enrolledCourses.filter(c => {
      const p = this.getProgress(c.id);
      return p > 0 && p < 100;
    }).length;

    if (this.enrolledCourses.length > 0) {
      const total = this.enrolledCourses.reduce((sum, c) => sum + this.getProgress(c.id), 0);
      this.avgProgress = Math.round(total / this.enrolledCourses.length);
    }
  }

  // ── Progress helpers ──────────────────────────────────────────────
  /**
   * Returns the progress % for a course.
   * Replace with a real ProgressService call when available.
   */
  getProgress(courseId: string): number {
    return this.progressMap.get(courseId) ?? 0;
  }

  /**
   * Seeds mock progress data.
   * Remove once a real progress API is wired in.
   */
  private seedProgress(): void {
    this.enrolledCourses.forEach((c, i) => {
      if (!this.progressMap.has(c.id)) {
        const pct = i === 0 ? 100 : Math.min(95, (i * 17 + 8) % 100);
        this.progressMap.set(c.id, pct);
      }
    });
  }

  // ── Navigation ────────────────────────────────────────────────────
  viewCourse(courseId: string): void {
    this.router.navigate(['/student/my-courses', courseId]);
  }

  navigateToDiscovery(): void {
    this.router.navigate(['/student/courses']);
  }

  // ── Pagination ────────────────────────────────────────────────────
  goToPage(page: number): void {
    if (page >= 0 && page < this.totalPages) {
      this.currentPage = page;
      this.applyFilterAndSort();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  getPageNumbers(): number[] {
    const pages: number[] = [];
    const start = Math.max(0, this.currentPage - 2);
    const end = Math.min(this.totalPages, this.currentPage + 3);
    for (let i = start; i < end; i++) pages.push(i);
    return pages;
  }

  // ── Utilities ─────────────────────────────────────────────────────
  getFullImageUrl(path: string | null | undefined): string {
    if (!path) return '/assets/course-placeholder.png';
    if (path.startsWith('http')) return path;
    return `${API_CONFIG.SERVER_URL}${path.startsWith('/') ? '' : '/'}${path}`;
  }

  private initScrollReveal(): void {
    setTimeout(() => {
      const obs = new IntersectionObserver(
        (entries) => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('in'); }),
        { threshold: 0.07 }
      );
      document.querySelectorAll('.reveal').forEach(el => obs.observe(el));
    }, 100);
  }
}
