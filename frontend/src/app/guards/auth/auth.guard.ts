import {CanActivateFn, Router} from '@angular/router';
import {Injectable} from "@angular/core";
import {StorageService} from "../../services/storage/storage.service";
import {AuthService} from "../../services/auth/auth.service";

@Injectable({
  providedIn: 'root'
})
export class AuthGuardService {
  constructor(
    private authService: AuthService,
    private router: Router,
    private storageService: StorageService
  ) {}

  canActivate(): boolean {
    const accessToken = this.storageService.getAccessToken();
    const refreshToken = this.storageService.getRefreshToken();
    const hasValidAccessToken = !!accessToken && !this.storageService.isTokenExpired(accessToken);
    const hasValidRefreshToken = !!refreshToken && !this.storageService.isTokenExpired(refreshToken);

    if (hasValidAccessToken || hasValidRefreshToken) {
      return true;
    }

    this.storageService.clearTokens();
    this.router.navigate(['/login']);
    return false;
  }
}
export const authGuard: CanActivateFn = (route, state) => {
  const injector = (route as any).injector || (route.component as any).injector;
  const guardService = new AuthGuardService(
    injector.get(AuthService),
    injector.get(Router),
    injector.get(StorageService)
  );
  return guardService.canActivate();
};
