import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CourseDiscoveryComponent } from './course-discovery.component';

describe('CourseDiscoveryComponent', () => {
  let component: CourseDiscoveryComponent;
  let fixture: ComponentFixture<CourseDiscoveryComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [CourseDiscoveryComponent]
    });
    fixture = TestBed.createComponent(CourseDiscoveryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
