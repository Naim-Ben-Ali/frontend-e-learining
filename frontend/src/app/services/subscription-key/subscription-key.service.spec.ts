import { TestBed } from '@angular/core/testing';

import { SubscriptionKeyService } from './subscription-key.service';

describe('SubscriptionKeyService', () => {
  let service: SubscriptionKeyService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SubscriptionKeyService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
