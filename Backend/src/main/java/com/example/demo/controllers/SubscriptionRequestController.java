package com.example.demo.controllers;

import com.example.demo.dtos.NotificationCountDto;
import com.example.demo.dtos.SubscriptionRequestActionDto;
import com.example.demo.dtos.SubscriptionRequestCreateDto;
import com.example.demo.dtos.SubscriptionRequestResponseDto;
import com.example.demo.services.CurrentUserService;
import com.example.demo.services.SubscriptionRequestService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/subscription-requests")
@RequiredArgsConstructor
@Slf4j
public class SubscriptionRequestController {

    private final SubscriptionRequestService subscriptionRequestService;
    private final CurrentUserService currentUserService;

    /**
     * Student requests a subscription key for a course
     */
    @PostMapping("/request")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<SubscriptionRequestResponseDto> requestSubscriptionKey(
            Authentication authentication,
            @RequestBody SubscriptionRequestCreateDto dto) {

        String studentId = currentUserService.getCurrentUserId(authentication);
        log.info("Processing subscription request from student: {}", studentId);
        SubscriptionRequestResponseDto response = subscriptionRequestService.requestSubscriptionKey(
                studentId,
                dto
        );
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /**
     * Teacher gets all pending subscription requests
     */
    @GetMapping("/teacher/pending")
    @PreAuthorize("hasRole('TEACHER')")
    public ResponseEntity<List<SubscriptionRequestResponseDto>> getTeacherPendingRequests(
            Authentication authentication) {

        String teacherId = currentUserService.getCurrentUserId(authentication);
        log.info("Fetching pending subscription requests for teacher: {}", teacherId);
        List<SubscriptionRequestResponseDto> requests = subscriptionRequestService.getTeacherPendingRequests(
                teacherId
        );
        return ResponseEntity.ok(requests);
    }

    /**
     * Student gets all responses from teachers
     */
    @GetMapping("/student/responses")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<List<SubscriptionRequestResponseDto>> getStudentResponses(
            Authentication authentication) {

        String studentId = currentUserService.getCurrentUserId(authentication);
        log.info("Fetching subscription responses for student: {}", studentId);
        List<SubscriptionRequestResponseDto> responses = subscriptionRequestService.getStudentResponses(
                studentId
        );
        return ResponseEntity.ok(responses);
    }

    /**
     * Teacher responds (approves or denies) to a subscription request
     */
    @PostMapping("/respond")
    @PreAuthorize("hasRole('TEACHER')")
    public ResponseEntity<SubscriptionRequestResponseDto> respondToRequest(
            Authentication authentication,
            @RequestBody SubscriptionRequestActionDto actionDto) {

        String teacherId = currentUserService.getCurrentUserId(authentication);
        log.info("Teacher {} processing subscription request response", teacherId);
        SubscriptionRequestResponseDto response = subscriptionRequestService.respondToRequest(
                teacherId,
                actionDto
        );
        return ResponseEntity.ok(response);
    }

    /**
     * Get notification count for user
     */
    @GetMapping("/notifications/count")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<NotificationCountDto> getNotificationCount(
            Authentication authentication) {

        String userId = currentUserService.getCurrentUserId(authentication);
        String userRole = currentUserService.getCurrentUserRole(authentication);
        log.info("Fetching notification count for user: {} with role: {}", userId, userRole);
        NotificationCountDto count = subscriptionRequestService.getNotificationCount(
                userId, userRole
        );
        return ResponseEntity.ok(count);
    }

}
