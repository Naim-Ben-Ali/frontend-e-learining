import { TestBed } from '@angular/core/testing';

import { SubscriptionRequestService } from './subscription-request.service';

describe('SubscriptionRequestService', () => {
  let service: SubscriptionRequestService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SubscriptionRequestService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
