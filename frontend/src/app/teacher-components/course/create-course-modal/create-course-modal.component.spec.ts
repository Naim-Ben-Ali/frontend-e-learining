import {ComponentFixture, TestBed, fakeAsync, tick} from '@angular/core/testing';
import {ReactiveFormsModule} from "@angular/forms";
import {of} from "rxjs";
import {CreateCourseModalComponent} from './create-course-modal.component';
import {CourseService} from "../../../services/course/course.service";

describe('CreateCourseModalComponent', () => {
  let component: CreateCourseModalComponent;
  let fixture: ComponentFixture<CreateCourseModalComponent>;
  let courseService: jasmine.SpyObj<CourseService>;

  beforeEach(() => {
    courseService = jasmine.createSpyObj<CourseService>('CourseService', [
      'createCourse',
      'uploadCourseImage',
      'updateCourse'
    ]);

    TestBed.configureTestingModule({
      declarations: [CreateCourseModalComponent],
      imports: [ReactiveFormsModule],
      providers: [
        {provide: CourseService, useValue: courseService}
      ]
    });

    fixture = TestBed.createComponent(CreateCourseModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the course before uploading and linking the cover image', fakeAsync(() => {
    const createdCourse = {
      id: 'course-1',
      title: 'Math',
      description: 'Course description',
      cover_image_url: '',
      education_level: 'SECONDARY',
      section: 'MATH',
      specific_grade: 'BAC',
      subject: 'Mathematics',
      is_free: true,
      teacher_id: 'teacher-1',
      teacher_email: 'teacher@example.com',
      is_active: true,
      created_date: '2026-03-31T00:00:00',
      updated_date: '2026-03-31T00:00:00',
      student_count: 0,
      content_count: 0,
      contents: []
    };

    courseService.createCourse.and.returnValue(of(createdCourse));
    courseService.uploadCourseImage.and.returnValue(of({
      file_path: '/uploads/courses/course-1/images/cover.png',
      file_name: 'cover.png',
      file_size: 100
    }));
    courseService.updateCourse.and.returnValue(of({
      ...createdCourse,
      cover_image_url: '/uploads/courses/course-1/images/cover.png'
    }));

    const coverFile = new File(['image'], 'cover.png', {type: 'image/png'});

    component.courseForm.setValue({
      title: 'Math',
      description: 'Course description',
      cover_image_url: '',
      education_level: 'SECONDARY',
      section: 'MATH',
      specific_grade: 'BAC',
      subject: 'Mathematics',
      is_free: true,
      price: null
    });
    component.selectedCoverImageFile = coverFile;

    component.createCourse();
    tick(1000);

    expect(courseService.createCourse).toHaveBeenCalled();
    expect(courseService.uploadCourseImage).toHaveBeenCalledWith('course-1', coverFile);
    expect(courseService.updateCourse).toHaveBeenCalledWith('course-1', jasmine.objectContaining({
      cover_image_url: '/uploads/courses/course-1/images/cover.png'
    }));
  }));
});
