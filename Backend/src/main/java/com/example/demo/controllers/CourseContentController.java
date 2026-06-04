package com.example.demo.controllers;

import com.example.demo.dtos.CourseContentRequest;
import com.example.demo.dtos.CourseContentResponse;
import com.example.demo.services.CourseContentService;
import com.example.demo.services.CurrentUserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;
import java.util.List;

@RestController
@RequestMapping("/api/v1/courses/{courseId}/contents")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Course Contents", description = "Course content management endpoints")
public class CourseContentController {

    private final CourseContentService courseContentService;
    private final CurrentUserService currentUserService;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Add content to a course")
    public ResponseEntity<CourseContentResponse> addContent(
            @PathVariable final String courseId,
            @Valid @RequestBody final CourseContentRequest request,
            final Authentication authentication) {

        final String teacherId = this.currentUserService.getCurrentUserId(authentication);

        log.info("Adding content to course: {}", courseId);

        final CourseContentResponse response = this.courseContentService.addContent(courseId, teacherId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping
    @Operation(summary = "Get all contents of a course")
    public ResponseEntity<List<CourseContentResponse>> getCourseContents(
            @PathVariable final String courseId) {

        log.info("Fetching contents for course: {}", courseId);

        final List<CourseContentResponse> contents = this.courseContentService.getCourseContents(courseId);
        return ResponseEntity.ok(contents);
    }

    @GetMapping("/{contentId}")
    @Operation(summary = "Get specific content details")
    public ResponseEntity<CourseContentResponse> getContent(
            @PathVariable final String courseId,
            @PathVariable final String contentId) {

        log.info("Fetching content: {} from course: {}", contentId, courseId);

        final CourseContentResponse content = this.courseContentService.getContent(contentId, courseId);
        return ResponseEntity.ok(content);
    }

    @PutMapping("/{contentId}")
    @Operation(summary = "Update course content")
    public ResponseEntity<CourseContentResponse> updateContent(
            @PathVariable final String courseId,
            @PathVariable final String contentId,
            @Valid @RequestBody final CourseContentRequest request,
            final Authentication authentication) {

        final String teacherId = this.currentUserService.getCurrentUserId(authentication);

        log.info("Updating content: {} in course: {}", contentId, courseId);

        final CourseContentResponse response = this.courseContentService.updateContent(contentId, courseId, teacherId, request);
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{contentId}")
    @Operation(summary = "Delete course content")
    public ResponseEntity<Void> deleteContent(
            @PathVariable final String courseId,
            @PathVariable final String contentId,
            final Authentication authentication) {

        final String teacherId = this.currentUserService.getCurrentUserId(authentication);

        log.info("Deleting content: {} from course: {}", contentId, courseId);

        this.courseContentService.deleteContent(contentId, courseId, teacherId);
        return ResponseEntity.noContent().build();
    }
}
