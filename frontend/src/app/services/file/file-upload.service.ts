import { Injectable } from '@angular/core';
import {API_CONFIG} from "../../config/api.config";
import {HttpClient} from "@angular/common/http";
import {Observable} from "rxjs";
import {FileUploadResponse} from "../../models/course.model";

@Injectable({
  providedIn: 'root'
})
export class FileUploadService {
  private baseUrl = API_CONFIG.BASE_URL;

  constructor(private http: HttpClient) { }

  /**
   * Upload a profile picture for user
   * @param file The image file to upload
   * @returns Observable with file upload response containing the file URL
   */
  uploadProfilePicture(file: File): Observable<FileUploadResponse> {
    const formData = new FormData();
    formData.append('file', file);

    return this.http.post<FileUploadResponse>(
      `${this.baseUrl}/files/profile-picture`,
      formData
    );
  }
}
