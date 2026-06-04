import {TestBed} from '@angular/core/testing';
import {HttpClientTestingModule, HttpTestingController} from '@angular/common/http/testing';
import {CourseService} from './course.service';
import {API_CONFIG} from "../../config/api.config";

describe('CourseService', () => {
  let service: CourseService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule]
    });

    service = TestBed.inject(CourseService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should post course content uploads to the harmonized upload endpoint', () => {
    const file = new File(['lesson'], 'lesson.pdf', {type: 'application/pdf'});

    service.uploadFile('course-1', file, 'section-1').subscribe();

    const request = httpMock.expectOne(`${API_CONFIG.BASE_URL}/courses/course-1/upload`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body instanceof FormData).toBeTrue();
    expect(request.request.body.get('file')).toEqual(file);
    expect(request.request.body.get('sectionId')).toBe('section-1');
    request.flush({file_path: '/uploads/path.pdf', file_name: 'lesson.pdf', file_size: 123});
  });

  it('should send cover uploads to the course image endpoint', () => {
    const file = new File(['image'], 'cover.png', {type: 'image/png'});

    service.uploadCoverImage('course-1', file).subscribe();

    const request = httpMock.expectOne(`${API_CONFIG.BASE_URL}/courses/course-1/upload/image`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body.get('file')).toEqual(file);
    request.flush({file_path: '/uploads/courses/course-1/images/cover.png', file_name: 'cover.png', file_size: 321});
  });
});
