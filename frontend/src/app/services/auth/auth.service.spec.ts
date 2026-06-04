import {TestBed} from '@angular/core/testing';
import {HttpClientTestingModule} from '@angular/common/http/testing';
import {AuthService} from './auth.service';
import {StorageService} from "../storage/storage.service";

describe('AuthService', () => {
  let service: AuthService;
  let storageService: StorageService;

  beforeEach(() => {
    localStorage.clear();

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule]
    });

    storageService = TestBed.inject(StorageService);
  });

  it('should rebuild authentication state from storage on initialization', () => {
    storageService.setAccessToken(createJwtToken(3600));
    storageService.setRefreshToken('refresh-token');
    storageService.setUserInfo('user-1', 'user@example.com');
    storageService.setUserRoles(['ROLE_TEACHER']);
    storageService.setRequiresRoleSelection(false);

    service = TestBed.inject(AuthService);

    expect(service.isAuthenticated()).toBeTrue();
    expect(service.getAuthResponse()).toEqual(jasmine.objectContaining({
      access_token: jasmine.any(String),
      refresh_token: 'refresh-token',
      user_id: 'user-1',
      email: 'user@example.com',
      roles: ['ROLE_TEACHER'],
      requires_role_selection: false
    }));
  });

  it('should persist empty role lists from OAuth responses', () => {
    service = TestBed.inject(AuthService);

    service.handleOAuth2Response({
      access_token: createJwtToken(3600),
      refresh_token: 'refresh-token',
      user_id: 'oauth-user',
      email: 'oauth@example.com',
      roles: [],
      requires_role_selection: true
    });

    expect(storageService.getUserRoles()).toEqual([]);
    expect(storageService.getRequiresRoleSelection()).toBeTrue();
    expect(service.requiresRoleSelection()).toBeTrue();
  });
});

function createJwtToken(expiresInSeconds: number): string {
  const header = btoa(JSON.stringify({alg: 'HS256', typ: 'JWT'}));
  const payload = btoa(JSON.stringify({exp: Math.floor(Date.now() / 1000) + expiresInSeconds}));
  return `${header}.${payload}.signature`;
}
