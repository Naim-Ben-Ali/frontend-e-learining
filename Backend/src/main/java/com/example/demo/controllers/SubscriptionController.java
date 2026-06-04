package com.example.demo.controllers;

import com.example.demo.dtos.SubscriptionRequestActionRequest;
import com.example.demo.dtos.SubscriptionRequestResponse;
import com.example.demo.dtos.StudentSubscriptionRequest;
import com.example.demo.dtos.SubscriptionKeyResponse;
import com.example.demo.models.SubscriptionKey;
import com.example.demo.models.User;
import com.example.demo.repositories.UserRepository;
import com.example.demo.services.CourseService;
import com.example.demo.services.CurrentUserService;
import com.example.demo.services.StudentSubscriptionService;
import com.example.demo.services.SubscriptionKeyService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import jakarta.persistence.EntityNotFoundException;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/subscriptions")
@RequiredArgsConstructor
@Tag(name = "Subscriptions", description = "Teacher subscription key management and student subscriptions")
public class SubscriptionController {

    private final SubscriptionKeyService subscriptionKeyService;
    private final StudentSubscriptionService studentSubscriptionService;
    private final CurrentUserService currentUserService;
    private final UserRepository userRepository;
    private final CourseService courseService;

    @PostMapping("/courses/{courseId}/key/generate")
    @ResponseStatus(code = HttpStatus.CREATED)
    @Operation(summary = "Generate subscription key for a specific course")
    public ResponseEntity<SubscriptionKeyResponse> generateSubscriptionKeyForCourse(
            @PathVariable final String courseId,
            final Authentication authentication) {

        final SubscriptionKey key = this.subscriptionKeyService.generateKeyForCourse(courseId);

        final SubscriptionKeyResponse response = SubscriptionKeyResponse.builder()
                .id(key.getId())
                .subscriptionKey(key.getSubscriptionKey())
                .active(key.isActive())
                .courseId(key.getCourse().getId())
                .courseName(key.getCourse().getTitle())
                .createdDate(key.getCreatedDate())
                .deactivatedDate(key.getDeactivatedDate())
                .build();

        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/courses/{courseId}/key/active")
    @Operation(summary = "Get active subscription key for a specific course")
    public ResponseEntity<SubscriptionKeyResponse> getActiveCourseKey(
            @PathVariable final String courseId) {

        SubscriptionKey key;
        try {
            key = this.subscriptionKeyService.getActiveKeyByCourseId(courseId);
        } catch (Exception e) {
            if (!this.courseService.isPaidCourse(courseId)) {
                throw new EntityNotFoundException("No subscription key for free courses");
            }
            key = this.subscriptionKeyService.generateKeyForCourse(courseId);
        }

        final SubscriptionKeyResponse response = SubscriptionKeyResponse.builder()
                .id(key.getId())
                .subscriptionKey(key.getSubscriptionKey())
                .active(key.isActive())
                .courseId(key.getCourse().getId())
                .courseName(key.getCourse().getTitle())
                .createdDate(key.getCreatedDate())
                .deactivatedDate(key.getDeactivatedDate())
                .build();

        return ResponseEntity.ok(response);
    }

    @PostMapping("/courses/{courseId}/key/regenerate")
    @Operation(summary = "Regenerate subscription key for a course (deactivates old key and unenrolls students)")
    public ResponseEntity<SubscriptionKeyResponse> regenerateKeyForCourse(
            @PathVariable final String courseId,
            final Authentication authentication) {

        final String teacherId = this.currentUserService.getCurrentUserId(authentication);
        final SubscriptionKey newKey = this.subscriptionKeyService.regenerateKeyForCourse(courseId);

        final SubscriptionKeyResponse response = SubscriptionKeyResponse.builder()
                .id(newKey.getId())
                .subscriptionKey(newKey.getSubscriptionKey())
                .active(newKey.isActive())
                .courseId(newKey.getCourse().getId())
                .courseName(newKey.getCourse().getTitle())
                .createdDate(newKey.getCreatedDate())
                .deactivatedDate(newKey.getDeactivatedDate())
                .build();

        return ResponseEntity.ok(response);
    }

    @GetMapping("/teacher/keys")
    @Operation(summary = "Get all active subscription keys for teacher's courses")
    public ResponseEntity<List<SubscriptionKeyResponse>> getTeacherKeys(
            final Authentication authentication) {

        final String teacherId = this.currentUserService.getCurrentUserId(authentication);
        final List<SubscriptionKey> keys = this.subscriptionKeyService.getActiveKeysForTeacher(teacherId);

        final List<SubscriptionKeyResponse> responses = keys.stream()
                .map(key -> SubscriptionKeyResponse.builder()
                        .id(key.getId())
                        .subscriptionKey(key.getSubscriptionKey())
                        .active(key.isActive())
                        .courseId(key.getCourse().getId())
                        .courseName(key.getCourse().getTitle())
                        .createdDate(key.getCreatedDate())
                        .deactivatedDate(key.getDeactivatedDate())
                        .build())
                .toList();

        return ResponseEntity.ok(responses);
    }

    @PostMapping("/student/subscribe")
    @ResponseStatus(code = HttpStatus.CREATED)
    @Operation(summary = "Subscribe student to teacher using subscription key")
    public ResponseEntity<Map<String, String>> subscribeStudent(
            @RequestBody @Valid final StudentSubscriptionRequest request,
            final Authentication authentication) {

        final String userEmail = authentication.getName();
        final User student = this.userRepository.findByEmailIgnoreCase(userEmail).orElseThrow();

        this.studentSubscriptionService.subscribeStudentWithKey(student.getId(), request.getSubscriptionKey());

        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of(
                "message", "Successfully subscribed to teacher",
                "status", "success"
        ));
    }

    @PostMapping("/requests/teachers/{teacherId}")
    @Operation(summary = "Ask a teacher for subscription approval")
    public ResponseEntity<SubscriptionRequestResponse> requestTeacherSubscription(
            @PathVariable final String teacherId,
            @RequestBody(required = false) final SubscriptionRequestActionRequest request,
            final Authentication authentication) {

        final String studentId = this.currentUserService.getCurrentUserId(authentication);
        final SubscriptionRequestResponse response = this.studentSubscriptionService.requestTeacherSubscription(
                studentId,
                teacherId,
                request != null ? request.getRequestMessage() : null
        );
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/teacher/requests")
    @Operation(summary = "Get teacher subscription requests")
    public ResponseEntity<List<SubscriptionRequestResponse>> getTeacherRequests(final Authentication authentication) {
        final String teacherId = this.currentUserService.getCurrentUserId(authentication);
        return ResponseEntity.ok(this.studentSubscriptionService.getTeacherRequests(teacherId));
    }

    @PostMapping("/teacher/requests/{requestId}/approve")
    @Operation(summary = "Approve a student subscription request")
    public ResponseEntity<SubscriptionRequestResponse> approveRequest(
            @PathVariable final String requestId,
            final Authentication authentication) {

        final String teacherId = this.currentUserService.getCurrentUserId(authentication);
        return ResponseEntity.ok(this.studentSubscriptionService.approveRequest(teacherId, requestId));
    }

    @PostMapping("/teacher/requests/{requestId}/deny")
    @Operation(summary = "Deny a student subscription request")
    public ResponseEntity<SubscriptionRequestResponse> denyRequest(
            @PathVariable final String requestId,
            final Authentication authentication) {

        final String teacherId = this.currentUserService.getCurrentUserId(authentication);
        return ResponseEntity.ok(this.studentSubscriptionService.denyRequest(teacherId, requestId));
    }
}
