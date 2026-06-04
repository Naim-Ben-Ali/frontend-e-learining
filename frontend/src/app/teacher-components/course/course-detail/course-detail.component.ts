import {Component, OnDestroy, OnInit} from '@angular/core';
import {
  CourseContentRequest,
  CourseEnrollmentResponse,
  CourseResponse,
  EducationLevel,
  FileUploadResponse,
  Section
} from "../../../models/course.model";
import {FormBuilder, FormGroup, Validators} from "@angular/forms";
import {Subject, takeUntil} from "rxjs";
import {CourseService} from "../../../services/course/course.service";
import {ActivatedRoute, Router} from "@angular/router";
import {API_CONFIG} from "../../../config/api.config";
import {SubscriptionKeyService} from "../../../services/subscription-key/subscription-key.service";
import {SubscriptionKey} from "../../../models/subscription-key.model";

@Component({
  selector: 'app-course-detail',
  templateUrl: './course-detail.component.html',
  styleUrls: ['./course-detail.component.css']
})
export class CourseDetailComponent  implements OnInit, OnDestroy {
  courseId: string = '';
  course: CourseResponse | null = null;
  enrollments: CourseEnrollmentResponse[] = [];

  isLoading = true;
  isSaving = false;
  errorMessage = '';
  successMessage = '';

  activeTab: 'overview' | 'content' | 'students' = 'overview';
  showContentForm = false;
  showEditForm = false;
  showSectionForm = false;
  isDragOver = false;
  isDragOverContent = false;

  // Enums for dropdowns
  educationLevels = Object.values(EducationLevel);
  sections = Object.values(Section);

  // Sections management
  courseSections: any[] = [];
  selectedSectionId: string | null = null;
  expandedSections: Set<string> = new Set(); // Track which sections are expanded

  // Course image preview
  courseImagePreview: string | null = null;

  // Subscription key management
  subscriptionKey: SubscriptionKey | null = null;
  showKeyDialog = false;
  showRegenerateConfirmation = false;
  keyLoading = false;
  keyCopied = false;

  // Backend API config
  readonly BACKEND_URL = API_CONFIG.SERVER_URL;

  // Computed properties for template filtering
  get ungroupedContents(): any[] {
    return this.course?.contents?.filter(c => !c.section_id) ?? [];
  }

  getContentsBySection(sectionId: string): any[] {
    return this.course?.contents?.filter(c => c.section_id === sectionId) ?? [];
  }

  // Show legacy ungrouped lessons inside the first section card so content is always displayed in-section.
  getSectionContents(sectionId: string, sectionIndex: number): any[] {
    const sectionContents = this.getContentsBySection(sectionId);
    if (sectionIndex !== 0 || !this.hasUngroupedContent) {
      return sectionContents;
    }

    return [...sectionContents, ...this.ungroupedContents];
  }

  get hasUngroupedContent(): boolean {
    return this.ungroupedContents.length > 0;
  }

  toggleSection(sectionId: string): void {
    if (this.expandedSections.has(sectionId)) {
      this.expandedSections.delete(sectionId);
    } else {
      this.expandedSections.add(sectionId);
    }
  }

  isSectionExpanded(sectionId: string): boolean {
    return this.expandedSections.has(sectionId);
  }

  contentForm: FormGroup;
  editForm: FormGroup;
  sectionForm: FormGroup;

  private destroy$ = new Subject<void>();

