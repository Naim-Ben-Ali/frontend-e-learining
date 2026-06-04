import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subject, forkJoin, of } from 'rxjs';
import { catchError, map, takeUntil } from 'rxjs/operators';
import { CourseService } from '../../services/course/course.service';
import { CourseEnrollmentResponse, CourseResponse } from '../../models/course.model';

interface EnrollmentViewItem {
  enrollmentId: string;
  courseId: string;
  courseTitle: string;
  enrolledDate: string;
}

interface StudentSummary {
  studentId: string;
  studentName: string;
  studentEmail: string;
  enrollmentsCount: number;
  lastEnrolledDate: string;
  enrollments: EnrollmentViewItem[];
}

@Component({
  selector: 'app-students-management',
  templateUrl: './students-management.component.html',
  styleUrls: ['./students-management.component.css']
})
export class StudentsManagementComponent implements OnInit, OnDestroy {
  loading = false;
  errorMessage = '';
  successMessage = '';

  courses: CourseResponse[] = [];
  students: StudentSummary[] = [];
  filteredStudents: StudentSummary[] = [];
  selectedStudent: StudentSummary | null = null;

  searchQuery = '';
  selectedCourseId = 'all';

  private destroy$ = new Subject<void>();

  constructor(private courseService: CourseService) {}

  ngOnInit(): void {
    this.loadStudentsData();
    setTimeout(() => this.initReveal(), 120);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get totalStudents(): number {
    return this.students.length;
  }

  get totalEnrollments(): number {
    return this.students.reduce((sum, student) => sum + student.enrollmentsCount, 0);
  }

  get activeCoursesWithStudents(): number {
    const courseIds = new Set<string>();
    this.students.forEach((student) => {
      student.enrollments.forEach((enrollment) => courseIds.add(enrollment.courseId));
    });
    return courseIds.size;
  }

  loadStudentsData(): void {
    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.courseService.getAllTeacherCourses()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (courses) => {
          this.courses = courses;

          if (!courses.length) {
            this.students = [];
            this.filteredStudents = [];
            this.selectedStudent = null;
            this.loading = false;
            return;
          }

          const enrollmentRequests = courses.map((course) =>
            this.courseService.getCourseEnrollments(course.id).pipe(
              map((enrollments) => ({ course, enrollments })),
              catchError(() => of({ course, enrollments: [] as CourseEnrollmentResponse[] }))
            )
          );

          forkJoin(enrollmentRequests)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
              next: (results) => {
                const byStudent = new Map<string, StudentSummary>();

                results.forEach(({ course, enrollments }) => {
                  enrollments.forEach((enrollment) => {
                    const existing = byStudent.get(enrollment.student_id);
                    const item: EnrollmentViewItem = {
                      enrollmentId: enrollment.id,
                      courseId: course.id,
                      courseTitle: course.title,
                      enrolledDate: enrollment.enrolled_date
                    };

                    if (existing) {
                      existing.enrollments.push(item);
                      existing.enrollmentsCount = existing.enrollments.length;
                      if (new Date(item.enrolledDate).getTime() > new Date(existing.lastEnrolledDate).getTime()) {
                        existing.lastEnrolledDate = item.enrolledDate;
                      }
                    } else {
                      byStudent.set(enrollment.student_id, {
                        studentId: enrollment.student_id,
                        studentName: enrollment.student_name,
                        studentEmail: enrollment.student_email,
                        enrollmentsCount: 1,
                        lastEnrolledDate: item.enrolledDate,
                        enrollments: [item]
                      });
                    }
                  });
                });

                this.students = Array.from(byStudent.values()).sort(
                  (a, b) => new Date(b.lastEnrolledDate).getTime() - new Date(a.lastEnrolledDate).getTime()
                );
                this.applyFilters();
                this.loading = false;
              },
              error: () => {
                this.errorMessage = 'Failed to load students enrollments.';
                this.loading = false;
              }
            });
        },
        error: () => {
          this.errorMessage = 'Failed to load courses.';
          this.loading = false;
        }
      });
  }

  applyFilters(): void {
    const query = this.searchQuery.trim().toLowerCase();
    const selectedCourse = this.selectedCourseId;

    this.filteredStudents = this.students.filter((student) => {
      const matchesQuery =
        !query ||
        student.studentName.toLowerCase().includes(query) ||
        student.studentEmail.toLowerCase().includes(query) ||
        student.enrollments.some((enrollment) => enrollment.courseTitle.toLowerCase().includes(query));

      const matchesCourse =
        selectedCourse === 'all' ||
        student.enrollments.some((enrollment) => enrollment.courseId === selectedCourse);

      return matchesQuery && matchesCourse;
    });

    if (!this.selectedStudent || !this.filteredStudents.some((s) => s.studentId === this.selectedStudent?.studentId)) {
      this.selectedStudent = this.filteredStudents.length ? this.filteredStudents[0] : null;
    } else {
      this.selectedStudent = this.filteredStudents.find((s) => s.studentId === this.selectedStudent?.studentId) || null;
    }
  }

  selectStudent(student: StudentSummary): void {
    this.selectedStudent = student;
  }

  removeEnrollment(student: StudentSummary, enrollment: EnrollmentViewItem): void {
    if (!confirm(`Remove ${student.studentName} from "${enrollment.courseTitle}"?`)) {
      return;
    }

    this.courseService.removeStudentFromCourse(enrollment.courseId, enrollment.enrollmentId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.successMessage = `${student.studentName} was removed from ${enrollment.courseTitle}.`;
          this.loadStudentsData();
          setTimeout(() => {
            this.successMessage = '';
          }, 3000);
        },
        error: () => {
          this.errorMessage = 'Failed to remove student from course.';
        }
      });
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
  }

  private initReveal(): void {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('in');
          }
        });
      },
      { threshold: 0.06 }
    );
    document.querySelectorAll('.reveal').forEach((el) => observer.observe(el));
  }
}
