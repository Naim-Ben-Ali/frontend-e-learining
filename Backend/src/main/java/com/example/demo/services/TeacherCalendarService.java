package com.example.demo.services;

import com.example.demo.dtos.TeacherCalendarBulkActionRequest;
import com.example.demo.dtos.TeacherCalendarEventCreateRequest;
import com.example.demo.dtos.TeacherCalendarEventResponse;
import com.example.demo.dtos.TeacherCalendarEventUpdateRequest;

import java.time.Instant;
import java.util.List;

public interface TeacherCalendarService {
    List<TeacherCalendarEventResponse> listEvents(String teacherId, Instant fromUtc, Instant toUtc, String courseId);
    List<TeacherCalendarEventResponse> createEvents(String teacherId, TeacherCalendarEventCreateRequest request);
    TeacherCalendarEventResponse updateEvent(String teacherId, String eventId, TeacherCalendarEventUpdateRequest request);
    void deleteEvent(String teacherId, String eventId);
    TeacherCalendarEventResponse duplicateEvent(String teacherId, String eventId);
    List<TeacherCalendarEventResponse> applyBulkAction(String teacherId, TeacherCalendarBulkActionRequest request);
}
