package com.example.demo.controllers;

import com.example.demo.dtos.CourseKeyEnrollmentRequest;
import com.example.demo.dtos.CourseSearchRequest;
import com.example.demo.dtos.EnrollmentResponse;
import com.example.demo.dtos.StudentCourseResponse;
import com.example.demo.dtos.TeacherDirectoryResponse;
import com.example.demo.services.CurrentUserService;
import com.example.demo.services.StudentCourseDiscoveryService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/student")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Student Course Discovery", description = "Student course discovery and enrollment endpoints")
public class StudentCourseDiscoveryController {

    private final StudentCourseDiscoveryService discoveryService;
    private final CurrentUserService currentUserService;

    @PostMapping("/courses/search")
    @Operation(summary = "Search courses with filters")
    public ResponseEntity<Page<StudentCourseResponse>> searchCourses(
            @Valid @RequestBody final CourseSearchRequest request,
            final Authentication authentication) {

        final String studentId = this.currentUserService.getCurrentUserId(authentication);
        log.info("[v0] Student {} searching courses with query: {}", studentId, request.getSearchQuery());

        final Page<StudentCourseResponse> results = this.discoveryService.searchCourses(request, studentId);
        return ResponseEntity.ok(results);
    }

    @GetMapping("/courses")
    @Operation(summary = "Get all available courses")
    public ResponseEntity<Page<StudentCourseResponse>> getAllCourses(
            @RequestParam(defaultValue = "0") final int page,
            @RequestParam(defaultValue = "10") final int pageSize,
            final Authentication authentication) {

        final String studentId = this.currentUserService.getCurrentUserId(authentication);
        log.info("[v0] Student {} fetching all courses - page: {}, size: {}", studentId, page, pageSize);

        final Page<StudentCourseResponse> courses = this.discoveryService.getAllCourses(page, pageSize, studentId);
        return ResponseEntity.ok(courses);
    }

    @GetMapping("/teachers")
    @Operation(summary = "Get teacher directory for student discovery")
    public ResponseEntity<Page<TeacherDirectoryResponse>> getTeachers(
            @RequestParam(defaultValue = "") final String search,
            @RequestParam(defaultValue = "0") final int page,
            @RequestParam(defaultValue = "10") final int pageSize,
            final Authentication authentication) {

        final String studentId = this.currentUserService.getCurrentUserId(authentication);
        return ResponseEntity.ok(this.discoveryService.getTeacherDirectory(studentId, search, page, pageSize));
    }

    @GetMapping("/teachers/{teacherId}")
    @Operation(summary = "Get teacher profile for student discovery")
    public ResponseEntity<TeacherDirectoryResponse> getTeacherProfile(
            @PathVariable final String teacherId,
            final Authentication authentication) {

        final String studentId = this.currentUserService.getCurrentUserId(authentication);
        return ResponseEntity.ok(this.discoveryService.getTeacherProfile(teacherId, studentId));
    }

    @GetMapping("/teachers/{teacherId}/courses")
    @Operation(summary = "Get courses for a teacher profile")
    public ResponseEntity<Page<StudentCourseResponse>> getTeacherCourses(
            @PathVariable final String teacherId,
            @RequestParam(defaultValue = "0") final int page,
            @RequestParam(defaultValue = "10") final int pageSize,
            final Authentication authentication) {

        final String studentId = this.currentUserService.getCurrentUserId(authentication);
        return ResponseEntity.ok(this.discoveryService.getTeacherCourses(teacherId, studentId, page, pageSize));
    }

    @GetMapping("/courses/subject/{subject}")
    @Operation(summary = "Get courses by subject")
    public ResponseEntity<Page<StudentCourseResponse>> getCoursesBySubject(
            @PathVariable final String subject,
            @RequestParam(defaultValue = "0") final int page,
            @RequestParam(defaultValue = "10") final int pageSize,
            final Authentication authentication) {

        final String studentId = this.currentUserService.getCurrentUserId(authentication);
        log.info("[v0] Student {} fetching courses for subject: {}", studentId, subject);

        final Page<StudentCourseResponse> courses = this.discoveryService.getCoursesBySubject(subject, page, pageSize, studentId);
        return ResponseEntity.ok(courses);
    }

    @GetMapping("/courses/{courseId}")
    @Operation(summary = "Get course details")
    public ResponseEntity<StudentCourseResponse> getCourseDetails(
            @PathVariable final String courseId,
            final Authentication authentication) {

        final String studentId = this.currentUserService.getCurrentUserId(authentication);
        log.info("[v0] Student {} viewing course: {}", studentId, courseId);

        final StudentCourseResponse course = this.discoveryService.getCourseForStudent(courseId, studentId);
        return ResponseEntity.ok(course);
    }

    @GetMapping("/enrollments")
    @Operation(summary = "Get student's enrolled courses")
    public ResponseEntity<Page<StudentCourseResponse>> getEnrolledCourses(
            @RequestParam(defaultValue = "0") final int page,
            @RequestParam(defaultValue = "10") final int pageSize,
            final Authentication authentication) {

        final String studentId = this.currentUserService.getCurrentUserId(authentication);
        log.info("[v0] Student {} fetching enrolled courses", studentId);

        final Page<StudentCourseResponse> enrolled = this.discoveryService.getStudentEnrolledCourses(studentId, page, pageSize);
        return ResponseEntity.ok(enrolled);
    }

    @GetMapping("/courses/recommendations")
    @Operation(summary = "Get personalized course recommendations")
    public ResponseEntity<List<StudentCourseResponse>> getRecommendations(
            @RequestParam(defaultValue = "5") final int limit,
            final Authentication authentication) {

        final String studentId = this.currentUserService.getCurrentUserId(authentication);
        log.info("[v0] Student {} fetching recommendations - limit: {}", studentId, limit);

        final List<StudentCourseResponse> recommendations = this.discoveryService.getRecommendedCourses(studentId, limit);
        return ResponseEntity.ok(recommendations);
    }

    @PostMapping("/enrollments/key")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Enroll in course using key")
    public ResponseEntity<EnrollmentResponse> enrollWithKey(
            @Valid @RequestBody final CourseKeyEnrollmentRequest request,
            final Authentication authentication) {

        final String studentId = this.currentUserService.getCurrentUserId(authentication);
        log.info("[v0] Student {} enrolling with course key", studentId);

        this.discoveryService.enrollWithCourseKey(studentId, request.getCourseKey());

        // Return basic enrollment response
        EnrollmentResponse response = EnrollmentResponse.builder()
                .enrollmentId("enrollment_" + System.currentTimeMillis())
                .courseId(request.getCourseKey())
                .build();

        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/filters/subjects")
    @Operation(summary = "Get available subjects for filtering")
    public ResponseEntity<List<String>> getAvailableSubjects() {
        log.info("[v0] Fetching available subjects");
        final List<String> subjects = this.discoveryService.getAvailableSubjects();
        return ResponseEntity.ok(subjects);
    }

    @GetMapping("/filters/education-levels")
    @Operation(summary = "Get available education levels")
    public ResponseEntity<List<String>> getAvailableEducationLevels() {
        log.info("[v0] Fetching available education levels");
        final List<String> levels = this.discoveryService.getAvailableEducationLevels();
        return ResponseEntity.ok(levels);
    }
}
