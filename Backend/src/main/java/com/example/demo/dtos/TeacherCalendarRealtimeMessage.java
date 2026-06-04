package com.example.demo.dtos;

import lombok.Builder;
import lombok.Getter;

import java.time.Instant;
import java.util.List;

@Getter
@Builder
public class TeacherCalendarRealtimeMessage {
    private String type;
    private String teacherId;
    private String courseId;
    private List<String> eventIds;
    private String message;
    private Instant timestamp;
}
