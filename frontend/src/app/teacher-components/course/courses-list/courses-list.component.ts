import {Component, OnInit, ViewChild} from '@angular/core';
import {CreateCourseModalComponent} from "../create-course-modal/create-course-modal.component";
import {CourseResponse} from "../../../models/course.model";
import {CourseService} from "../../../services/course/course.service";
import {Router} from "@angular/router";

@Component({
  selector: 'app-courses-list',
  templateUrl: './courses-list.component.html',
  styleUrls: ['./courses-list.component.css']
})
export class CoursesListComponent implements OnInit {
  @ViewChild(CreateCourseModalComponent) courseModal!: CreateCourseModalComponent;

  courses: CourseResponse[] = [];
  isLoading = true;
  errorMessage = '';

  constructor(
    private courseService: CourseService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadCourses();
  }

  loadCourses(): void {
    console.log('[v0] Loading teacher courses...');
    this.isLoading = true;
    this.errorMessage = '';

    this.courseService.getAllTeacherCourses().subscribe({
      next: (courses) => {
        console.log('[v0] Courses loaded successfully:', courses);
        this.courses = courses;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('[v0] Error loading courses:', error);
        this.errorMessage = 'Failed to load courses. Please try again.';
        this.isLoading = false;
      }
    });
  }

  openCreateCourseModal(): void {
    this.courseModal.openModal();
  }

  onCourseCreated(course: CourseResponse): void {
    console.log('[v0] Course created, navigating to course detail:', course.id);
    this.router.navigate(['/teacher-dashboard/courses', course.id]);
  }

  navigateToCourse(courseId: string): void {
    console.log('[v0] Navigating to course:', courseId);
    this.router.navigate(['/teacher-dashboard/courses', courseId]);
  }

  deleteCourse(courseId: string, event: Event): void {
    event.stopPropagation();

    if (confirm('Are you sure you want to delete this course? This action cannot be undone.')) {
      console.log('[v0] Deleting course:', courseId);

      this.courseService.deleteCourse(courseId).subscribe({
        next: () => {
          console.log('[v0] Course deleted successfully, reloading courses list');
          this.courses = this.courses.filter(c => c.id !== courseId);
          this.loadCourses(); // Reload from backend to ensure consistency
        },
        error: (error) => {
          console.error('[v0] Error deleting course:', error);
          this.errorMessage = 'Failed to delete course. Please try again.';
          setTimeout(() => {
            this.errorMessage = '';
          }, 5000);
        }
      });
    }
  }

  get courseCount(): number {
    return this.courses.length;
  }

  get totalStudents(): number {
    return this.courses.reduce((total, course) => total + course.student_count, 0);
  }

  get totalContent(): number {
    return this.courses.reduce((total, course) => total + course.content_count, 0);
  }
}
