package com.example.demo.dtos;

import com.example.demo.models.CalendarEventType;
import lombok.Builder;
import lombok.Getter;

import java.time.Instant;

@Getter
@Builder
public class TeacherCalendarEventResponse {
    private String id;
    private String courseId;
    private String courseTitle;
    private String teacherId;
    private CalendarEventType eventType;
    private String title;
    private String description;
    private String meetingLink;
    private Instant startAtUtc;
    private Instant endAtUtc;
    private String sourceTimezone;
    private String recurrenceGroupId;
    private Integer recurrenceIndex;
    private Boolean cancelled;
    private String notifyPolicy;
    private Integer softConflictCount;
}
