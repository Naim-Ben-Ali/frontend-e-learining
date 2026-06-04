package com.example.demo.servicesImpl;

import com.example.demo.dtos.CourseEnrollmentResponse;
import com.example.demo.exceptions.BusinessException;
import com.example.demo.exceptions.ErrorCode;
import com.example.demo.models.Course;
import com.example.demo.models.CourseEnrollment;
import com.example.demo.models.User;
import com.example.demo.repositories.CourseEnrollmentRepository;
import com.example.demo.repositories.CourseRepository;
import com.example.demo.repositories.StudentSubscriptionRequestRepository;
import com.example.demo.repositories.StudentTeacherRepository;
import com.example.demo.repositories.UserRepository;
import com.example.demo.services.CourseEnrollmentService;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class CourseEnrollmentServiceImpl implements CourseEnrollmentService {

    private final CourseEnrollmentRepository courseEnrollmentRepository;
    private final CourseRepository courseRepository;
    private final StudentTeacherRepository studentTeacherRepository;
    private final UserRepository userRepository;
    private final StudentSubscriptionRequestRepository requestRepository;

    @Override
    public CourseEnrollmentResponse enrollStudentInCourse(final String courseId, final String studentId) {
        log.info("Enrolling student {} in course {}", studentId, courseId);

        validateStudentNotAlreadyEnrolled(courseId, studentId);

        final Course course = this.courseRepository.findActiveById(courseId)
                .orElseThrow(() -> new EntityNotFoundException("Course not found"));

        final User student = this.userRepository.findById(studentId)
                .orElseThrow(() -> new EntityNotFoundException("Student not found"));

        // Only require subscription for paid courses
        if (Boolean.FALSE.equals(course.getIsFree())) {
            if (this.studentTeacherRepository.findActiveSubscription(studentId, course.getTeacher().getId()).isEmpty()) {
                throw new BusinessException(ErrorCode.SUBSCRIPTION_REQUIRED);
            }
        }

        final var existingEnrollment = this.courseEnrollmentRepository.findByCourseIdAndStudentId(courseId, studentId);
        final CourseEnrollment savedEnrollment;
        if (existingEnrollment.isPresent()) {
            final CourseEnrollment enrollment = existingEnrollment.get();
            enrollment.setIsActive(true);
            savedEnrollment = this.courseEnrollmentRepository.save(enrollment);
        } else {
            final CourseEnrollment enrollment = CourseEnrollment.builder()
                    .course(course)
                    .student(student)
                    .isActive(true)
                    .build();
            savedEnrollment = this.courseEnrollmentRepository.save(enrollment);
        }
        log.info("Student enrolled successfully in course: {}", courseId);

        return buildEnrollmentResponse(savedEnrollment);
    }

    @Override
    public void removeStudentFromCourse(final String enrollmentId, final String courseId, final String teacherId) {
        log.info("Removing student from course {} by teacher {}", courseId, teacherId);

        validateTeacherOwnershipOfCourse(courseId, teacherId);

        final CourseEnrollment enrollment = this.courseEnrollmentRepository.findById(enrollmentId)
                .orElseThrow(() -> new EntityNotFoundException("Enrollment not found"));

        if (!enrollment.getCourse().getId().equals(courseId)) {
            throw new BusinessException(ErrorCode.FORBIDDEN_RESOURCE);
        }

        enrollment.setIsActive(false);
        this.courseEnrollmentRepository.save(enrollment);

        // Force a new approval cycle if this student wants to rejoin the same course.
        this.studentTeacherRepository.deactivateActiveByStudentAndTeacher(
                enrollment.getStudent().getId(),
                enrollment.getCourse().getTeacher().getId()
        );
        this.requestRepository.revokeApprovedRequestsByStudentAndCourse(
                enrollment.getStudent().getId(),
                enrollment.getCourse().getId()
        );

        log.info("Student removed from course (soft delete): {}", courseId);
    }

    @Override
    public List<CourseEnrollmentResponse> getCourseEnrollments(final String courseId, final String teacherId) {
        log.info("Getting enrollments for course {} by teacher {}", courseId, teacherId);

        validateTeacherOwnershipOfCourse(courseId, teacherId);

        final List<CourseEnrollment> enrollments = this.courseEnrollmentRepository.findByCourseId(courseId);

        return enrollments.stream()
                .map(this::buildEnrollmentResponse)
                .collect(Collectors.toList());
    }

    @Override
    public List<CourseEnrollmentResponse> getStudentEnrolledCourses(final String studentId) {
        log.info("Getting enrolled courses for student: {}", studentId);

        final List<CourseEnrollment> enrollments = this.courseEnrollmentRepository.findEnrolledCoursesByStudentId(studentId);

        return enrollments.stream()
                .map(this::buildEnrollmentResponse)
                .collect(Collectors.toList());
    }

    @Override
    public long getEnrollmentCount(final String courseId) {
        return this.courseEnrollmentRepository.countActiveEnrollmentsByCourseId(courseId);
    }

    @Override
    public void validateStudentNotAlreadyEnrolled(final String courseId, final String studentId) {
        final var existingEnrollment = this.courseEnrollmentRepository.findByCourseIdAndStudentId(courseId, studentId);

        if (existingEnrollment.isPresent() && existingEnrollment.get().getIsActive()) {
            throw new BusinessException(ErrorCode.COURSE_ALREADY_ENROLLED);
        }
    }

    @Override
    public void validateTeacherOwnershipOfCourse(final String courseId, final String teacherId) {
        this.courseRepository.findByIdAndTeacherId(courseId, teacherId)
                .orElseThrow(() -> new BusinessException(ErrorCode.FORBIDDEN_RESOURCE));
    }

    private CourseEnrollmentResponse buildEnrollmentResponse(final CourseEnrollment enrollment) {
        return CourseEnrollmentResponse.builder()
                .id(enrollment.getId())
                .courseId(enrollment.getCourse().getId())
                .studentId(enrollment.getStudent().getId())
                .studentEmail(enrollment.getStudent().getEmail())
                .studentName(enrollment.getStudent().getFullName())
                .isActive(enrollment.getIsActive())
                .enrolledDate(enrollment.getCreatedDate())
                .build();
    }
}
