package com.example.demo.controllers;

import com.example.demo.dtos.CourseSectionRequest;
import com.example.demo.dtos.CourseSectionResponse;
import com.example.demo.services.CourseSectionService;
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
@RequestMapping("/api/v1/courses/{courseId}/sections")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Course Sections", description = "Course section management endpoints")
public class CourseSectionController {

    private final CourseSectionService sectionService;
    private final CurrentUserService currentUserService;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Create a new section in a course")
    public ResponseEntity<CourseSectionResponse> createSection(
            @PathVariable final String courseId,
            @Valid @RequestBody final CourseSectionRequest request,
            final Authentication authentication) {

        final String teacherId = this.currentUserService.getCurrentUserId(authentication);

        log.info("Creating section in course: {}", courseId);

        final CourseSectionResponse response = this.sectionService.createSection(courseId, teacherId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping
    @Operation(summary = "Get all sections in a course")
    public ResponseEntity<List<CourseSectionResponse>> getAllSections(
            @PathVariable final String courseId,
            final Authentication authentication) {

        final String teacherId = this.currentUserService.getCurrentUserId(authentication);

        log.info("Fetching sections for course: {}", courseId);

        final List<CourseSectionResponse> sections = this.sectionService.getAllSectionsByCourse(courseId, teacherId);
        return ResponseEntity.ok(sections);
    }

    @GetMapping("/public")
    @Operation(summary = "Get all active sections in a course (public access)")
    public ResponseEntity<List<CourseSectionResponse>> getPublicSections(
            @PathVariable final String courseId) {

        log.info("Fetching public sections for course: {}", courseId);

        final List<CourseSectionResponse> sections = this.sectionService.getPublicSectionsByCourse(courseId);
        return ResponseEntity.ok(sections);
    }

    @GetMapping("/{sectionId}")
    @Operation(summary = "Get section details by ID")
    public ResponseEntity<CourseSectionResponse> getSection(
            @PathVariable final String courseId,
            @PathVariable final String sectionId,
            final Authentication authentication) {

        final String teacherId = this.currentUserService.getCurrentUserId(authentication);

        log.info("Fetching section: {}", sectionId);

        final CourseSectionResponse section = this.sectionService.getSectionById(sectionId, courseId, teacherId);
        return ResponseEntity.ok(section);
    }

    @PutMapping("/{sectionId}")
    @Operation(summary = "Update section details")
    public ResponseEntity<CourseSectionResponse> updateSection(
            @PathVariable final String courseId,
            @PathVariable final String sectionId,
            @Valid @RequestBody final CourseSectionRequest request,
            final Authentication authentication) {

        final String teacherId = this.currentUserService.getCurrentUserId(authentication);

        log.info("Updating section: {}", sectionId);

        final CourseSectionResponse response = this.sectionService.updateSection(sectionId, courseId, teacherId, request);
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{sectionId}")
    @Operation(summary = "Delete a section")
    public ResponseEntity<Void> deleteSection(
            @PathVariable final String courseId,
            @PathVariable final String sectionId,
            final Authentication authentication) {

        final String teacherId = this.currentUserService.getCurrentUserId(authentication);

        log.info("Deleting section: {}", sectionId);

        this.sectionService.deleteSection(sectionId, courseId, teacherId);
        return ResponseEntity.noContent().build();
    }
}
