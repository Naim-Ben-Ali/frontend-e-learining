import {Component, OnInit} from '@angular/core';
import {Router} from "@angular/router";
import {AuthService} from "../../services/auth/auth.service";
import {StorageService} from "../../services/storage/storage.service";
import {RoleSelectionService} from "../../services/auth/role-selection.service";

@Component({
  selector: 'app-role-selection',
  templateUrl: './role-selection.component.html',
  styleUrls: ['./role-selection.component.css']
})
export class RoleSelectionComponent  implements OnInit {
  isLoading = false;
  errorMessage = '';
  selectedRole: string = '';
  userId: string = '';
  userEmail: string = '';

  constructor(
    private router: Router,
    private authService: AuthService,
    private roleSelectionService: RoleSelectionService,
    private storageService: StorageService
  ) {}

  ngOnInit(): void {
    const token = this.storageService.getAccessToken();
    const authResponse = this.authService.getAuthResponse();
    const requiresRoleSelection =
      authResponse?.requires_role_selection ?? this.storageService.getRequiresRoleSelection();

    const userIdFromAuth = authResponse?.user_id;
    const userIdFromStorage = this.storageService.getUserId();
    const userEmailFromStorage = this.storageService.getUserEmail();

    console.log('RoleSelection ngOnInit:', {
      hasToken: !!token,
      tokenLength: token ? token.length : 0,
      hasAuthResponse: !!authResponse,
      requiresRoleSelection,
      userIdFromAuth,
      userIdFromStorage,
      userEmailFromStorage
    });

    if (!requiresRoleSelection) {
      console.log('RoleSelection - User already has role selected, redirecting to dashboard');
      this.router.navigate([this.roleSelectionService.isDashboardRoute(this.storageService.getUserRoles())]);
      return;
    }

    this.userId = userIdFromStorage || userIdFromAuth || '';
    this.userEmail = userEmailFromStorage || authResponse?.email || '';

    console.log('[v0] RoleSelection - Using userId:', this.userId, 'email:', this.userEmail);

    if (!this.userId) {
      this.errorMessage = 'User information not found. Please login again.';
      console.error('[v0] RoleSelection - No user ID found in auth response or storage');
      setTimeout(() => this.router.navigate(['/login']), 2000);
    }
  }

  selectRole(role: string): void {
    this.selectedRole = this.selectedRole === role ? '' : role;
  }

  isRoleSelected(role: string): boolean {
    return this.selectedRole === role;
  }

  get canSubmit(): boolean {
    return this.selectedRole !== '' && !this.isLoading;
  }

  submitRoleSelection(): void {
    if (!this.canSubmit || !this.userId) {
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    const selectedRolesArray = [this.selectedRole];
    const token = this.storageService.getAccessToken();

    console.log('Submitting role selection:', {
      userId: this.userId,
      roles: selectedRolesArray,
      hasToken: !!token,
      tokenLength: token ? token.length : 0
    });

    this.roleSelectionService.selectRoles(this.userId, selectedRolesArray).subscribe({
      next: (response) => {
        console.log('Role selection successful:', response);
        this.storageService.setUserRoles(selectedRolesArray);
        this.storageService.setRequiresRoleSelection(false);
        const dashboardRoute = this.roleSelectionService.isDashboardRoute(selectedRolesArray);
        console.log('Redirecting to:', dashboardRoute);
        this.isLoading = false;
        this.router.navigate([dashboardRoute]);
      },
      error: (error) => {
        this.isLoading = false;
        console.error('Role selection error - Full error object:', {
          status: error.status,
          statusText: error.statusText,
          url: error.url,
          message: error.message,
          errorBody: error.error
        });

        // Handle different error scenarios
        if (error.status === 401 || error.status === 403) {
          console.error('Unauthorized (401/403) - token invalid, expired, or user not authenticated');
          this.errorMessage = 'Your session has expired. Please login again.';
          setTimeout(() => this.router.navigate(['/login']), 2000);
        } else if (error.status === 404) {
          console.error('Not found (404) - User not found on backend');
          this.errorMessage = 'User not found. Please login again.';
          setTimeout(() => this.router.navigate(['/login']), 2000);
        } else if (error.status === 0) {
          console.error('Network error - backend unreachable');
          this.errorMessage = 'Unable to reach the server. Please check your connection and try again.';
        } else if (error.status === 200 && error.statusText === 'Unknown Error') {
          console.error('Unexpected response format - possible CORS or routing issue');
          this.errorMessage = 'Server error. Please try again.';
        } else {
          console.error('Unexpected error:', error.status);
          this.errorMessage = error.error?.message || 'Failed to select role. Please try again.';
        }
      }
    });
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
