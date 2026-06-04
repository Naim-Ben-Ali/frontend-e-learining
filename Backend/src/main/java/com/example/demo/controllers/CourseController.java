package com.example.demo.controllers;

import com.example.demo.dtos.CreateCourseRequest;
import com.example.demo.dtos.CourseResponse;
import com.example.demo.dtos.FileUploadResponse;
import com.example.demo.services.CourseService;
import com.example.demo.services.CurrentUserService;
import com.example.demo.servicesImpl.FileUploadService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.beans.factory.annotation.Value;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import jakarta.validation.Valid;
import java.util.List;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/courses")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Courses", description = "Course management endpoints")
public class CourseController {

    private final CourseService courseService;
    private final CurrentUserService currentUserService;
    private final FileUploadService fileUploadService;
    @Value("${file.upload.dir:uploads}")
    private String uploadDir;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Create a new course")
    public ResponseEntity<CourseResponse> createCourse(
            @Valid @RequestBody final CreateCourseRequest request,
            final Authentication authentication) {

        final String teacherId = this.currentUserService.getCurrentUserId(authentication);
        final String userEmail = this.currentUserService.getCurrentUserEmail(authentication);

        log.info("Creating course with title: {} for teacher: {}", request.getTitle(), userEmail);

        final CourseResponse response = this.courseService.createCourse(teacherId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping
    @Operation(summary = "Get all courses for the authenticated teacher")
    public ResponseEntity<List<CourseResponse>> getAllTeacherCourses(
            final Authentication authentication) {

        final String teacherId = this.currentUserService.getCurrentUserId(authentication);
        final String userEmail = this.currentUserService.getCurrentUserEmail(authentication);

        log.info("Fetching all courses for teacher: {}", userEmail);

        final List<CourseResponse> courses = this.courseService.getAllTeacherCourses(teacherId);
        return ResponseEntity.ok(courses);
    }

    @GetMapping("/{courseId}")
    @Operation(summary = "Get course details by ID")
    public ResponseEntity<CourseResponse> getCourseById(
            @PathVariable final String courseId,
            final Authentication authentication) {

        final String teacherId = this.currentUserService.getCurrentUserId(authentication);

        log.info("Fetching course: {}", courseId);

        final CourseResponse course = this.courseService.getCourseById(courseId, teacherId);
        return ResponseEntity.ok(course);
    }

    @PutMapping("/{courseId}")
    @Operation(summary = "Update course details")
    public ResponseEntity<CourseResponse> updateCourse(
            @PathVariable final String courseId,
            @Valid @RequestBody final CreateCourseRequest request,
            final Authentication authentication) {

        final String teacherId = this.currentUserService.getCurrentUserId(authentication);

        log.info("Updating course: {}", courseId);

        final CourseResponse response = this.courseService.updateCourse(courseId, teacherId, request);
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{courseId}")
    @Operation(summary = "Delete a course")
    public ResponseEntity<Void> deleteCourse(
            @PathVariable final String courseId,
            final Authentication authentication) {

        final String teacherId = this.currentUserService.getCurrentUserId(authentication);

        log.info("Deleting course: {}", courseId);

        this.courseService.deleteCourse(courseId, teacherId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{courseId}/public")
    @Operation(summary = "Get public course details (accessible to students)")
    public ResponseEntity<CourseResponse> getPublicCourseDetails(
            @PathVariable final String courseId) {

        log.info("Fetching public course details: {}", courseId);

        final CourseResponse course = this.courseService.getCourseDetails(courseId);
        return ResponseEntity.ok(course);
    }

    @PostMapping("/{courseId}/upload/cover")
    @Operation(summary = "Upload course cover image")
    public ResponseEntity<FileUploadResponse> uploadCoverImage(
            @PathVariable final String courseId,
            @RequestParam("file") final MultipartFile file,
            final Authentication authentication) throws Exception {

        final String teacherId = this.currentUserService.getCurrentUserId(authentication);

        log.info("[v0] Starting cover image upload for course: {}", courseId);

        this.courseService.validateTeacherOwnership(courseId, teacherId);
        String filePath = this.fileUploadService.saveCourseImage(file, courseId);

        return ResponseEntity.status(HttpStatus.CREATED).body(FileUploadResponse.builder()
                .filePath(filePath)
                .fileName(file.getOriginalFilename())
                .fileSize(file.getSize())
                .build());
    }

    @GetMapping("/test/uploads-dir")
    @Operation(summary = "Test endpoint to check uploads directory")
    public ResponseEntity<Map<String, Object>> testUploadsDir() {
        java.nio.file.Path uploadPath = java.nio.file.Paths.get(uploadDir).toAbsolutePath();

        Map<String, Object> response = new HashMap<>();
        response.put("fullPath", uploadPath.toString());
        response.put("exists", java.nio.file.Files.exists(uploadPath));

        try {
            response.put("isDirectory", java.nio.file.Files.isDirectory(uploadPath));
            if (java.nio.file.Files.exists(uploadPath)) {
                long fileCount = java.nio.file.Files.list(uploadPath).count();
                response.put("fileCount", fileCount);
            }
        } catch (Exception e) {
            response.put("error", e.getMessage());
        }

        log.info("[v0] Uploads directory test: {}", response);
        return ResponseEntity.ok(response);
    }
}
