import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { of } from 'rxjs';

import { SubscriptionKeyComponent } from './subscription-key.component';
import { SubscriptionKeyService } from '../../services/subscription-key/subscription-key.service';

describe('SubscriptionKeyComponent', () => {
  let component: SubscriptionKeyComponent;
  let fixture: ComponentFixture<SubscriptionKeyComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [SubscriptionKeyComponent],
      imports: [FormsModule],
      providers: [
        {
          provide: SubscriptionKeyService,
          useValue: {
            getTeacherKeys: () => of([]),
            getTeacherRequests: () => of([]),
            approveRequest: () => of({}),
            denyRequest: () => of({}),
            regenerateKeyForCourse: () => of({})
          }
        }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    });
    fixture = TestBed.createComponent(SubscriptionKeyComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
