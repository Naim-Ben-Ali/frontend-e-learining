import {CanActivateFn, Router} from '@angular/router';
import {Injectable} from "@angular/core";
import {StorageService} from "../../services/storage/storage.service";

@Injectable({
  providedIn: 'root'
})
export class PublicGuardService {
  constructor(
    private router: Router,
    private storageService: StorageService
  ) {}

  canActivate(): boolean {
    const token = this.storageService.getAccessToken();

    if (token && !this.storageService.isTokenExpired(token)) {
      if (this.storageService.getRequiresRoleSelection()) {
        this.router.navigate(['/role-selection']);
        return false;
      }

      const roles = this.storageService.getUserRoles();
      if (roles.includes('ROLE_TEACHER')) {
        this.router.navigate(['/teacher-dashboard']);
      } else if (roles.includes('ROLE_STUDENT')) {
        this.router.navigate(['/student-dashboard']);
      } else {
        this.router.navigate(['/role-selection']);
      }
      return false;
    }

    return true;
  }
}

export const publicGuard: CanActivateFn = (route, state) => {
  const injector = (route as any).injector || (route.component as any).injector;
  const guardService = new PublicGuardService(
    injector.get(Router),
    injector.get(StorageService)
  );
  return guardService.canActivate();
};
