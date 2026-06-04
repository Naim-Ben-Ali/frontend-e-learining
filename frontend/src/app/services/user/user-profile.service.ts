import { Injectable } from '@angular/core';
import { HttpClient } from "@angular/common/http";
import { map, Observable, tap } from "rxjs";
import { API_CONFIG } from "../../config/api.config";
import { ProfileUpdateRequest, User } from "../../models/user.model";
import { StorageService } from "../storage/storage.service";

@Injectable({
  providedIn: 'root'
})
export class UserProfileService {
  private readonly baseUrl = `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.USERS.PROFILE}`;

  constructor(
    private http: HttpClient,
    private storageService: StorageService
  ) {}

  getCurrentProfile(): Observable<User> {
    return this.http.get<any>(this.baseUrl).pipe(
      map((profile) => ({
        id: profile.id,
        email: profile.email,
        firstName: profile.first_name,
        lastName: profile.last_name,
        phoneNumber: profile.phone_number,
        dateOfBirth: profile.date_of_birth,
        profilePictureUrl: profile.profile_picture_url,
        enabled: profile.enabled,
        hasSelectedRole: profile.has_selected_role,
        roles: profile.roles || [],
        createdDate: profile.created_date
      })),
      tap((profile) => {
        this.storageService.setUserInfo(
          profile.id,
          profile.email,
          profile.firstName,
          profile.lastName,
          profile.profilePictureUrl || ''
        );
        this.storageService.setUserRoles(profile.roles || []);
      })
    );
  }

  updateProfile(request: ProfileUpdateRequest): Observable<void> {
    return this.http.patch<void>(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.USERS.UPDATE_PROFILE}`, request);
  }
}
