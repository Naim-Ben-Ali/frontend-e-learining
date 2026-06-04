import { TestBed } from '@angular/core/testing';

import { Oauth2SessionService } from './oauth2-session.service';

describe('Oauth2SessionService', () => {
  let service: Oauth2SessionService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Oauth2SessionService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
