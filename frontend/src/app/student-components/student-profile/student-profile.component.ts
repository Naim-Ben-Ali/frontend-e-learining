import { Component, OnDestroy, OnInit, HostListener } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from "@angular/forms";
import { Subject, takeUntil } from "rxjs";
import { SafeUrl } from '@angular/platform-browser';
import { User } from "../../models/user.model";
import { UserProfileService } from "../../services/user/user-profile.service";
import { UrlValidatorService } from "../../services/security/url-validator.service";
import { FileUploadService } from "../../services/file/file-upload.service";
import { API_CONFIG } from "../../config/api.config";
import { FileUploadResponse } from "../../models/course.model";

@Component({
  selector: 'app-student-profile',
  templateUrl: './student-profile.component.html',
  styleUrls: ['./student-profile.component.css']
})
export class StudentProfileComponent implements OnInit, OnDestroy {
  profile: User | null = null;
  profileForm: FormGroup;
  isLoading = true;
  isSaving = false;
  errorMessage = '';
  successMessage = '';
  validatedProfilePictureUrl: SafeUrl | null = null;
  isUploadingPhoto = false;
  isDragOver = false;

  private readonly destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private userProfileService: UserProfileService,
    private urlValidator: UrlValidatorService,
    private fileUploadService: FileUploadService
  ) {
    this.profileForm = this.fb.group({
      firstName:         ['', [Validators.required, Validators.minLength(2)]],
      lastName:          ['', [Validators.required, Validators.minLength(2)]],
      phoneNumber:       [''],
      dateOfBirth:       [''],
      profilePictureUrl: ['']
    });
  }

  ngOnInit(): void {
    this.loadProfile();
    this.initScrollReveal();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadProfile(): void {
    this.isLoading = true;
    this.userProfileService.getCurrentProfile()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (profile) => {
          this.profile = profile;
          this.profileForm.patchValue({
            firstName:         profile.firstName,
            lastName:          profile.lastName,
            phoneNumber:       profile.phoneNumber       || '',
            dateOfBirth:       profile.dateOfBirth       || '',
            profilePictureUrl: profile.profilePictureUrl || ''
          });
          // Validate and set the profile picture URL safely
          this.validatedProfilePictureUrl = this.urlValidator.validateImageUrl(profile.profilePictureUrl);
          this.isLoading = false;
          this.initScrollReveal();
        },
        error: () => {
          this.errorMessage = 'Unable to load your profile.';
          this.isLoading = false;
        }
      });
  }

  saveProfile(): void {
    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      return;
    }

    // Validate profile picture URL before saving
    const profilePictureUrl = this.profileForm.get('profilePictureUrl')?.value;
    if (profilePictureUrl && !this.urlValidator.isValidUrl(profilePictureUrl)) {
      this.errorMessage = 'Invalid profile picture URL. Please use a valid image URL (http:// or https://).';
      return;
    }

    this.isSaving = true;
    this.errorMessage  = '';
    this.successMessage = '';

    this.userProfileService.updateProfile(this.profileForm.value)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.successMessage = 'Profile updated successfully.';
          this.isSaving = false;
          this.loadProfile();
        },
        error: (error) => {
          this.errorMessage = error?.error?.message || 'Unable to update your profile.';
          this.isSaving = false;
        }
      });
  }

  /**
   * Called when profile picture URL field changes
   * Updates the validated URL for preview
   */
  onProfilePictureUrlChange(): void {
    const url = this.profileForm.get('profilePictureUrl')?.value;
    this.validatedProfilePictureUrl = this.urlValidator.validateImageUrl(url);
  }

  /**
   * Handle file upload for profile photo
   */
  onProfilePhotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.uploadProfilePhoto(input.files[0]);
    }
  }

  /**
   * Handle drag over event
   */
  @HostListener('dragover', ['$event'])
  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = true;
  }

  /**
   * Handle drag leave event
   */
  @HostListener('dragleave', ['$event'])
  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;
  }

  /**
   * Handle drop event for drag-and-drop upload
   */
  @HostListener('drop', ['$event'])
  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;

    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type.startsWith('image/')) {
        this.uploadProfilePhoto(file);
      } else {
        this.errorMessage = 'Please upload an image file (PNG, JPG, GIF, etc.)';
      }
    }
  }

  /**
   * Upload profile photo to server
   */
  private uploadProfilePhoto(file: File): void {
    this.isUploadingPhoto = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.fileUploadService.uploadProfilePicture(file)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: FileUploadResponse) => {
          const pictureUrl =
            response.file_url ||
            (response.file_path ? `${API_CONFIG.SERVER_URL}${response.file_path}` : '');
          this.profileForm.patchValue({ profilePictureUrl: pictureUrl });
          this.validatedProfilePictureUrl = this.urlValidator.validateImageUrl(pictureUrl);
          this.successMessage = 'Profile photo uploaded successfully!';
          this.isUploadingPhoto = false;
          console.log('[v0] Profile photo uploaded:', pictureUrl);
        },
        error: (error) => {
          this.errorMessage = error?.error?.message || 'Failed to upload photo. Please try again.';
          this.isUploadingPhoto = false;
          console.error('[v0] Profile photo upload error:', error);
        }
      });
  }

  private initScrollReveal(): void {
    requestAnimationFrame(() => {
      document.querySelectorAll('.reveal').forEach(el => el.classList.add('in'));
    });
  }
}
