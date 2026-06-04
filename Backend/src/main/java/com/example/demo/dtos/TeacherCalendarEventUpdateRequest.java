package com.example.demo.dtos;

import com.example.demo.models.CalendarEventType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
public class TeacherCalendarEventUpdateRequest {

    @NotBlank
    private String title;

    private String description;

    private String meetingLink;

    @NotNull
    private CalendarEventType eventType;

    @NotBlank
    private String sourceTimezone;

    @NotNull
    private LocalDateTime startLocalDateTime;

    @NotNull
    private LocalDateTime endLocalDateTime;

    private String notifyPolicy;

    private boolean notifyStudentsNow;
}
