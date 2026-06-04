import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CalendarEventModalComponent } from './calendar-event-modal.component';

describe('CalendarEventModalComponent', () => {
  let component: CalendarEventModalComponent;
  let fixture: ComponentFixture<CalendarEventModalComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [CalendarEventModalComponent]
    });
    fixture = TestBed.createComponent(CalendarEventModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
