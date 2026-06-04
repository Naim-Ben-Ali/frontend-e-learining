package com.example.demo.dtos;

import com.example.demo.models.CalendarEventType;
import com.example.demo.models.CalendarRecurrenceType;
import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Getter
@Setter
public class TeacherCalendarEventCreateRequest {

    @NotBlank
    private String courseId;

    @NotNull
    private CalendarEventType eventType;

    @NotBlank
    private String title;

    private String description;

    private String meetingLink;

    @NotBlank
    private String sourceTimezone;

    @NotNull
    @Future
    private LocalDateTime startLocalDateTime;

    @NotNull
    private LocalDateTime endLocalDateTime;

    @NotNull
    private CalendarRecurrenceType recurrenceType = CalendarRecurrenceType.NONE;

    private Integer recurrenceInterval = 1;

    private Integer recurrenceCount = 1;

    private LocalDate recurrenceUntilDate;

    private List<DayOfWeek> weeklyDays;

    private DayOfWeek monthlyWeekday;

    private String notifyPolicy;
}
