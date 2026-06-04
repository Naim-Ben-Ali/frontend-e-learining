import {Component, OnDestroy, OnInit} from '@angular/core';
import {SubscriptionKey, SubscriptionRequest} from "../../models/subscription-key.model";
import {Subject, takeUntil} from "rxjs";
import {SubscriptionKeyService} from "../../services/subscription-key/subscription-key.service";

@Component({
  selector: 'app-subscription-key',
  templateUrl: './subscription-key.component.html',
  styleUrls: ['./subscription-key.component.css']
})
export class SubscriptionKeyComponent implements OnInit, OnDestroy {
  teacherKeys: SubscriptionKey[] = [];
  searchQuery = '';
  loading: boolean = false;
  copied: boolean = false;
  /** Row id that last triggered copy (for per-row feedback) */
  copiedKeyId: string | null = null;
  showConfirmDialog: boolean = false;
  selectedKeyId: string | null = null;
  errorMessage: string = '';
  successMessage: string = '';
  requests: SubscriptionRequest[] = [];

  private destroy$ = new Subject<void>();

  constructor(private subscriptionKeyService: SubscriptionKeyService) {}

  ngOnInit(): void {
    this.loadTeacherKeys();
    this.loadRequests();
    setTimeout(() => this.initReveal(), 100);
  }

  loadRequests(): void {
    this.subscriptionKeyService.getTeacherRequests()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (requests) => this.requests = requests,
        error: () => {}
      });
  }

  private initReveal(): void {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('in');
            observer.unobserve(e.target);
          }
        });
      },
      { threshold: 0.1 }
    );
    document.querySelectorAll('.reveal').forEach((el) => observer.observe(el));
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get filteredKeys(): SubscriptionKey[] {
    const q = this.searchQuery.trim().toLowerCase();
    if (!q) {
      return this.teacherKeys;
    }
    return this.teacherKeys.filter((k) => {
      const name = (k.course_name ?? '').toLowerCase();
      const cid = (k.course_id ?? '').toLowerCase();
      const sk = (k.subscription_key ?? '').toLowerCase();
      const status = k.is_active ? 'active' : 'inactive';
      return (
        name.includes(q) ||
        cid.includes(q) ||
        sk.includes(q) ||
        status.includes(q)
      );
    });
  }

  clearSearch(): void {
    this.searchQuery = '';
  }

  /**
   * Load all subscription keys for the teacher's courses
   */
  loadTeacherKeys(): void {
    this.loading = true;
    this.errorMessage = '';

    console.log('[v0] Loading teacher subscription keys...');

    this.subscriptionKeyService.getTeacherKeys()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (keys: any[]) => {
          console.log('[v0] Successfully loaded subscription keys:', keys);
          this.teacherKeys = keys;
          this.loading = false;
        },
        error: (error: any) => {
          console.error('[v0] Error loading subscription keys - Full error:', {
            error: error,
            message: error?.message,
            status: error?.status,
            statusText: error?.statusText,
            url: error?.url
          });
          this.errorMessage = 'Failed to load subscription keys. Please try again.';
          this.loading = false;
        }
      });
  }

  /**
   * Copy a subscription key to clipboard
   */
  copyKeyToClipboard(key: SubscriptionKey): void {
    if (!key) return;

    navigator.clipboard.writeText(key.subscription_key).then(() => {
      this.copied = true;
      this.copiedKeyId = key.id;
      this.successMessage = `Key for "${key.course_name ?? 'course'}" copied to clipboard!`;

      setTimeout(() => {
        this.copied = false;
        this.copiedKeyId = null;
        this.successMessage = '';
      }, 3000);
    }).catch(() => {
      this.errorMessage = 'Failed to copy key to clipboard';
    });
  }

  isRowCopied(key: SubscriptionKey): boolean {
    return this.copiedKeyId === key.id;
  }

  /**
   * Show confirmation dialog before regenerating key
   */
  showRegenerateConfirmation(keyId: string): void {
    this.selectedKeyId = keyId;
    this.showConfirmDialog = true;
  }

  /**
   * Cancel regenerate operation
   */
  cancelRegenerate(): void {
    this.showConfirmDialog = false;
  }

  /**
   * Confirm and regenerate the subscription key for a course
   * This deactivates the old key and creates a new one
   * All students enrolled with the old key are unenrolled
   */
  confirmRegenerate(): void {
    if (!this.selectedKeyId) return;

    this.showConfirmDialog = false;
    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';

    // Find the course ID for the selected key
    const selectedKey = this.teacherKeys.find(k => k.id === this.selectedKeyId);
    if (!selectedKey) {
      this.errorMessage = 'Key not found';
      this.loading = false;
      return;
    }

    console.log('[v0] Regenerating subscription key for course:', selectedKey.course_id);

    this.subscriptionKeyService.regenerateKeyForCourse(selectedKey.course_id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (newKey: any) => {
          console.log('[v0] Successfully regenerated subscription key:', newKey);
          const courseName = selectedKey.course_name ?? 'course';
          this.successMessage = `Subscription key for "${courseName}" regenerated successfully! Old key is now inactive and previous enrollments have been removed.`;
          this.selectedKeyId = null;
          setTimeout(() => {
            window.location.reload();
          }, 600);
        },
        error: (error: any) => {
          console.error('[v0] Error regenerating subscription key - Full error:', {
            error: error,
            message: error?.message,
            status: error?.status,
            statusText: error?.statusText,
            url: error?.url
          });
          this.errorMessage = 'Failed to regenerate subscription key. Please try again.';
          this.loading = false;
        }
      });
  }

  /**
   * Format the key for display (show first 4 and last 4 characters)
   */
  getMaskedKey(key: SubscriptionKey): string {
    if (!key) return '';
    const keyStr = key.subscription_key ?? '';
    if (!keyStr) return '----';
    if (keyStr.length <= 8) return keyStr;
    return `${keyStr.substring(0, 4)}...${keyStr.substring(keyStr.length - 4)}`;
  }

  /**
   * Format date for display
   */
  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  }

  approveRequest(requestId: string): void {
    this.subscriptionKeyService.approveRequest(requestId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.successMessage = 'Request approved. The student can now enroll in your courses.';
          this.loadRequests();
        },
        error: () => this.errorMessage = 'Unable to approve this request.'
      });
  }

  denyRequest(requestId: string): void {
    this.subscriptionKeyService.denyRequest(requestId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.successMessage = 'Request denied.';
          this.loadRequests();
        },
        error: () => this.errorMessage = 'Unable to deny this request.'
      });
  }
}
