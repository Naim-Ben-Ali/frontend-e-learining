package com.example.demo.models;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.SuperBuilder;

import java.time.Instant;

@Entity
@Table(
        name = "teacher_calendar_events",
        indexes = {
                @Index(name = "idx_teacher_calendar_teacher_start", columnList = "teacher_id,start_at_utc"),
                @Index(name = "idx_teacher_calendar_course_start", columnList = "course_id,start_at_utc"),
                @Index(name = "idx_teacher_calendar_series", columnList = "recurrence_group_id")
        }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class TeacherCalendarEvent extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "teacher_id", nullable = false)
    private User teacher;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "course_id", nullable = false)
    private Course course;

    @Enumerated(EnumType.STRING)
    @Column(name = "event_type", nullable = false)
    private CalendarEventType eventType;

    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "meeting_link")
    private String meetingLink;

    @Column(name = "start_at_utc", nullable = false)
    private Instant startAtUtc;

    @Column(name = "end_at_utc", nullable = false)
    private Instant endAtUtc;

    @Column(name = "source_timezone", nullable = false, length = 64)
    private String sourceTimezone;

    @Column(name = "recurrence_group_id", length = 64)
    private String recurrenceGroupId;

    @Column(name = "recurrence_index")
    private Integer recurrenceIndex;

    @Column(name = "is_cancelled", nullable = false)
    private Boolean cancelled;

    @Column(name = "notify_policy", length = 32)
    private String notifyPolicy;

    @Column(name = "metadata_json", columnDefinition = "TEXT")
    private String metadataJson;
}
