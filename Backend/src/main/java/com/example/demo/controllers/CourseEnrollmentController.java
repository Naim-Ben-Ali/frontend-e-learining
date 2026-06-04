package com.example.demo.controllers;

import com.example.demo.dtos.CourseEnrollmentResponse;
import com.example.demo.services.CourseEnrollmentService;
import com.example.demo.services.CurrentUserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Course Enrollments", description = "Course enrollment management endpoints")
public class CourseEnrollmentController {

    private final CourseEnrollmentService courseEnrollmentService;
    private final CurrentUserService currentUserService;

    @PostMapping("/api/v1/courses/{courseId}/enroll")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Enroll student in a course using subscription key")
    public ResponseEntity<CourseEnrollmentResponse> enrollInCourse(
            @PathVariable final String courseId,
            final Authentication authentication) {

        final String studentId = this.currentUserService.getCurrentUserId(authentication);
        final String userEmail = this.currentUserService.getCurrentUserEmail(authentication);

        log.info("Student {} enrolling in course: {}", userEmail, courseId);

        final CourseEnrollmentResponse response = this.courseEnrollmentService.enrollStudentInCourse(courseId, studentId);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @DeleteMapping("/api/v1/courses/{courseId}/enrollments/{enrollmentId}")
    @Operation(summary = "Remove student from course (teacher only)")
    public ResponseEntity<Void> removeStudentFromCourse(
            @PathVariable final String courseId,
            @PathVariable final String enrollmentId,
            final Authentication authentication) {

        final String teacherId = this.currentUserService.getCurrentUserId(authentication);
        final String userEmail = this.currentUserService.getCurrentUserEmail(authentication);

        log.info("Removing student from course: {} by teacher: {}", courseId, userEmail);

        this.courseEnrollmentService.removeStudentFromCourse(enrollmentId, courseId, teacherId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/api/v1/courses/{courseId}/enrollments")
    @Operation(summary = "Get all enrollments for a course (teacher only)")
    public ResponseEntity<List<CourseEnrollmentResponse>> getCourseEnrollments(
            @PathVariable final String courseId,
            final Authentication authentication) {

        final String teacherId = this.currentUserService.getCurrentUserId(authentication);
        final String userEmail = this.currentUserService.getCurrentUserEmail(authentication);

        log.info("Fetching enrollments for course: {} by teacher: {}", courseId, userEmail);

        final List<CourseEnrollmentResponse> enrollments = this.courseEnrollmentService.getCourseEnrollments(courseId, teacherId);
        return ResponseEntity.ok(enrollments);
    }

    @GetMapping("/api/v1/students/enrolled-courses")
    @Operation(summary = "Get all courses enrolled by the student")
    public ResponseEntity<List<CourseEnrollmentResponse>> getStudentEnrolledCourses(
            final Authentication authentication) {

        final String studentId = this.currentUserService.getCurrentUserId(authentication);
        final String userEmail = this.currentUserService.getCurrentUserEmail(authentication);

        log.info("Fetching enrolled courses for student: {}", userEmail);

        final List<CourseEnrollmentResponse> enrollments = this.courseEnrollmentService.getStudentEnrolledCourses(studentId);
        return ResponseEntity.ok(enrollments);
    }
}