  constructor(
    private courseService: CourseService,
    private route: ActivatedRoute,
    private router: Router,
    private fb: FormBuilder,
    private subscriptionKeyService: SubscriptionKeyService
  ) {
    // FIX: form control names kept as camelCase internally for Angular convenience;
    // they are manually mapped to snake_case before being sent to the backend in addContent().
    this.contentForm = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(200)]],
      description: ['', [Validators.maxLength(1000)]],
      type: ['DOCUMENT', Validators.required],
      contentUrl: ['', [Validators.required]],
      fileName: [''],
      fileSize: [''],   // FIX: string, not number — backend stores file size as e.g. "5.2 MB"
      sectionId: [null],
      orderIndex: [0]
    });

    this.sectionForm = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(100)]],
      description: ['', [Validators.maxLength(500)]],
      orderIndex: [0]
    });

    this.editForm = this.fb.group({
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

  ngOnInit(): void {
    this.route.params.pipe(takeUntil(this.destroy$)).subscribe(params => {
      this.courseId = params['courseId'];
      this.loadCourse();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadCourse(): void {
    console.log('[v0] Loading course:', this.courseId);
    this.isLoading = true;
    this.errorMessage = '';

    this.courseService.getCourseById(this.courseId).pipe(takeUntil(this.destroy$)).subscribe({
      next: (response) => {
        console.log('[v0] Course loaded:', response);
        this.course = response;
        // Set course image preview with full URL if available
        if (response.cover_image_url) {
          this.courseImagePreview = this.getFullImageUrl(response.cover_image_url);
        }
        this.loadSections();
        this.editForm.patchValue({
          title: response.title,
          description: response.description,
          cover_image_url: response.cover_image_url,
          education_level: response.education_level,
          section: response.section || Section.NONE,
          specific_grade: response.specific_grade,
          subject: response.subject,
          is_free: response.is_free,
          price: response.price
        });
        this.loadEnrollments();
        this.isLoading = false;
      },
      error: (error) => {
        console.error('[v0] Error loading course:', error);
        this.errorMessage = 'Failed to load course. Please try again.';
        this.isLoading = false;
      }
    });
  }

  loadEnrollments(): void {
    if (!this.courseId) return;

    console.log('[v0] Loading enrollments for course:', this.courseId);

    this.courseService.getCourseEnrollments(this.courseId).pipe(takeUntil(this.destroy$)).subscribe({
      next: (enrollments) => {
        console.log('[v0] Enrollments loaded:', enrollments);
        this.enrollments = enrollments;
      },
      error: (error) => {
        console.error('[v0] Error loading enrollments:', error);
      }
    });
  }

  // ── Subscription Key Management ──────────────────────────────────
  loadSubscriptionKey(): void {
    if (!this.courseId) return;

    console.log('[v0] Loading subscription key for course:', this.courseId);
    this.keyLoading = true;

    this.subscriptionKeyService.getActiveCourseKey(this.courseId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (key) => {
          console.log('[v0] Subscription key loaded:', key);
          this.subscriptionKey = key;
          this.keyLoading = false;
        },
        error: (error) => {
          console.error('[v0] Error loading subscription key:', error);
          this.subscriptionKey = null;
          this.keyLoading = false;
        }
      });
  }

  showKeyManagement(): void {
    this.showKeyDialog = true;
    if (!this.subscriptionKey) {
      this.loadSubscriptionKey();
    }
  }

  closeKeyDialog(): void {
    this.showKeyDialog = false;
  }

  copyKeyToClipboard(): void {
    if (!this.subscriptionKey) return;

    navigator.clipboard.writeText(this.subscriptionKey.subscription_key).then(() => {
      this.keyCopied = true;
      this.successMessage = 'Key copied to clipboard!';
      setTimeout(() => {
        this.keyCopied = false;
        this.successMessage = '';
      }, 3000);
    }).catch(() => {
      this.errorMessage = 'Failed to copy key to clipboard';
    });
  }

  showRegenerateConfirmationDialog(): void {
    this.showRegenerateConfirmation = true;
  }

  cancelRegenerate(): void {
    this.showRegenerateConfirmation = false;
  }

  confirmRegenerate(): void {
    this.showRegenerateConfirmation = false;
    this.keyLoading = true;
    this.errorMessage = '';

    console.log('[v0] Regenerating subscription key for course:', this.courseId);

    this.subscriptionKeyService.regenerateKeyForCourse(this.courseId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (newKey) => {
          console.log('[v0] Key regenerated:', newKey);
          this.subscriptionKey = newKey;
          this.successMessage = 'Key regenerated successfully! All students enrolled with the old key have been unenrolled.';
          this.keyLoading = false;
          setTimeout(() => {
            this.successMessage = '';
          }, 5000);
        },
        error: (error) => {
          console.error('[v0] Error regenerating key:', error);
          this.errorMessage = 'Failed to regenerate key. Please try again.';
          this.keyLoading = false;
        }
      });
  }

  getMaskedKey(): string {
    if (!this.subscriptionKey) return '';
    const key = this.subscriptionKey.subscription_key;
    if (key.length <= 8) return key;
    return `${key.substring(0, 4)}...${key.substring(key.length - 4)}`;
  }

  setActiveTab(tab: 'overview' | 'content' | 'students'): void {
    this.activeTab = tab;
    if (tab === 'students') {
      this.loadEnrollments();
    }
  }

  closeContentForm(): void {
    this.showContentForm = false;
    this.selectedSectionId = null;
    this.contentForm.reset();
  }

  addContent(): void {
    if (this.contentForm.invalid) {
      this.errorMessage = 'Please fill in all required fields';
      return;
    }

    this.isSaving = true;
    this.errorMessage = '';

    // FIX: manually map camelCase form control names to snake_case keys
    // so they match the backend @JsonProperty annotations in CourseContentRequest.java
    const formVal = this.contentForm.value;
    const request: CourseContentRequest = {
      title:       formVal.title,
      description: formVal.description,
      type:        formVal.type,
      content_url: formVal.contentUrl,   // camelCase → snake_case
      file_name:   formVal.fileName,     // camelCase → snake_case
      file_size:   formVal.fileSize,     // camelCase → snake_case
      section_id:  this.selectedSectionId ?? formVal.sectionId,
      order_index: formVal.orderIndex    // camelCase → snake_case
    };

    this.courseService.addContent(this.courseId, request).pipe(takeUntil(this.destroy$)).subscribe({
      next: (response) => {
        console.log('[v0] Content added successfully:', response);
        this.successMessage = 'Content added successfully!';
        this.isSaving = false;
        this.closeContentForm();
        this.loadCourse();

        setTimeout(() => {
          this.successMessage = '';
        }, 3000);
      },
      error: (error) => {
        console.error('[v0] Error adding content:', error);
        this.errorMessage = error?.error?.message || 'Failed to add content. Please try again.';
        this.isSaving = false;
      }
    });
  }

  deleteContent(contentId: string): void {
    if (!confirm('Are you sure you want to delete this content?')) {
      return;
    }

    console.log('[v0] Deleting content:', contentId);

    this.courseService.deleteContent(this.courseId, contentId).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        console.log('[v0] Content deleted successfully');
        this.successMessage = 'Content deleted successfully!';
        this.loadCourse();

        setTimeout(() => {
          this.successMessage = '';
        }, 3000);
      },
      error: (error) => {
        console.error('[v0] Error deleting content:', error);
        this.errorMessage = 'Failed to delete content. Please try again.';
      }
    });
  }

  updateCourse(): void {
    if (this.editForm.invalid || !this.course) {
      return;
    }

    this.isSaving = true;
    this.errorMessage = '';

    // editForm control names already use snake_case (cover_image_url, education_level, etc.)
    // so the value object maps directly to what the backend CreateCourseRequest expects.
    const request = this.editForm.value;

    this.courseService.updateCourse(this.courseId, request).pipe(takeUntil(this.destroy$)).subscribe({
      next: (response) => {
        console.log('[v0] Course updated successfully:', response);
        this.course = response;
        this.successMessage = 'Course updated successfully!';
        this.showEditForm = false;
        this.isSaving = false;

        setTimeout(() => {
          this.successMessage = '';
        }, 3000);
      },
      error: (error) => {
        console.error('[v0] Error updating course:', error);
        this.errorMessage = 'Failed to update course. Please try again.';
        this.isSaving = false;
      }
    });
  }

  removeStudent(enrollmentId: string): void {
    if (!confirm('Are you sure you want to remove this student from the course?')) {
      return;
    }

    console.log('[v0] Removing student:', enrollmentId);

    this.courseService.removeStudentFromCourse(this.courseId, enrollmentId).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        console.log('[v0] Student removed successfully');
        this.successMessage = 'Student removed successfully!';
        this.loadEnrollments();

        setTimeout(() => {
          this.successMessage = '';
        }, 3000);
      },
      error: (error) => {
        console.error('[v0] Error removing student:', error);
        this.errorMessage = 'Failed to remove student. Please try again.';
      }
    });
  }

  // ── Section Management ───────────────────────────────────────────
  loadSections(): void {
    if (!this.courseId) return;

    this.courseService.getAllSections(this.courseId).pipe(takeUntil(this.destroy$)).subscribe({
      next: (sections) => {
        console.log('[v0] Sections loaded:', sections);
        this.courseSections = sections;
      },
      error: (error) => {
        console.error('[v0] Error loading sections:', error);
      }
    });
  }

  openSectionForm(): void {
    this.showSectionForm = true;
    this.sectionForm.reset({ orderIndex: 0 });
  }

  closeSectionForm(): void {
    this.showSectionForm = false;
    this.sectionForm.reset();
  }

  addSection(): void {
    if (this.sectionForm.invalid) return;

    this.isSaving = true;
    const request = {
      title: this.sectionForm.value.title,
      description: this.sectionForm.value.description,
      order_index: this.sectionForm.value.orderIndex
    };

    this.courseService.createSection(this.courseId, request).pipe(takeUntil(this.destroy$)).subscribe({
      next: (created) => {
        console.log('[v0] Section created successfully');
        this.successMessage = 'Section created successfully! Add lessons inside the section.';
        if (created?.id) {
          this.expandedSections.add(created.id);
        }
        this.loadSections();
        this.closeSectionForm();
        this.isSaving = false;
        setTimeout(() => { this.successMessage = ''; }, 4000);
      },
      error: (error) => {
        console.error('[v0] Error creating section:', error);
        this.errorMessage = 'Failed to create section. Please try again.';
        this.isSaving = false;
      }
    });
  }

  deleteSection(sectionId: string): void {
    if (!confirm('Are you sure? All content in this section will remain but will not be grouped.')) return;

    this.courseService.deleteSection(this.courseId, sectionId).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        console.log('[v0] Section deleted successfully');
        this.successMessage = 'Section deleted successfully!';
        this.loadSections();
        setTimeout(() => { this.successMessage = ''; }, 3000);
      },
      error: (error) => {
        console.error('[v0] Error deleting section:', error);
        this.errorMessage = 'Failed to delete section. Please try again.';
      }
    });
  }

  // ── Content Form Drag and Drop ────────────────────────────────────
  onContentFormDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOverContent = true;
  }

  onContentFormDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOverContent = false;
  }

  onContentFormDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOverContent = false;

    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      console.log('[v0] File dropped in content form:', files[0].name);
      this.handleContentFileUpload(files[0]);
    }
  }

  onContentFileInputChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      console.log('[v0] File selected in content form:', input.files[0].name);
      this.handleContentFileUpload(input.files[0]);
    }
  }

  private handleContentFileUpload(file: File): void {
    console.log('[v0] Starting file upload:', file.name);
    this.isSaving = true;
    this.errorMessage = '';

    // Upload file to backend
    const sectionId = this.selectedSectionId;
    this.courseService.uploadFile(this.courseId, file, sectionId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: FileUploadResponse) => {
          console.log('[v0] File uploaded successfully:', response);

          if (!response || !response.file_path) {
            console.error('[v0] Invalid response:', response);
            this.errorMessage = 'Invalid response from server. Please try again.';
            this.isSaving = false;
            return;
          }

          const contentType = this.getContentTypeFromFile(file);

          // Pre-populate form with file path from backend
          this.contentForm.patchValue({
            title: file.name.replace(/\.[^/.]+$/, ''),
            fileName: response.file_name || file.name,
            fileSize: this.formatFileSize(response.file_size),
            type: contentType,
            contentUrl: response.file_path
          });

          this.isSaving = false;
          this.successMessage = 'File uploaded successfully!';
          setTimeout(() => { this.successMessage = ''; }, 3000);
          console.log('[v0] Content form pre-populated with file path:', response.file_path);
        },
        error: (error) => {
          console.error('[v0] Error uploading file:', error);

          // Better error message extraction
          let errorMsg = 'Error uploading file. Please try again.';
          if (error) {
            if (error.message && error.message !== 'OK') {
              errorMsg = error.message;
            } else if (error.error && typeof error.error === 'object' && error.error.error) {
              errorMsg = error.error.error;
            } else if (error.error && typeof error.error === 'string') {
              errorMsg = error.error;
            }
          }

          this.errorMessage = errorMsg;
          this.isSaving = false;
        }
      });
  }


  // ── Drag and drop handlers ────────────────────────────────────────
  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;

    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      console.log('[v0] Files dropped:', files.length);
      this.handleFileUpload(files);
    }
  }

  onFileInputChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      console.log('[v0] Files selected:', input.files.length);
      this.handleFileUpload(input.files);
    }
  }

  private handleFileUpload(files: FileList): void {
    const file = files[0];
    if (!file) return;

    console.log('[v0] Processing file upload:', file.name, 'Size:', file.size);
    this.isSaving = true;
    this.errorMessage = '';

    // Upload file to backend first
    const sectionId = this.selectedSectionId;
    this.courseService.uploadFile(this.courseId, file, sectionId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: FileUploadResponse) => {
          console.log('[v0] File uploaded successfully:', response);

          if (!response || !response.file_path) {
            console.error('[v0] Invalid response:', response);
            this.errorMessage = 'Invalid response from server. Please try again.';
            this.isSaving = false;
            return;
          }

          const contentType = this.getContentTypeFromFile(file);
          const fileSizeInMB = (file.size / (1024 * 1024)).toFixed(2);

          // Pre-populate form with uploaded file information
          this.contentForm.patchValue({
            title: file.name.replace(/\.[^/.]+$/, ''),
            fileName: response.file_name || file.name,
            fileSize: response.file_size ? this.formatFileSize(response.file_size) : `${fileSizeInMB} MB`,
            type: contentType,
            contentUrl: response.file_path
          });

          this.isSaving = false;
          if (this.selectedSectionId) {
            this.showContentForm = true;
            this.expandedSections.add(this.selectedSectionId);
          }
          this.successMessage = 'File uploaded successfully!';
          setTimeout(() => { this.successMessage = ''; }, 3000);
          console.log('[v0] Content form pre-populated with file path:', response.file_path);
        },
        error: (error) => {
          console.error('[v0] Error uploading file:', error);
          let errorMsg = 'Error uploading file. Please try again.';
          if (error?.error?.error) {
            errorMsg = error.error.error;
          } else if (error?.message) {
            errorMsg = error.message;
          }
          this.errorMessage = errorMsg;
          this.isSaving = false;
        }
      });
  }

  private getContentTypeFromFile(file: File): string {
    const type = file.type;
    const name = file.name.toLowerCase();

    if (type.startsWith('video/')) return 'VIDEO';
    if (type.startsWith('image/')) return 'DOCUMENT';
    if (type.startsWith('application/pdf')) return 'DOCUMENT';
    if (type.startsWith('application/msword') || type.includes('spreadsheet')) return 'DOCUMENT';

    if (name.endsWith('.mp4') || name.endsWith('.webm') || name.endsWith('.mov')) return 'VIDEO';
    if (name.endsWith('.pdf') || name.endsWith('.doc') || name.endsWith('.docx') ||
      name.endsWith('.xls') || name.endsWith('.xlsx')) return 'DOCUMENT';

    return 'DOCUMENT'; // Default to document
  }
  // ── Course Image Upload Handler ─────────────────────────────────
  onCourseImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      console.log('[v0] Course image selected:', file.name);

      // Validate it's an image
      if (!file.type.startsWith('image/')) {
        this.errorMessage = 'Please select a valid image file';
        return;
      }

      // Upload file to backend
      this.isSaving = true;
      this.errorMessage = '';

      this.courseService.uploadCourseImage(this.courseId, file)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            console.log('[v0] Course image uploaded successfully:', response);

            if (!response || !response.file_path) {
              console.error('[v0] Invalid response:', response);
              this.errorMessage = 'Invalid response from server. Please try again.';
              this.isSaving = false;
              return;
            }

            // Update form with uploaded image URL
            this.editForm.patchValue({
              cover_image_url: response.file_path
            });

            // Show preview with full URL
            this.courseImagePreview = this.getFullImageUrl(response.file_path);

            this.isSaving = false;
            this.successMessage = 'Image uploaded successfully!';
            setTimeout(() => { this.successMessage = ''; }, 3000);
            console.log('[v0] Course image URL updated:', response.file_path);
          },
          error: (error) => {
            console.error('[v0] Error uploading course image:', error);
            let errorMsg = 'Error uploading image. Please try again.';
            if (error?.error?.error) {
              errorMsg = error.error.error;
            }
            this.errorMessage = errorMsg;
            this.isSaving = false;
          }
        });
    }
  }

  // ── Open content form inside a section (expands the section) ───
  openContentFormForSection(sectionId: string): void {
    this.expandedSections.add(sectionId);
    this.selectedSectionId = sectionId;
    this.contentForm.reset({ type: 'DOCUMENT', orderIndex: 0, sectionId });
    this.showContentForm = true;
  }

  /** Lesson titles shown on collapsed section row (preview). */
  getContentTitlePreview(sectionId: string, max: number = 4): string[] {
    return this.getContentsBySection(sectionId)
      .map((c) => c.title)
      .filter((t) => !!t)
      .slice(0, max);
  }

  getSectionContentTitlePreview(sectionId: string, sectionIndex: number, max: number = 4): string[] {
    return this.getSectionContents(sectionId, sectionIndex)
      .map((c) => c.title)
      .filter((t) => !!t)
      .slice(0, max);
  }

  getRemainingLessonCount(sectionId: string, max: number = 4): number {
    const total = this.getContentsBySection(sectionId).length;
    return Math.max(0, total - max);
  }

  getSectionRemainingLessonCount(sectionId: string, sectionIndex: number, max: number = 4): number {
    const total = this.getSectionContents(sectionId, sectionIndex).length;
    return Math.max(0, total - max);
  }

  openSectionWorkspace(sectionId: string): void {
    this.router.navigate(['/teacher-dashboard/courses', this.courseId, 'sections', sectionId]);
  }

  // ── Utility method to construct full image URLs ──────────────────────
  getFullImageUrl(imagePath: string | null | undefined): string {
    if (!imagePath) {
      console.log('[v0] No image path provided');
      return '';
    }

    // If it's a data URL (base64), return as-is
    if (imagePath.startsWith('data:')) {
      console.log('[v0] Using base64 data URL');
      return imagePath;
    }

    // If it's an http(s) URL, return as-is
    if (imagePath.startsWith('http')) {
      console.log('[v0] Using absolute HTTP URL');
      return imagePath;
    }

    // If it's a relative path starting with /, prepend backend URL
    if (imagePath.startsWith('/')) {
      const fullUrl = `${this.BACKEND_URL}${imagePath}`;
      console.log('[v0] Constructed HTTP URL from relative path');
      return fullUrl;
    }

    // Otherwise treat as relative path and prepend backend URL with /
    const fullUrl = `${this.BACKEND_URL}/${imagePath}`;
    console.log('[v0] Constructed HTTP URL from relative path (no slash)');
    return fullUrl;
  }

  private formatFileSize(bytes: number | null | undefined): string {
    if (!bytes || bytes <= 0) {
      return '';
    }

    const units = ['B', 'KB', 'MB', 'GB'];
    let value = bytes;
    let unitIndex = 0;

    while (value >= 1024 && unitIndex < units.length - 1) {
      value /= 1024;
      unitIndex++;
    }

    return `${value.toFixed(2)} ${units[unitIndex]}`;
  }

  goBack(): void {
    this.router.navigate(['/teacher-dashboard/courses']);
  }
}
