import { TestBed } from '@angular/core/testing';

import { TeacherCalendarService } from './teacher-calendar.service';

describe('TeacherCalendarService', () => {
  let service: TeacherCalendarService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TeacherCalendarService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
