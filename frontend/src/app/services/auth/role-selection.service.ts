import { Injectable } from '@angular/core';
import {API_CONFIG} from "../../config/api.config";
import {HttpClient} from "@angular/common/http";
import {RoleSelectionRequest} from "../../models/user.model";
import {Observable} from "rxjs";

@Injectable({
  providedIn: 'root'
})
export class RoleSelectionService  {
  private baseUrl = API_CONFIG.BASE_URL;

  constructor(private http: HttpClient) { }

  selectRoles(userId: string, selectedRoles: string[]): Observable<any> {
    const request: RoleSelectionRequest = {
      user_id: userId,
      selected_roles: selectedRoles
    };

    const url = `${this.baseUrl}${API_CONFIG.ENDPOINTS.USERS.SELECT_ROLES}`;
    console.log('RoleSelectionService: Sending request:', {
      url: url,
      method: 'POST',
      body: request
    });

    return this.http.post(url, request);
  }

  isDashboardRoute(roles: string[]): string {
    if (!roles || roles.length === 0) {
      return '/student-dashboard';
    }
    if (roles.includes('ROLE_TEACHER')) {
      return '/teacher-dashboard';
    }
    return '/student-dashboard';
  }
}
