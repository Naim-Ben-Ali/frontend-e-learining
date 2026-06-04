package com.example.demo.controllers;

import com.example.demo.dtos.TeacherCalendarEventResponse;
import com.example.demo.models.CourseEnrollment;
import com.example.demo.models.TeacherCalendarEvent;
import com.example.demo.repositories.CourseEnrollmentRepository;
import com.example.demo.repositories.TeacherCalendarEventRepository;
import com.example.demo.services.CurrentUserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.Collections;
import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/student-calendar")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Student Calendar", description = "Student-facing calendar APIs")
@PreAuthorize("hasRole('STUDENT')")
public class StudentCalendarController {

    private final CourseEnrollmentRepository enrollmentRepository;
    private final TeacherCalendarEventRepository eventRepository;
    private final CurrentUserService currentUserService;

    @GetMapping("/events")
    @Operation(summary = "List student-visible calendar events in a date range")
    public ResponseEntity<List<TeacherCalendarEventResponse>> listEvents(
            org.springframework.security.core.Authentication authentication,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant fromUtc,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant toUtc
    ) {
        final String studentId = this.currentUserService.getCurrentUserId(authentication);
        final List<CourseEnrollment> enrollments = this.enrollmentRepository.findEnrolledCoursesByStudentId(studentId);
        if (enrollments == null || enrollments.isEmpty()) {
            return ResponseEntity.ok(Collections.emptyList());
        }
        final List<String> courseIds = enrollments.stream()
                .filter(Objects::nonNull)
                .map(e -> e.getCourse().getId())
                .filter(Objects::nonNull)
                .collect(Collectors.toList());

        final List<TeacherCalendarEvent> events = this.eventRepository.findEventsByCourseIdsInRange(courseIds, fromUtc, toUtc);
        final List<TeacherCalendarEventResponse> responses = events.stream().map(event -> TeacherCalendarEventResponse.builder()
                .id(event.getId())
                .courseId(event.getCourse().getId())
                .courseTitle(event.getCourse().getTitle())
                .teacherId(event.getTeacher().getId())
                .eventType(event.getEventType())
                .title(event.getTitle())
                .description(event.getDescription())
                .meetingLink(event.getMeetingLink())
                .startAtUtc(event.getStartAtUtc())
                .endAtUtc(event.getEndAtUtc())
                .sourceTimezone(event.getSourceTimezone())
                .recurrenceGroupId(event.getRecurrenceGroupId())
                .recurrenceIndex(event.getRecurrenceIndex())
                .cancelled(event.getCancelled())
                .notifyPolicy(event.getNotifyPolicy())
                .softConflictCount(0)
                .build()).collect(Collectors.toList());

        return ResponseEntity.ok(responses);
    }
}
