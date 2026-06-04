package com.example.demo.servicesImpl;

import com.example.demo.dtos.CreateCourseRequest;
import com.example.demo.dtos.CourseContentResponse;
import com.example.demo.dtos.CourseResponse;
import com.example.demo.exceptions.BusinessException;
import com.example.demo.exceptions.ErrorCode;
import com.example.demo.models.Course;
import com.example.demo.models.User;
import com.example.demo.enums.EducationLevel;
import com.example.demo.enums.Section;
import com.example.demo.repositories.CourseRepository;
import com.example.demo.repositories.UserRepository;
import com.example.demo.services.CourseEnrollmentService;
import com.example.demo.services.CourseService;
import com.example.demo.services.SubscriptionKeyService;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class CourseServiceImpl implements CourseService {

    private final CourseRepository courseRepository;
    private final UserRepository userRepository;
    private final CourseEnrollmentService courseEnrollmentService;
    private final SubscriptionKeyService subscriptionKeyService;

    @Override
    public CourseResponse createCourse(final String teacherId, final CreateCourseRequest request) {
        log.info("Creating course for teacher: {}", teacherId);

        final User teacher = this.userRepository.findById(teacherId)
                .orElseThrow(() -> new EntityNotFoundException("Teacher not found"));

        final Course course = Course.builder()
                .title(request.getTitle())
                .description(request.getDescription())
                .coverImageUrl(request.getCoverImageUrl())
                .educationLevel(EducationLevel.valueOf(request.getEducationLevel()))
                .section(request.getSection() != null ? Section.valueOf(request.getSection()) : Section.NONE)
                .specificGrade(request.getSpecificGrade())
                .subject(request.getSubject())
                .isFree(request.getIsFree() != null ? request.getIsFree() : true)
                .price(request.getPrice())
                .teacher(teacher)
                .isActive(true)
                .build();

        final Course savedCourse = this.courseRepository.save(course);
        log.info("Course created successfully with ID: {}", savedCourse.getId());

        if (Boolean.FALSE.equals(savedCourse.getIsFree())) {
            this.subscriptionKeyService.generateKeyForCourse(savedCourse.getId());
            log.info("Subscription key created for new paid course {}", savedCourse.getId());
        }

        return buildCourseResponse(savedCourse, 0L);
    }

    @Override
    public CourseResponse getCourseById(final String courseId, final String teacherId) {
        log.info("Getting course {} for teacher {}", courseId, teacherId);

        final Course course = this.courseRepository.findByIdAndTeacherId(courseId, teacherId)
                .orElseThrow(() -> new BusinessException(ErrorCode.COURSE_NOT_FOUND));

        final long enrollmentCount = this.courseEnrollmentService.getEnrollmentCount(courseId);
        return buildCourseResponse(course, enrollmentCount);
    }

    @Override
    public CourseResponse getCourseDetails(final String courseId) {
        log.info("Getting course details for: {}", courseId);

        final Course course = this.courseRepository.findActiveById(courseId)
                .orElseThrow(() -> new EntityNotFoundException("Course not found"));

        final long enrollmentCount = this.courseEnrollmentService.getEnrollmentCount(courseId);
        return buildCourseResponse(course, enrollmentCount);
    }

    @Override
    public List<CourseResponse> getAllTeacherCourses(final String teacherId) {
        log.info("Getting all courses for teacher: {}", teacherId);

        final List<Course> courses = this.courseRepository.findAllByTeacherId(teacherId);

        return courses.stream()
                .map(course -> {
                    final long enrollmentCount = this.courseEnrollmentService.getEnrollmentCount(course.getId());
                    return buildCourseResponse(course, enrollmentCount);
                })
                .collect(Collectors.toList());
    }

    @Override
    public CourseResponse updateCourse(final String courseId, final String teacherId, final CreateCourseRequest request) {
        log.info("Updating course {} for teacher {}", courseId, teacherId);

        validateTeacherOwnership(courseId, teacherId);

        final Course course = findCourseByIdOrThrow(courseId);
        final boolean wasPaid = Boolean.FALSE.equals(course.getIsFree());

        course.setTitle(request.getTitle());
        course.setDescription(request.getDescription());
        course.setCoverImageUrl(request.getCoverImageUrl());
        course.setEducationLevel(EducationLevel.valueOf(request.getEducationLevel()));
        course.setSection(request.getSection() != null ? Section.valueOf(request.getSection()) : Section.NONE);
        course.setSpecificGrade(request.getSpecificGrade());
        course.setSubject(request.getSubject());
        course.setIsFree(request.getIsFree() != null ? request.getIsFree() : true);
        course.setPrice(request.getPrice());

        final boolean nowPaid = Boolean.FALSE.equals(course.getIsFree());
        final Course updatedCourse = this.courseRepository.save(course);

        if (wasPaid && !nowPaid) {
            this.subscriptionKeyService.deactivateAllKeysForCourse(courseId);
        } else if (!wasPaid && nowPaid) {
            this.subscriptionKeyService.generateKeyForCourse(courseId);
        }

        final long enrollmentCount = this.courseEnrollmentService.getEnrollmentCount(courseId);

        log.info("Course updated successfully: {}", courseId);
        return buildCourseResponse(updatedCourse, enrollmentCount);
    }

    @Override
    @Transactional
    public void deleteCourse(final String courseId, final String teacherId) {
        log.info("Deleting course {} for teacher {}", courseId, teacherId);

        validateTeacherOwnership(courseId, teacherId);

        this.courseRepository.deleteById(courseId);

        log.info("Course deleted {}", courseId);
    }

    @Override
    public Course findCourseByIdOrThrow(final String courseId) {
        return this.courseRepository.findById(courseId)
                .orElseThrow(() -> new EntityNotFoundException("Course not found"));
    }

    @Override
    public void validateTeacherOwnership(final String courseId, final String teacherId) {
        final Course course = findCourseByIdOrThrow(courseId);
        if (!course.getTeacher().getId().equals(teacherId)) {
            throw new BusinessException(ErrorCode.FORBIDDEN_RESOURCE);
        }
    }

    @Override
    public boolean isPaidCourse(final String courseId) {
        final Course course = findCourseByIdOrThrow(courseId);
        return Boolean.FALSE.equals(course.getIsFree());
    }

    private CourseResponse buildCourseResponse(final Course course, final long enrollmentCount) {
        final List<CourseContentResponse> contentResponses = course.getContents()
                .stream()
                .filter(CourseContent -> CourseContent.getIsActive())
                .sorted(Comparator.comparing(content -> content.getOrderIndex() != null ? content.getOrderIndex() : 0))
                .map(content -> CourseContentResponse.builder()
                        .id(content.getId())
                        .title(content.getTitle())
                        .description(content.getDescription())
                        .type(content.getType().name())
                        .contentUrl(content.getContentUrl())
                        .fileSize(content.getFileSize())
                        .fileName(content.getFileName())
                        .orderIndex(content.getOrderIndex())
                        .isActive(content.getIsActive())
                        .createdDate(content.getCreatedDate())
                        .build())
                .collect(Collectors.toList());

        return CourseResponse.builder()
                .id(course.getId())
                .title(course.getTitle())
                .description(course.getDescription())
                .coverImageUrl(course.getCoverImageUrl())
                .educationLevel(course.getEducationLevel().name())
                .section(course.getSection().name())
                .specificGrade(course.getSpecificGrade())
                .subject(course.getSubject())
                .isFree(course.getIsFree())
                .price(course.getPrice())
                .teacherId(course.getTeacher().getId())
                .teacherEmail(course.getTeacher().getEmail())
                .isActive(course.getIsActive())
                .createdDate(course.getCreatedDate())
                .updatedDate(course.getLastModifiedDate())
                .studentCount(enrollmentCount)
                .contentCount(contentResponses.size())
                .contents(contentResponses)
                .build();
    }
}
