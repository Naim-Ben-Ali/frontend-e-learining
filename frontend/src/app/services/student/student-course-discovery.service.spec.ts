import { TestBed } from '@angular/core/testing';

import { StudentCourseDiscoveryService } from './student-course-discovery.service';

describe('StudentCourseDiscoveryService', () => {
  let service: StudentCourseDiscoveryService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(StudentCourseDiscoveryService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
