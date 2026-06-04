import {TestBed} from '@angular/core/testing';
import {Router} from "@angular/router";
import {Oauth2Service} from './oauth2.service';
import {AuthService} from "../auth/auth.service";

describe('Oauth2Service', () => {
  let service: Oauth2Service;
  let router: jasmine.SpyObj<Router>;
  let authService: jasmine.SpyObj<AuthService>;

  beforeEach(() => {
    router = jasmine.createSpyObj<Router>('Router', ['navigate']);
    authService = jasmine.createSpyObj<AuthService>('AuthService', ['handleOAuth2Response']);

    TestBed.configureTestingModule({
      providers: [
        Oauth2Service,
        {provide: Router, useValue: router},
        {provide: AuthService, useValue: authService}
      ]
    });

    service = TestBed.inject(Oauth2Service);
  });

  afterEach(() => {
    history.pushState({}, '', '/');
  });

  it('should redirect teachers to the teacher dashboard after OAuth callback', () => {
    history.pushState(
      {},
      '',
      '/oauth2/callback?access_token=access&refresh_token=refresh&user_id=user-1&email=user@example.com&requires_role_selection=false&roles=ROLE_TEACHER'
    );

    service.handleOAuth2Callback();

    expect(authService.handleOAuth2Response).toHaveBeenCalledWith(jasmine.objectContaining({
      access_token: 'access',
      refresh_token: 'refresh',
      user_id: 'user-1',
      email: 'user@example.com',
      requires_role_selection: false,
      roles: ['ROLE_TEACHER']
    }));
    expect(router.navigate).toHaveBeenCalledWith(['/teacher-dashboard']);
  });

  it('should redirect users without roles to the role selection page', () => {
    history.pushState(
      {},
      '',
      '/oauth2/callback?access_token=access&refresh_token=refresh&user_id=user-2&email=user2@example.com&requires_role_selection=true&roles='
    );

    service.handleOAuth2Callback();

    expect(authService.handleOAuth2Response).toHaveBeenCalledWith(jasmine.objectContaining({
      requires_role_selection: true,
      roles: []
    }));
    expect(router.navigate).toHaveBeenCalledWith(['/role-selection']);
  });
});
