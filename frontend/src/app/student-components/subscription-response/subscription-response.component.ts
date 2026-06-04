import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import {
  SubscriptionRequestResponseDto,
  SubscriptionRequestService
} from '../../services/subscription-key/subscription-request.service';

@Component({
  selector: 'app-subscription-response',
  templateUrl: './subscription-response.component.html',
  styleUrls: ['./subscription-response.component.css']
})
export class SubscriptionResponseComponent implements OnInit, OnDestroy {

  responses: SubscriptionRequestResponseDto[] = [];
  loading = false;
  selectedResponse: SubscriptionRequestResponseDto | null = null;
  copiedKey: string | null = null;
  errorMessage: string | null = null;

  private destroy$ = new Subject<void>();

  constructor(
    private router: Router,
    private subscriptionService: SubscriptionRequestService
  ) {}

  ngOnInit(): void {
    this.loadResponses();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadResponses(): void {
    this.loading = true;
    this.errorMessage = null;

    this.subscriptionService.getStudentResponses()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (responses) => {
          this.responses = responses;
          this.loading = false;
        },
        error: () => {
          this.errorMessage = 'Failed to load teacher responses';
          this.loading = false;
        }
      });
  }

  selectResponse(response: SubscriptionRequestResponseDto): void {
    this.selectedResponse = response;
    this.copiedKey = null;
  }

  closeDetails(): void {
    this.selectedResponse = null;
    this.copiedKey = null;
  }

  copySubscriptionKey(key: string): void {
    navigator.clipboard.writeText(key).then(() => {
      this.copiedKey = key;
      setTimeout(() => {
        this.copiedKey = null;
      }, 2000);
    }).catch(() => {
      alert('Failed to copy key. Please try again.');
    });
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'APPROVED':
        return 'status-approved';
      case 'DENIED':
      case 'BLOCKED':
        return 'status-denied';
      case 'PENDING':
        return 'status-pending';
      default:
        return '';
    }
  }

  getStatusIcon(status: string): string {
    switch (status) {
      case 'APPROVED':
        return 'OK';
      case 'DENIED':
        return 'X';
      case 'BLOCKED':
        return 'B';
      case 'PENDING':
        return '...';
      default:
        return '';
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

  getApprovedResponses(): SubscriptionRequestResponseDto[] {
    return this.responses.filter(r => r.status === 'APPROVED');
  }

  getDeniedResponses(): SubscriptionRequestResponseDto[] {
    return this.responses.filter(r => r.status === 'DENIED');
  }

  getPendingResponses(): SubscriptionRequestResponseDto[] {
    return this.responses.filter(r => r.status === 'PENDING');
  }

  getBlockedResponses(): SubscriptionRequestResponseDto[] {
    return this.responses.filter(r => r.status === 'BLOCKED');
  }

  navigateToCourses(): void {
    this.router.navigate(['/student/courses']);
  }
}
