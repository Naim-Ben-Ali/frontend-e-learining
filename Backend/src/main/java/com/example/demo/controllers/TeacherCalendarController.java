package com.example.demo.controllers;

import com.example.demo.dtos.TeacherCalendarBulkActionRequest;
import com.example.demo.dtos.TeacherCalendarEventCreateRequest;
import com.example.demo.dtos.TeacherCalendarEventResponse;
import com.example.demo.dtos.TeacherCalendarEventUpdateRequest;
import com.example.demo.services.CurrentUserService;
import com.example.demo.services.TeacherCalendarRealtimeService;
import com.example.demo.services.TeacherCalendarService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.time.Instant;
import java.util.List;

@RestController
@RequestMapping("/api/v1/teacher-calendar")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Teacher Calendar", description = "Teacher calendar command center APIs")
@PreAuthorize("hasRole('TEACHER')")
public class TeacherCalendarController {

    private final TeacherCalendarService teacherCalendarService;
    private final TeacherCalendarRealtimeService realtimeService;
    private final CurrentUserService currentUserService;

    @GetMapping("/events")
    @Operation(summary = "List teacher calendar events in a date range")
    public ResponseEntity<List<TeacherCalendarEventResponse>> listEvents(
            Authentication authentication,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant fromUtc,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant toUtc,
            @RequestParam(required = false) String courseId
    ) {
        final String teacherId = this.currentUserService.getCurrentUserId(authentication);
        final List<TeacherCalendarEventResponse> events = this.teacherCalendarService
                .listEvents(teacherId, fromUtc, toUtc, courseId);
        return ResponseEntity.ok(events);
    }

    @PostMapping("/events")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Create teacher calendar event(s), supports recurrence")
    public List<TeacherCalendarEventResponse> createEvents(
            Authentication authentication,
            @RequestBody @Valid TeacherCalendarEventCreateRequest request
    ) {
        final String teacherId = this.currentUserService.getCurrentUserId(authentication);
        return this.teacherCalendarService.createEvents(teacherId, request);
    }

    @PutMapping("/events/{eventId}")
    @Operation(summary = "Update an event (including rescheduling)")
    public TeacherCalendarEventResponse updateEvent(
            Authentication authentication,
            @PathVariable String eventId,
            @RequestBody @Valid TeacherCalendarEventUpdateRequest request
    ) {
        final String teacherId = this.currentUserService.getCurrentUserId(authentication);
        return this.teacherCalendarService.updateEvent(teacherId, eventId, request);
    }

    @DeleteMapping("/events/{eventId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Cancel an event")
    public void deleteEvent(Authentication authentication, @PathVariable String eventId) {
        final String teacherId = this.currentUserService.getCurrentUserId(authentication);
        this.teacherCalendarService.deleteEvent(teacherId, eventId);
    }

    @PostMapping("/events/{eventId}/duplicate")
    @Operation(summary = "Duplicate an event to next week")
    public TeacherCalendarEventResponse duplicateEvent(Authentication authentication, @PathVariable String eventId) {
        final String teacherId = this.currentUserService.getCurrentUserId(authentication);
        return this.teacherCalendarService.duplicateEvent(teacherId, eventId);
    }

    @PostMapping("/events/bulk")
    @Operation(summary = "Apply bulk operation on selected events")
    public List<TeacherCalendarEventResponse> bulkAction(
            Authentication authentication,
            @RequestBody @Valid TeacherCalendarBulkActionRequest request
    ) {
        final String teacherId = this.currentUserService.getCurrentUserId(authentication);
        return this.teacherCalendarService.applyBulkAction(teacherId, request);
    }

    @GetMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    @Operation(summary = "Real-time calendar stream for teacher")
    public SseEmitter stream(Authentication authentication) {
        final String teacherId = this.currentUserService.getCurrentUserId(authentication);
        return this.realtimeService.subscribeTeacher(teacherId);
    }
}
