import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import {
  StudentCourseDiscoveryService,
  StudentCourseResponse,
  PagedResponse,
  CourseSearchRequest
} from '../../services/student/student-course-discovery.service';
import { Subject } from 'rxjs';
import { takeUntil, debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { API_CONFIG } from '../../config/api.config';

@Component({
  selector: 'app-course-discovery',
  templateUrl: './course-discovery.component.html',
  styleUrls: ['./course-discovery.component.css']
})
export class CourseDiscoveryComponent implements OnInit, OnDestroy {

  courses: StudentCourseResponse[] = [];

  // Pagination
  currentPage: number = 0;
  pageSize: number = 12;
  totalElements: number = 0;
  totalPages: number = 0;

  // Filters
  searchQuery: string = '';
  selectedSubject: string = '';
  selectedEducationLevel: string = '';
  isFreeFilter: boolean | null = null;

  // Filter options
  subjects: string[] = [];
  educationLevels: string[] = [];

  // UI state
  isLoading: boolean = true;
  errorMessage: string = '';
  activeTab: string = 'all';
  showFilters: boolean = false;

  // Recommendations
  recommendations: StudentCourseResponse[] = [];
  showRecommendations: boolean = true;

  private destroy$ = new Subject<void>();
  private searchSubject$ = new Subject<string>();

  constructor(
    private discoveryService: StudentCourseDiscoveryService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadFilters();
    this.loadCourses();
    this.loadRecommendations();
    this.initScrollReveal();

    this.searchSubject$.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(query => {
      this.searchQuery = query;
      this.currentPage = 0;
      if (this.activeTab === 'enrolled') {
        this.activeTab = 'all';
      }
      this.performSearch();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ── Computed ──────────────────────────────────────────────────────
  get activeFiltersCount(): number {
    let count = 0;
    if (this.selectedSubject) count++;
    if (this.selectedEducationLevel) count++;
    if (this.isFreeFilter !== null) count++;
    return count;
  }

  // ── Event handlers ────────────────────────────────────────────────
  onSearchInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchSubject$.next(input.value);
  }

  onFreeFilterChange(event: Event): void {
    const checkbox = event.target as HTMLInputElement;
    this.isFreeFilter = checkbox.checked ? true : null;
  }

  private hasSearchCriteria(): boolean {
    return !!this.searchQuery.trim()
      || !!this.selectedSubject
      || !!this.selectedEducationLevel
      || this.isFreeFilter !== null;
  }

  // ── Data loading ──────────────────────────────────────────────────
  performSearch(): void {
    if (!this.hasSearchCriteria()) {
      this.loadCourses();
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    const request: CourseSearchRequest = {
      searchQuery: this.searchQuery.trim() || undefined,
      educationLevel: this.selectedEducationLevel || undefined,
      subject: this.selectedSubject || undefined,
      isFree: this.isFreeFilter !== null ? this.isFreeFilter : undefined,
      page: this.currentPage,
      pageSize: this.pageSize
    };

    this.discoveryService.searchCourses(request)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          // Filter out courses the student is already enrolled in
          this.courses = response.content.filter(course => !course.isEnrolled);
          this.totalElements = response.totalElements - response.content.filter(course => course.isEnrolled).length;
          this.totalPages = Math.ceil(this.totalElements / this.pageSize);
          this.isLoading = false;
        },
        error: () => {
          this.errorMessage = 'Error searching courses. Please try again.';
          this.isLoading = false;
        }
      });
  }

  loadCourses(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.discoveryService.getAllCourses(this.currentPage, this.pageSize)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          // Filter out courses the student is already enrolled in
          this.courses = response.content.filter(course => !course.isEnrolled);
          this.totalElements = response.totalElements - response.content.filter(course => course.isEnrolled).length;
          this.totalPages = Math.ceil(this.totalElements / this.pageSize);
          this.isLoading = false;
          this.showRecommendations = this.currentPage === 0;
        },
        error: () => {
          this.errorMessage = 'Error loading courses. Please try again.';
          this.isLoading = false;
        }
      });
  }

  loadEnrolledCourses(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.discoveryService.getEnrolledCourses(this.currentPage, this.pageSize)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.courses = response.content;
          this.totalElements = response.totalElements;
          this.totalPages = response.totalPages;
          this.isLoading = false;
          this.showRecommendations = false;
        },
        error: () => {
          this.errorMessage = 'Error loading enrolled courses. Please try again.';
          this.isLoading = false;
        }
      });
  }

  loadRecommendations(): void {
    this.discoveryService.getRecommendedCourses(8)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          // Filter out courses the student is already enrolled in
          this.recommendations = response.filter(course => !course.isEnrolled);
        },
        error: () => {}
      });
  }

  loadFilters(): void {
    this.discoveryService.getAvailableSubjects()
      .pipe(takeUntil(this.destroy$))
      .subscribe({ next: (s) => { this.subjects = s; }, error: () => {} });

    this.discoveryService.getAvailableEducationLevels()
      .pipe(takeUntil(this.destroy$))
      .subscribe({ next: (l) => { this.educationLevels = l; }, error: () => {} });
  }

  // ── Actions ───────────────────────────────────────────────────────
  applyFilters(): void {
    this.currentPage = 0;
    if (this.activeTab === 'enrolled') {
      this.activeTab = 'all';
    }
    this.hasSearchCriteria() ? this.performSearch() : this.loadCourses();
    this.showFilters = false;
  }

  resetFilters(): void {
    this.selectedSubject = '';
    this.selectedEducationLevel = '';
    this.isFreeFilter = null;
    this.searchQuery = '';
    this.currentPage = 0;
    this.loadCourses();
  }

  switchTab(tab: string): void {
    this.activeTab = tab;
    this.currentPage = 0;
    if (tab === 'enrolled') {
      this.showRecommendations = false;
      this.loadEnrolledCourses();
      return;
    }

    this.loadRecommendations();
    this.hasSearchCriteria() ? this.performSearch() : this.loadCourses();
  }

  viewCourseDetails(courseId: string): void {
    this.router.navigate(['/student/courses', courseId]);
  }

  goToPage(page: number): void {
    if (page >= 0 && page < this.totalPages) {
      this.currentPage = page;
      if (this.activeTab === 'enrolled') {
        this.loadEnrolledCourses();
      } else if (this.hasSearchCriteria()) {
        this.performSearch();
      } else {
        this.loadCourses();
      }
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
