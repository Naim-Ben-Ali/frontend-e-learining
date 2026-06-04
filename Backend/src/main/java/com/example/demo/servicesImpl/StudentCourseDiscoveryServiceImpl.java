package com.example.demo.servicesImpl;

import com.example.demo.dtos.CourseSearchRequest;
import com.example.demo.dtos.StudentCourseResponse;
import com.example.demo.dtos.TeacherDirectoryResponse;
import com.example.demo.enums.EducationLevel;
import com.example.demo.enums.Section;
import com.example.demo.exceptions.BusinessException;
import com.example.demo.exceptions.ErrorCode;
import com.example.demo.models.Course;
import com.example.demo.models.CourseEnrollment;
import com.example.demo.models.Role;
import com.example.demo.models.User;
import com.example.demo.repositories.StudentSubscriptionRequestRepository;
import com.example.demo.repositories.StudentTeacherRepository;
import com.example.demo.repositories.CourseEnrollmentRepository;
import com.example.demo.repositories.CourseRepository;
import com.example.demo.repositories.UserRepository;
import com.example.demo.services.StudentCourseDiscoveryService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.ZoneId;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class StudentCourseDiscoveryServiceImpl implements StudentCourseDiscoveryService {

    private final CourseRepository courseRepository;
    private final CourseEnrollmentRepository enrollmentRepository;
    private final StudentTeacherRepository studentTeacherRepository;
    private final StudentSubscriptionRequestRepository requestRepository;
    private final UserRepository userRepository;

    @Override
    @Transactional(readOnly = true)
    public Page<StudentCourseResponse> searchCourses(CourseSearchRequest request, String studentId) {
        log.info("[v0] Searching courses with query: {}", request.getSearchQuery());

        Pageable pageable = PageRequest.of(
                request.getPage() != null ? request.getPage() : 0,
                request.getPageSize() != null ? request.getPageSize() : 10
        );

        List<Course> courses = courseRepository.findAll();

        // Apply filters
        List<Course> filtered = courses.stream()
                .filter(c -> c.getIsActive())
                .filter(c -> matchesSearchQuery(c, request.getSearchQuery()))
                .filter(c -> matchesEducationLevel(c, request.getEducationLevel()))
                .filter(c -> matchesSection(c, request.getSection()))
                .filter(c -> matchesSubject(c, request.getSubject()))
                .filter(c -> matchesGrade(c, request.getSpecificGrade()))
                .filter(c -> matchesPricing(c, request.getIsFree()))
                .collect(Collectors.toList());

        // Get student's enrollment IDs
        Set<String> enrolledCourseIds = enrollmentRepository.findEnrolledCoursesByStudentId(studentId)
                .stream()
                .map(e -> e.getCourse().getId())
                .collect(Collectors.toSet());

        // Sort and convert to DTO
        List<StudentCourseResponse> dtos = filtered.stream()
                .map(course -> buildStudentCourseResponse(course, enrolledCourseIds))
                .collect(Collectors.toList());

        // Apply pagination manually
        int start = (int) pageable.getOffset();
        int end = Math.min(start + pageable.getPageSize(), dtos.size());
        List<StudentCourseResponse> pageContent = dtos.subList(start, end);

        return new PageImpl<>(pageContent, pageable, dtos.size());
    }

    @Override
    @Transactional(readOnly = true)
    public Page<StudentCourseResponse> getAllCourses(int page, int pageSize, String studentId) {
        log.info("[v0] Fetching all courses for student: {}", studentId);

        Pageable pageable = PageRequest.of(page, pageSize);
        Page<Course> coursePage = courseRepository.findByIsActiveTrue(pageable);

        Set<String> enrolledCourseIds = enrollmentRepository.findEnrolledCoursesByStudentId(studentId)
                .stream()
                .map(e -> e.getCourse().getId())
                .collect(Collectors.toSet());

        List<StudentCourseResponse> dtos = coursePage.getContent().stream()
                .map(course -> buildStudentCourseResponse(course, enrolledCourseIds))
                .collect(Collectors.toList());

        return new PageImpl<>(dtos, pageable, coursePage.getTotalElements());
    }

    @Override
    @Transactional(readOnly = true)
    public Page<StudentCourseResponse> getCoursesBySubject(String subject, int page, int pageSize, String studentId) {
        log.info("[v0] Fetching courses for subject: {}", subject);

        Pageable pageable = PageRequest.of(page, pageSize);
        Page<Course> coursePage = courseRepository.findBySubjectAndIsActiveTrue(subject, pageable);

        Set<String> enrolledCourseIds = enrollmentRepository.findEnrolledCoursesByStudentId(studentId)
                .stream()
                .map(e -> e.getCourse().getId())
                .collect(Collectors.toSet());

        List<StudentCourseResponse> dtos = coursePage.getContent().stream()
                .map(course -> buildStudentCourseResponse(course, enrolledCourseIds))
                .collect(Collectors.toList());

        return new PageImpl<>(dtos, pageable, coursePage.getTotalElements());
    }

    @Override
    @Transactional(readOnly = true)
    public StudentCourseResponse getCourseForStudent(String courseId, String studentId) {
        log.info("[v0] Fetching course {} for student {}", courseId, studentId);

        Course course = courseRepository.findById(courseId)
                .orElseThrow(() -> new BusinessException(ErrorCode.COURSE_NOT_FOUND, "Course not found"));

        boolean isEnrolled = enrollmentRepository.existsByStudentIdAndCourseId(studentId, courseId);
        return buildStudentCourseResponse(course, isEnrolled);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<StudentCourseResponse> getStudentEnrolledCourses(String studentId, int page, int pageSize) {
        log.info("[v0] Fetching enrolled courses for student: {}", studentId);

        Pageable pageable = PageRequest.of(page, pageSize);
        Page<CourseEnrollment> enrollments = enrollmentRepository.findByStudentIdAndIsActiveTrueWithCourseAndTeacher(studentId, pageable);

        List<StudentCourseResponse> dtos = enrollments.getContent().stream()
                .map(enrollment -> buildStudentCourseResponse(enrollment.getCourse(), true))
                .collect(Collectors.toList());

        return new PageImpl<>(dtos, pageable, enrollments.getTotalElements());
    }

    @Override
    @Transactional(readOnly = true)
    public List<StudentCourseResponse> getRecommendedCourses(String studentId, int limit) {
        log.info("[v0] Fetching recommended courses for student: {}", studentId);

        // Get student's enrolled courses to find similar ones
        List<CourseEnrollment> enrolledCourses = enrollmentRepository.findEnrolledCoursesByStudentId(studentId);
        Set<String> subjects = enrolledCourses.stream()
                .map(e -> e.getCourse().getSubject())
                .collect(Collectors.toSet());

        // Get all active courses
        List<Course> allCourses = courseRepository.findByIsActiveTrue();

        // Filter: same subject, not yet enrolled, active
        Set<String> enrolledIds = enrolledCourses.stream()
                .map(e -> e.getCourse().getId())
                .collect(Collectors.toSet());

        return allCourses.stream()
                .filter(c -> subjects.contains(c.getSubject()))
                .filter(c -> !enrolledIds.contains(c.getId()))
                .limit(limit)
                .map(course -> buildStudentCourseResponse(course, false))
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public void enrollWithCourseKey(String studentId, String courseKey) {
        log.info("[v0] Enrolling student {} with course key", studentId);

        // For now, courseKey is the courseId
        // In a real system, this would be a separate encryption/verification process
        Course course = courseRepository.findById(courseKey)
                .orElseThrow(() -> new BusinessException(ErrorCode.COURSE_NOT_FOUND, "Invalid course key"));

        User student = userRepository.findById(studentId)
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND, "Student not found"));

        // Only require subscription for paid courses
        if (Boolean.FALSE.equals(course.getIsFree())) {
            if (this.studentTeacherRepository.findActiveSubscription(studentId, course.getTeacher().getId()).isEmpty()) {
                throw new BusinessException(ErrorCode.SUBSCRIPTION_REQUIRED);
            }
        }

        final var existingEnrollment = enrollmentRepository.findByCourseIdAndStudentId(course.getId(), studentId);
        if (existingEnrollment.isPresent() && Boolean.TRUE.equals(existingEnrollment.get().getIsActive())) {
            throw new BusinessException(ErrorCode.COURSE_ALREADY_ENROLLED);
        }

        if (existingEnrollment.isPresent()) {
            final CourseEnrollment enrollment = existingEnrollment.get();
            enrollment.setIsActive(true);
            enrollmentRepository.save(enrollment);
        } else {
            CourseEnrollment enrollment = CourseEnrollment.builder()
                    .course(course)
                    .student(student)
                    .isActive(true)
                    .build();
            enrollmentRepository.save(enrollment);
        }
        log.info("[v0] Student {} enrolled in course {}", studentId, courseKey);
    }

    @Override
    @Transactional(readOnly = true)
    public List<String> getAvailableSubjects() {
        log.info("[v0] Fetching available subjects");
        return courseRepository.findDistinctSubjects();
    }

    @Override
    @Transactional(readOnly = true)
    public List<String> getAvailableEducationLevels() {
        log.info("[v0] Fetching available education levels");
        return List.of(
                EducationLevel.PRIMARY.name(),
                EducationLevel.COLLEGE.name(),
                EducationLevel.SECONDARY.name(),
                EducationLevel.UNIVERSITY.name()
        );
    }

    @Override
    @Transactional(readOnly = true)
    public Page<TeacherDirectoryResponse> getTeacherDirectory(final String studentId, final String searchQuery, final int page, final int pageSize) {
        final Pageable pageable = PageRequest.of(page, pageSize);
        final List<User> teachers = this.userRepository.findAll().stream()
                .filter(user -> user.getRoles() != null)
                .filter(user -> user.getRoles().stream().map(Role::getName).anyMatch("ROLE_TEACHER"::equals))
                .filter(user -> matchesTeacherSearch(user, searchQuery))
                .sorted((left, right) -> left.getFirstName().compareToIgnoreCase(right.getFirstName()))
                .toList();

        final int start = Math.min((int) pageable.getOffset(), teachers.size());
        final int end = Math.min(start + pageable.getPageSize(), teachers.size());
        final List<TeacherDirectoryResponse> content = teachers.subList(start, end).stream()
                .map(teacher -> buildTeacherDirectoryResponse(teacher, studentId))
                .toList();

        return new PageImpl<>(content, pageable, teachers.size());
    }

    @Override
    @Transactional(readOnly = true)
    public TeacherDirectoryResponse getTeacherProfile(final String teacherId, final String studentId) {
        final User teacher = this.userRepository.findById(teacherId)
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));
        return buildTeacherDirectoryResponse(teacher, studentId);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<StudentCourseResponse> getTeacherCourses(final String teacherId, final String studentId, final int page, final int pageSize) {
        final Pageable pageable = PageRequest.of(page, pageSize);
        final Page<Course> coursePage = this.courseRepository.findActiveByTeacherId(teacherId, pageable);

        final Set<String> enrolledCourseIds = this.enrollmentRepository.findEnrolledCoursesByStudentId(studentId)
                .stream()
                .map(enrollment -> enrollment.getCourse().getId())
                .collect(Collectors.toSet());

        final List<StudentCourseResponse> content = coursePage.getContent().stream()
                .map(course -> buildStudentCourseResponse(course, enrolledCourseIds))
                .toList();

        return new PageImpl<>(content, pageable, coursePage.getTotalElements());
    }

    // Helper methods

    private StudentCourseResponse buildStudentCourseResponse(Course course, boolean isEnrolled) {
        long enrollmentCount = enrollmentRepository.countActiveEnrollmentsByCourseId(course.getId());
        
        return StudentCourseResponse.builder()
                .id(course.getId())
                .title(course.getTitle())
                .description(course.getDescription())
                .coverImageUrl(course.getCoverImageUrl())
                .educationLevel(course.getEducationLevel())
                .section(course.getSection())
                .specificGrade(course.getSpecificGrade())
                .subject(course.getSubject())
                .isFree(course.getIsFree())
                .price(course.getPrice())
                .teacherName(course.getTeacher().getFirstName() + " " + course.getTeacher().getLastName())
                .teacherId(course.getTeacher().getId())
                .enrollmentCount(enrollmentCount)
                .isEnrolled(isEnrolled)
                .rating(course.getAvgRating())
                .reviewCount(course.getReviewCount())
                .createdAt(course.getCreatedDate().atZone(ZoneId.systemDefault()).toInstant().toEpochMilli())
                .build();
    }

    private StudentCourseResponse buildStudentCourseResponse(Course course, Set<String> enrolledCourseIds) {
        boolean isEnrolled = enrolledCourseIds.contains(course.getId());
        return buildStudentCourseResponse(course, isEnrolled);
    }

    private TeacherDirectoryResponse buildTeacherDirectoryResponse(final User teacher, final String studentId) {
        return TeacherDirectoryResponse.builder()
                .teacherId(teacher.getId())
                .firstName(teacher.getFirstName())
                .lastName(teacher.getLastName())
                .fullName(teacher.getFullName())
                .email(teacher.getEmail())
                .profilePictureUrl(teacher.getProfilePictureUrl())
                .courseCount(this.courseRepository.countActiveByTeacherId(teacher.getId()))
                .studentCount(this.studentTeacherRepository.countActiveSubscribersByTeacherId(teacher.getId()))
                .subscribed(this.studentTeacherRepository.findActiveSubscription(studentId, teacher.getId()).isPresent())
                .pendingRequest(this.requestRepository.hasPendingRequest(studentId, teacher.getId()))
                .build();
    }

    private boolean matchesTeacherSearch(final User teacher, final String searchQuery) {
        if (searchQuery == null || searchQuery.isBlank()) {
            return true;
        }

        final String normalized = searchQuery.toLowerCase();
        return teacher.getFullName().toLowerCase().contains(normalized)
                || teacher.getEmail().toLowerCase().contains(normalized);
    }

    private boolean matchesSearchQuery(Course course, String query) {
        if (query == null || query.isBlank()) return true;
        String lowerQuery = query.toLowerCase();
        return course.getTitle().toLowerCase().contains(lowerQuery) ||
                course.getDescription().toLowerCase().contains(lowerQuery) ||
                course.getSubject().toLowerCase().contains(lowerQuery);
    }

    private boolean matchesEducationLevel(Course course, EducationLevel level) {
        return level == null || course.getEducationLevel() == level;
    }

    private boolean matchesSection(Course course, Section section) {
        return section == null || course.getSection() == section;
    }

    private boolean matchesSubject(Course course, String subject) {
        return subject == null || course.getSubject().equals(subject);
    }

    private boolean matchesGrade(Course course, String grade) {
        return grade == null || grade.equals(course.getSpecificGrade());
    }

    private boolean matchesPricing(Course course, Boolean isFree) {
        return isFree == null || course.getIsFree().equals(isFree);
    }
}
