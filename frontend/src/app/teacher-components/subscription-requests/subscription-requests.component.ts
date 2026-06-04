import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import {
  SubscriptionRequestActionDto,
  SubscriptionRequestResponseDto,
  SubscriptionRequestService
} from "../../services/subscription-key/subscription-request.service";

@Component({
  selector: 'app-subscription-requests',
  templateUrl: './subscription-requests.component.html',
  styleUrls: ['./subscription-requests.component.css']
})
export class SubscriptionRequestsComponent implements OnInit, OnDestroy {

  requests: SubscriptionRequestResponseDto[] = [];
  loading = false;
  selectedRequest: SubscriptionRequestResponseDto | null = null;
  actionInProgress = false;
  errorMessage: string | null = null;
  successMessage: string | null = null;

  // New properties for Template Counts
  pendingCount = 0;
  approvedCount = 0;
  deniedCount = 0;
  blockedCount = 0;

  private destroy$ = new Subject<void>();

  constructor(private subscriptionService: SubscriptionRequestService) {}

  ngOnInit(): void {
    this.loadPendingRequests();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Updates the KPI counters based on current requests array
   */
  private calculateCounts(): void {
    this.pendingCount = this.requests.filter(r => r.status === 'PENDING').length;
    this.approvedCount = this.requests.filter(r => r.status === 'APPROVED').length;
    this.deniedCount = this.requests.filter(r => r.status === 'DENIED').length;
    this.blockedCount = this.requests.filter(r => r.status === 'BLOCKED').length;
  }

  loadPendingRequests(): void {
    this.loading = true;
    this.errorMessage = null;

    this.subscriptionService.getTeacherPendingRequests()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (requests) => {
          this.requests = requests;
          this.calculateCounts(); // Update counts for the template
          this.loading = false;
        },
        error: (err) => {
          this.errorMessage = 'Failed to load subscription requests';
          this.loading = false;
        }
      });
  }

  selectRequest(request: SubscriptionRequestResponseDto): void {
    this.selectedRequest = request;
  }

  closeDetails(): void {
    this.selectedRequest = null;
    this.errorMessage = null;
    this.successMessage = null;
  }

  approveRequest(request: SubscriptionRequestResponseDto): void {
    if (confirm(`Approve subscription request from ${request.studentName}?`)) {
      this.actionInProgress = true;
      const action: SubscriptionRequestActionDto = {
        requestId: request.id,
        action: 'APPROVED'
      };

      this.subscriptionService.respondToRequest(action)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.successMessage = `Subscription key approved for ${request.studentName}`;
            this.actionInProgress = false;
            this.selectedRequest = null;
            this.loadPendingRequests();
            setTimeout(() => this.successMessage = null, 3000);
          },
          error: () => {
            this.errorMessage = 'Failed to approve request';
            this.actionInProgress = false;
          }
        });
    }
  }

  denyRequest(request: SubscriptionRequestResponseDto): void {
    if (confirm(`Deny subscription request from ${request.studentName}?`)) {
      this.actionInProgress = true;
      const action: SubscriptionRequestActionDto = {
        requestId: request.id,
        action: 'DENIED'
      };

      this.subscriptionService.respondToRequest(action)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.successMessage = `Subscription request denied for ${request.studentName}`;
            this.actionInProgress = false;
            this.selectedRequest = null;
            this.loadPendingRequests();
            setTimeout(() => this.successMessage = null, 3000);
          },
          error: () => {
            this.errorMessage = 'Failed to deny request';
            this.actionInProgress = false;
          }
        });
    }
  }

  blockRequest(request: SubscriptionRequestResponseDto): void {
    if (confirm(`Block ${request.studentName} from requesting this course again?`)) {
      this.actionInProgress = true;
      const action: SubscriptionRequestActionDto = {
        requestId: request.id,
        action: 'BLOCKED'
      };

      this.subscriptionService.respondToRequest(action)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.successMessage = `${request.studentName} is now blocked for ${request.courseName}`;
            this.actionInProgress = false;
            this.selectedRequest = null;
            this.loadPendingRequests();
            setTimeout(() => this.successMessage = null, 3000);
          },
          error: () => {
            this.errorMessage = 'Failed to block student for this course';
            this.actionInProgress = false;
          }
        });
    }
  }

  getTimeAgo(date: string): string {
    const now = new Date();
    const createdDate = new Date(date);
    const diffMs = now.getTime() - createdDate.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  }
}
