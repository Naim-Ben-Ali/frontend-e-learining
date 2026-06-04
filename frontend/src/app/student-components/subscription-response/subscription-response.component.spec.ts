import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SubscriptionResponseComponent } from './subscription-response.component';

describe('SubscriptionResponseComponent', () => {
  let component: SubscriptionResponseComponent;
  let fixture: ComponentFixture<SubscriptionResponseComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [SubscriptionResponseComponent]
    });
    fixture = TestBed.createComponent(SubscriptionResponseComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
