import {Component, EventEmitter, HostListener, OnDestroy, Output} from '@angular/core';
import {
  CourseResponse,
  CreateCourseRequest,
  EducationLevel,
  FileUploadResponse,
  Section
} from "../../../models/course.model";
import {FormBuilder, FormGroup, Validators} from "@angular/forms";
import {CourseService} from "../../../services/course/course.service";
import {catchError, map, of, Subject, switchMap} from "rxjs";
import {takeUntil} from "rxjs/operators";

@Component({
  selector: 'app-create-course-modal',
  templateUrl: './create-course-modal.component.html',
  styleUrls: ['./create-course-modal.component.css']
})
export class CreateCourseModalComponent implements OnDestroy {
  @Output() courseCreated = new EventEmitter<CourseResponse>();
  @Output() modalClosed = new EventEmitter<void>();

  isOpen = false;
  isLoading = false;
  errorMessage = '';
  successMessage = '';

  courseForm: FormGroup;

  coverImagePreview: string | null = null;
  coverImageUrl: string | null = null;
  selectedCoverImageFile: File | null = null;
  isDragOverCover = false;
  isUploadingCover = false;
  uploadCoverError = '';

  educationLevels = Object.values(EducationLevel);
  sections = Object.values(Section);

  private destroy$ = new Subject<void>();

  constructor(
    private courseService: CourseService,
    private fb: FormBuilder
  ) {
    this.courseForm = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(200)]],
      description: ['', [Validators.maxLength(2000)]],
      cover_image_url: [''],
      education_level: ['', Validators.required],
      section: [Section.NONE],
      specific_grade: [''],
      subject: ['', Validators.required],
      is_free: [true],
      price: [null]
    });
  }

  openModal(): void {
    this.isOpen = true;
    this.courseForm.reset({
      section: Section.NONE,
      is_free: true,
      cover_image_url: ''
    });
    this.resetMessagesAndMedia();
  }

  closeModal(): void {
    this.isOpen = false;
    this.courseForm.reset();
    this.resetMessagesAndMedia();
    this.modalClosed.emit();
  }

  @HostListener('dragover', ['$event'])
  onDragOver(event: DragEvent): void {
    if (!this.isOpen) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
  }

  onDragEnterCover(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOverCover = true;
  }

  onDragLeaveCover(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOverCover = false;
  }

  onDropCover(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOverCover = false;

    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.handleCoverImageFile(files[0]);
    }
  }

  onCoverImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.handleCoverImageFile(input.files[0]);
    }
  }

  removeCoverImage(): void {
    this.coverImagePreview = null;
    this.coverImageUrl = null;
    this.selectedCoverImageFile = null;
    this.courseForm.patchValue({cover_image_url: ''});
  }

  createCourse(): void {
    if (this.courseForm.invalid) {
      this.errorMessage = 'Please fill in all required fields correctly';
      return;
    }

    this.isLoading = true;
    this.isUploadingCover = false;
    this.errorMessage = '';
    this.successMessage = '';
    this.uploadCoverError = '';

    const courseData: CreateCourseRequest = {
      ...this.courseForm.value,
      cover_image_url: ''
    };

    this.courseService.createCourse(courseData)
      .pipe(
        takeUntil(this.destroy$),
        switchMap((createdCourse) => this.attachCoverImageIfNeeded(createdCourse, courseData))
      )
      .subscribe({
        next: (response) => {
          this.successMessage = this.uploadCoverError
            ? 'Course created, but the cover image could not be saved.'
            : 'Course created successfully!';
          this.isLoading = false;
          this.isUploadingCover = false;

          setTimeout(() => {
            this.courseCreated.emit(response);
            this.closeModal();
          }, 1000);
        },
        error: (error) => {
          this.errorMessage = error?.error?.message || 'Failed to create course. Please try again.';
          this.isLoading = false;
          this.isUploadingCover = false;
        }
      });
  }

  get titleControl() {
    return this.courseForm.get('title');
  }

  get descriptionControl() {
    return this.courseForm.get('description');
  }

  get educationLevelControl() {
    return this.courseForm.get('education_level');
  }

  get subjectControl() {
    return this.courseForm.get('subject');
  }

  get isFreeControl() {
    return this.courseForm.get('is_free');
  }

  get priceControl() {
    return this.courseForm.get('price');
  }

  get completionScore(): number {
    let score = 0;
    if (this.titleControl?.value) score += 25;
    if (this.descriptionControl?.value) score += 20;
    if (this.educationLevelControl?.value) score += 20;
    if (this.subjectControl?.value) score += 20;
    if (this.coverImagePreview) score += 15;
    return score;
  }

  get suggestedGrades(): string[] {
    const level = this.educationLevelControl?.value;
    if (level === 'PRIMARY') return ['6eme primaire', '5eme primaire', '4eme primaire'];
    if (level === 'COLLEGE') return ['7eme', '8eme', '9eme de base'];
    if (level === 'SECONDARY') return ['1ere secondaire', '2eme secondaire', 'Bac'];
    if (level === 'UNIVERSITY') return ['Licence 1', 'Licence 2', 'Ingenieur 1'];
    return [];
  }

  applySuggestedGrade(grade: string): void {
    this.courseForm.patchValue({ specific_grade: grade });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private handleCoverImageFile(file: File): void {
    if (!file.type.startsWith('image/')) {
      this.uploadCoverError = 'Please select a valid image file';
      return;
    }

    const maxSizeInBytes = 5 * 1024 * 1024;
    if (file.size > maxSizeInBytes) {
      this.uploadCoverError = 'Image must be smaller than 5MB';
      return;
    }

    this.uploadCoverError = '';
    this.coverImageUrl = null;
    this.selectedCoverImageFile = file;
    this.courseForm.patchValue({cover_image_url: ''});

    const reader = new FileReader();
    reader.onload = (event) => {
      this.coverImagePreview = event.target?.result as string;
    };
    reader.onerror = () => {
      this.uploadCoverError = 'Error processing image';
    };
    reader.readAsDataURL(file);
  }

  private attachCoverImageIfNeeded(course: CourseResponse, courseData: CreateCourseRequest) {
    if (!this.selectedCoverImageFile) {
      return of(course);
    }

    this.isUploadingCover = true;

    return this.courseService.uploadCourseImage(course.id, this.selectedCoverImageFile)
      .pipe(
        switchMap((uploadResponse: FileUploadResponse) => {
          this.coverImageUrl = uploadResponse.file_path;

          return this.courseService.updateCourse(course.id, {
            ...courseData,
            cover_image_url: uploadResponse.file_path
          }).pipe(
            map((updatedCourse) => {
              this.isUploadingCover = false;
              return updatedCourse;
            })
          );
        }),
        catchError((error) => {
          this.uploadCoverError = error?.error?.message || 'Cover image upload failed.';
          this.isUploadingCover = false;
          return of(course);
        })
      );
  }

  private resetMessagesAndMedia(): void {
    this.errorMessage = '';
    this.successMessage = '';
    this.coverImagePreview = null;
    this.coverImageUrl = null;
    this.selectedCoverImageFile = null;
    this.uploadCoverError = '';
    this.isUploadingCover = false;
  }
}
