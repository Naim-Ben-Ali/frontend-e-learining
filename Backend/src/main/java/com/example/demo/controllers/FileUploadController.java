package com.example.demo.controllers;

import com.example.demo.dtos.FileUploadResponse;
import com.example.demo.services.CourseService;
import com.example.demo.services.CurrentUserService;
import com.example.demo.servicesImpl.FileUploadService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;

@RestController
@RequestMapping("/api/v1/courses/{courseId}/upload")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "File Upload", description = "Course file upload endpoints")
public class FileUploadController {

    private final FileUploadService fileUploadService;
    private final CourseService courseService;
    private final CurrentUserService currentUserService;

    @PostMapping
    @Operation(summary = "Upload a file for course content")
    public ResponseEntity<FileUploadResponse> uploadFile(
            @PathVariable final String courseId,
            @RequestParam(required = false) final String sectionId,
            @RequestParam("file") final MultipartFile file,
            final Authentication authentication) throws IOException {

        final String teacherId = this.currentUserService.getCurrentUserId(authentication);

        log.info("Starting file upload: courseId={}, fileName={}, fileSize={} bytes",
                courseId, file.getOriginalFilename(), file.getSize());

        this.courseService.validateTeacherOwnership(courseId, teacherId);

        final String filePath = this.fileUploadService.saveCourseContentFile(file, courseId, sectionId);
        log.info("File saved successfully: {}", filePath);

        return ResponseEntity.status(HttpStatus.CREATED).body(buildResponse(filePath, file));
    }

    @PostMapping("/image")
    @Operation(summary = "Upload a course cover image")
    public ResponseEntity<FileUploadResponse> uploadCourseImage(
            @PathVariable final String courseId,
            @RequestParam("file") final MultipartFile file,
            final Authentication authentication) throws IOException {

        final String teacherId = this.currentUserService.getCurrentUserId(authentication);

        log.info("Starting course image upload: courseId={}, fileName={}, fileSize={} bytes",
                courseId, file.getOriginalFilename(), file.getSize());

        this.courseService.validateTeacherOwnership(courseId, teacherId);

        final String filePath = this.fileUploadService.saveCourseImage(file, courseId);
        log.info("Course image saved successfully: {}", filePath);

        return ResponseEntity.status(HttpStatus.CREATED).body(buildResponse(filePath, file));
    }

    private FileUploadResponse buildResponse(String filePath, MultipartFile file) {
        return FileUploadResponse.builder()
                .filePath(filePath)
                .fileName(file.getOriginalFilename())
                .fileSize(file.getSize())
                .build();
    }
}
