import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from "@angular/router";
import { FormBuilder, FormGroup, Validators } from "@angular/forms";
import { Subject, takeUntil } from "rxjs";
import { CourseService } from "../../../services/course/course.service";
import { CourseContentRequest, CourseSectionResponse, FileUploadResponse } from "../../../models/course.model";

@Component({
  selector: 'app-section-detail',
  templateUrl: './section-detail.component.html',
  styleUrls: ['./section-detail.component.css']
})
export class SectionDetailComponent implements OnInit, OnDestroy {
  courseId = '';
  sectionId = '';
  section: CourseSectionResponse | null = null;
  contentForm: FormGroup;
  isLoading = true;
  isSaving = false;
  errorMessage = '';
  successMessage = '';

  private readonly destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private fb: FormBuilder,
    private courseService: CourseService
  ) {
    this.contentForm = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(3)]],
      description: [''],
      type: ['DOCUMENT', Validators.required],
      contentUrl: ['', Validators.required],
      fileName: [''],
      fileSize: [''],
      orderIndex: [0]
    });
  }

  ngOnInit(): void {
    this.route.paramMap.pipe(takeUntil(this.destroy$)).subscribe((params) => {
      this.courseId = params.get('courseId') || '';
      this.sectionId = params.get('sectionId') || '';
      this.loadSection();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadSection(): void {
    this.isLoading = true;
    this.courseService.getSection(this.courseId, this.sectionId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (section) => {
          this.section = section;
          this.isLoading = false;
        },
        error: () => {
          this.errorMessage = 'Unable to load this section.';
          this.isLoading = false;
        }
      });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) {
      return;
    }

    this.isSaving = true;
    this.courseService.uploadFile(this.courseId, input.files[0], this.sectionId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: FileUploadResponse) => {
          this.contentForm.patchValue({
            title: input.files![0].name.replace(/\.[^/.]+$/, ''),
            contentUrl: response.file_path,
            fileName: response.file_name,
            fileSize: response.file_size
          });
          this.isSaving = false;
        },
        error: (error) => {
          this.errorMessage = error?.error?.message || 'Unable to upload this file.';
          this.isSaving = false;
        }
      });
  }

  addContent(): void {
    if (this.contentForm.invalid) {
      this.contentForm.markAllAsTouched();
      return;
    }

    const formValue = this.contentForm.value;
    const request: CourseContentRequest = {
      title: formValue.title,
      description: formValue.description,
      type: formValue.type,
      content_url: formValue.contentUrl,
      file_name: formValue.fileName,
      file_size: formValue.fileSize,
      section_id: this.sectionId,
      order_index: formValue.orderIndex
    };

    this.isSaving = true;
    this.courseService.addContent(this.courseId, request)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.successMessage = 'Content added successfully.';
          this.contentForm.reset({ type: 'DOCUMENT', orderIndex: 0 });
          this.isSaving = false;
          this.loadSection();
        },
        error: (error) => {
          this.errorMessage = error?.error?.message || 'Unable to add content.';
          this.isSaving = false;
        }
      });
  }

  deleteContent(contentId: string): void {
    this.courseService.deleteContent(this.courseId, contentId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => this.loadSection(),
        error: () => this.errorMessage = 'Unable to delete content.'
      });
  }

  backToCourse(): void {
    this.router.navigate(['/teacher-dashboard/courses', this.courseId]);
  }
}
