package com.example.demo.servicesImpl;

import com.example.demo.dtos.TeacherCalendarBulkActionRequest;
import com.example.demo.dtos.TeacherCalendarEventCreateRequest;
import com.example.demo.dtos.TeacherCalendarEventResponse;
import com.example.demo.dtos.TeacherCalendarEventUpdateRequest;
import com.example.demo.dtos.TeacherCalendarRealtimeMessage;
import com.example.demo.exceptions.BusinessException;
import com.example.demo.exceptions.ErrorCode;
import com.example.demo.models.CalendarRecurrenceType;
import com.example.demo.models.Course;
import com.example.demo.models.TeacherCalendarEvent;
import com.example.demo.models.User;
import com.example.demo.repositories.CourseRepository;
import com.example.demo.repositories.TeacherCalendarEventRepository;
import com.example.demo.repositories.UserRepository;
import com.example.demo.services.TeacherCalendarRealtimeService;
import com.example.demo.services.TeacherCalendarService;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.temporal.ChronoUnit;
import java.time.temporal.TemporalAdjusters;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class TeacherCalendarServiceImpl implements TeacherCalendarService {

    private static final long SOFT_CONFLICT_MINUTES = 30L;
    private static final int MAX_RECURRENCE_OCCURRENCES = 120;

    private final TeacherCalendarEventRepository repository;
    private final CourseRepository courseRepository;
    private final UserRepository userRepository;
    private final TeacherCalendarRealtimeService realtimeService;

    @Override
    @Transactional(readOnly = true)
    public List<TeacherCalendarEventResponse> listEvents(
            final String teacherId,
            final Instant fromUtc,
            final Instant toUtc,
            final String courseId
    ) {
        final List<TeacherCalendarEvent> events = (courseId == null || courseId.isBlank())
                ? this.repository.findTeacherEventsInRange(teacherId, fromUtc, toUtc)
                : this.repository.findTeacherEventsInRangeByCourse(teacherId, courseId, fromUtc, toUtc);
        return events.stream().map(event -> toResponse(event, null)).toList();
    }

    @Override
    public List<TeacherCalendarEventResponse> createEvents(
            final String teacherId,
            final TeacherCalendarEventCreateRequest request
    ) {
        final Course course = this.courseRepository.findByIdAndTeacherId(request.getCourseId(), teacherId)
                .orElseThrow(() -> new BusinessException(ErrorCode.FORBIDDEN_RESOURCE, "Course not found for this teacher"));
        final User teacher = this.userRepository.findById(teacherId)
                .orElseThrow(() -> new EntityNotFoundException("Teacher not found"));

        validateTimeRange(request.getStartLocalDateTime(), request.getEndLocalDateTime());

        final ZoneId zone = parseZoneId(request.getSourceTimezone());
        final List<LocalDateTime> occurrences = generateOccurrences(request);
        final List<TeacherCalendarEvent> toPersist = new ArrayList<>();
        final String recurrenceGroupId = occurrences.size() > 1 ? UUID.randomUUID().toString() : null;
        int index = 0;

        for (LocalDateTime localStart : occurrences) {
            final long durationMinutes = ChronoUnit.MINUTES.between(request.getStartLocalDateTime(), request.getEndLocalDateTime());
            final LocalDateTime localEnd = localStart.plusMinutes(durationMinutes);
            final Instant startUtc = ZonedDateTime.of(localStart, zone).toInstant();
            final Instant endUtc = ZonedDateTime.of(localEnd, zone).toInstant();

            assertNoHardConflicts(teacherId, startUtc, endUtc, null);

            final TeacherCalendarEvent event = TeacherCalendarEvent.builder()
                    .teacher(teacher)
                    .course(course)
                    .eventType(request.getEventType())
                    .title(request.getTitle())
                    .description(request.getDescription())
                    .meetingLink(request.getMeetingLink())
                    .startAtUtc(startUtc)
                    .endAtUtc(endUtc)
                    .sourceTimezone(zone.getId())
                    .recurrenceGroupId(recurrenceGroupId)
                    .recurrenceIndex(occurrences.size() > 1 ? index : null)
                    .cancelled(false)
                    .notifyPolicy(request.getNotifyPolicy())
                    .build();
            toPersist.add(event);
            index++;
        }

        final List<TeacherCalendarEvent> saved = this.repository.saveAll(toPersist);
        publishUpdate(
                teacherId,
                course.getId(),
                "CREATED",
                saved.stream().map(TeacherCalendarEvent::getId).toList(),
                "Calendar event(s) created"
        );
        return saved.stream()
                .map(event -> toResponse(event, countSoftConflicts(teacherId, event.getStartAtUtc(), event.getEndAtUtc(), event.getId())))
                .toList();
    }

    @Override
    public TeacherCalendarEventResponse updateEvent(
            final String teacherId,
            final String eventId,
            final TeacherCalendarEventUpdateRequest request
    ) {
        final TeacherCalendarEvent event = getTeacherEventOrThrow(teacherId, eventId);
        validateTimeRange(request.getStartLocalDateTime(), request.getEndLocalDateTime());

        final ZoneId zone = parseZoneId(request.getSourceTimezone());
        final Instant startUtc = ZonedDateTime.of(request.getStartLocalDateTime(), zone).toInstant();
        final Instant endUtc = ZonedDateTime.of(request.getEndLocalDateTime(), zone).toInstant();
        assertNoHardConflicts(teacherId, startUtc, endUtc, eventId);

        event.setTitle(request.getTitle());
        event.setDescription(request.getDescription());
        event.setMeetingLink(request.getMeetingLink());
        event.setEventType(request.getEventType());
        event.setStartAtUtc(startUtc);
        event.setEndAtUtc(endUtc);
        event.setSourceTimezone(zone.getId());
        event.setNotifyPolicy(request.getNotifyPolicy());
        final TeacherCalendarEvent saved = this.repository.save(event);

        publishUpdate(
                teacherId,
                saved.getCourse().getId(),
                "UPDATED",
                List.of(saved.getId()),
                request.isNotifyStudentsNow()
                        ? "Event rescheduled, notify students now"
                        : "Event updated"
        );
        return toResponse(saved, countSoftConflicts(teacherId, startUtc, endUtc, saved.getId()));
    }

    @Override
    public void deleteEvent(final String teacherId, final String eventId) {
        final TeacherCalendarEvent event = getTeacherEventOrThrow(teacherId, eventId);
        event.setCancelled(true);
        this.repository.save(event);
        publishUpdate(teacherId, event.getCourse().getId(), "DELETED", List.of(event.getId()), "Event cancelled");
    }

    @Override
    public TeacherCalendarEventResponse duplicateEvent(final String teacherId, final String eventId) {
        final TeacherCalendarEvent original = getTeacherEventOrThrow(teacherId, eventId);
        final Instant duplicatedStart = original.getStartAtUtc().plus(7, ChronoUnit.DAYS);
        final Instant duplicatedEnd = original.getEndAtUtc().plus(7, ChronoUnit.DAYS);
        assertNoHardConflicts(teacherId, duplicatedStart, duplicatedEnd, null);

        final TeacherCalendarEvent duplicate = TeacherCalendarEvent.builder()
                .teacher(original.getTeacher())
                .course(original.getCourse())
                .eventType(original.getEventType())
                .title(original.getTitle())
                .description(original.getDescription())
                .meetingLink(original.getMeetingLink())
                .startAtUtc(duplicatedStart)
                .endAtUtc(duplicatedEnd)
                .sourceTimezone(original.getSourceTimezone())
                .cancelled(false)
                .notifyPolicy(original.getNotifyPolicy())
                .build();

        final TeacherCalendarEvent saved = this.repository.save(duplicate);
        publishUpdate(teacherId, saved.getCourse().getId(), "CREATED", List.of(saved.getId()), "Event duplicated");
        return toResponse(saved, countSoftConflicts(teacherId, duplicatedStart, duplicatedEnd, saved.getId()));
    }

    @Override
    public List<TeacherCalendarEventResponse> applyBulkAction(
            final String teacherId,
            final TeacherCalendarBulkActionRequest request
    ) {
        final List<TeacherCalendarEvent> events = this.repository.findAllById(request.getEventIds()).stream()
                .filter(e -> e.getTeacher().getId().equals(teacherId))
                .toList();

        if (events.size() != request.getEventIds().size()) {
            throw new BusinessException(ErrorCode.FORBIDDEN_RESOURCE, "One or more events are not accessible");
        }

        for (final TeacherCalendarEvent event : events) {
            switch (request.getActionType()) {
                case MOVE_NEXT_WEEK -> {
                    final Instant start = event.getStartAtUtc().plus(7, ChronoUnit.DAYS);
                    final Instant end = event.getEndAtUtc().plus(7, ChronoUnit.DAYS);
                    assertNoHardConflicts(teacherId, start, end, event.getId());
                    event.setStartAtUtc(start);
                    event.setEndAtUtc(end);
                }
                case UPDATE_MEETING_LINK -> event.setMeetingLink(request.getMeetingLink());
                case CANCEL_AND_NOTIFY -> event.setCancelled(true);
            }
            if (request.getNotifyPolicy() != null && !request.getNotifyPolicy().isBlank()) {
                event.setNotifyPolicy(request.getNotifyPolicy());
            }
        }

        final List<TeacherCalendarEvent> saved = this.repository.saveAll(events);
        publishUpdate(
                teacherId,
                null,
                "BULK_UPDATED",
                saved.stream().map(TeacherCalendarEvent::getId).toList(),
                "Bulk operation applied"
        );
        return saved.stream()
                .map(event -> toResponse(event, countSoftConflicts(teacherId, event.getStartAtUtc(), event.getEndAtUtc(), event.getId())))
                .toList();
    }

    private TeacherCalendarEvent getTeacherEventOrThrow(final String teacherId, final String eventId) {
        final TeacherCalendarEvent event = this.repository.findById(eventId)
                .orElseThrow(() -> new EntityNotFoundException("Calendar event not found"));
        if (!event.getTeacher().getId().equals(teacherId)) {
            throw new BusinessException(ErrorCode.FORBIDDEN_RESOURCE);
        }
        return event;
    }

    private void validateTimeRange(final LocalDateTime start, final LocalDateTime end) {
        if (end.isBefore(start) || end.equals(start)) {
            throw new BusinessException(ErrorCode.CONFLICT, "Event end time must be after start time");
        }
    }

    private ZoneId parseZoneId(final String timezone) {
        try {
            return ZoneId.of(timezone);
        } catch (Exception ex) {
            throw new BusinessException(ErrorCode.CONFLICT, "Invalid timezone");
        }
    }

    private List<LocalDateTime> generateOccurrences(final TeacherCalendarEventCreateRequest request) {
        final int recurrenceCount = Math.max(1, Math.min(
                request.getRecurrenceCount() == null ? 1 : request.getRecurrenceCount(),
                MAX_RECURRENCE_OCCURRENCES
        ));
        final int interval = Math.max(1, request.getRecurrenceInterval() == null ? 1 : request.getRecurrenceInterval());
        final LocalDate untilDate = request.getRecurrenceUntilDate();
        final LocalDateTime start = request.getStartLocalDateTime();
        final List<LocalDateTime> result = new ArrayList<>();

        if (request.getRecurrenceType() == null || request.getRecurrenceType() == CalendarRecurrenceType.NONE) {
            result.add(start);
            return result;
        }

        switch (request.getRecurrenceType()) {
            case DAILY -> {
                for (int i = 0; i < recurrenceCount; i++) {
                    LocalDateTime candidate = start.plusDays((long) i * interval);
                    if (untilDate != null && candidate.toLocalDate().isAfter(untilDate)) {
                        break;
                    }
                    result.add(candidate);
                }
            }
            case WEEKLY -> {
                final Set<DayOfWeek> requestedDays = new HashSet<>(request.getWeeklyDays() == null || request.getWeeklyDays().isEmpty()
                        ? List.of(start.getDayOfWeek())
                        : request.getWeeklyDays());
                LocalDate cursor = start.toLocalDate();
                while (result.size() < recurrenceCount) {
                    if (untilDate != null && cursor.isAfter(untilDate)) {
                        break;
                    }
                    final long weekDistance = ChronoUnit.WEEKS.between(
                            start.toLocalDate().with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY)),
                            cursor.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY))
                    );
                    if (weekDistance >= 0 && weekDistance % interval == 0 && requestedDays.contains(cursor.getDayOfWeek())) {
                        result.add(LocalDateTime.of(cursor, start.toLocalTime()));
                    }
                    cursor = cursor.plusDays(1);
                }
            }
            case MONTHLY_FIRST_WEEKDAY -> {
                final DayOfWeek weekday = request.getMonthlyWeekday() != null ? request.getMonthlyWeekday() : start.getDayOfWeek();
                LocalDate monthCursor = start.toLocalDate().withDayOfMonth(1);
                int added = 0;
                while (added < recurrenceCount) {
                    final LocalDate firstWeekday = monthCursor.with(TemporalAdjusters.firstInMonth(weekday));
                    final LocalDateTime candidate = LocalDateTime.of(firstWeekday, start.toLocalTime());
                    if (!candidate.toLocalDate().isBefore(start.toLocalDate())) {
                        if (untilDate != null && candidate.toLocalDate().isAfter(untilDate)) {
                            break;
                        }
                        result.add(candidate);
                        added++;
                    }
                    monthCursor = monthCursor.plusMonths(interval);
                }
            }
            default -> result.add(start);
        }

        if (result.isEmpty()) {
            result.add(start);
        }
        return result;
    }

    private void assertNoHardConflicts(
            final String teacherId,
            final Instant startUtc,
            final Instant endUtc,
            final String excludeId
    ) {
        final boolean hasOverlap = !this.repository.findOverlappingEvents(teacherId, startUtc, endUtc, excludeId).isEmpty();
        if (hasOverlap) {
            throw new BusinessException(ErrorCode.CONFLICT, "Hard conflict: overlapping event exists");
        }
    }

    private int countSoftConflicts(
            final String teacherId,
            final Instant startUtc,
            final Instant endUtc,
            final String excludeId
    ) {
        final Instant from = startUtc.minus(SOFT_CONFLICT_MINUTES, ChronoUnit.MINUTES);
        final Instant to = endUtc.plus(SOFT_CONFLICT_MINUTES, ChronoUnit.MINUTES);
        final List<TeacherCalendarEvent> candidates = this.repository.findPotentialSoftConflicts(teacherId, from, to, excludeId);
        int count = 0;
        for (TeacherCalendarEvent candidate : candidates) {
            final long gapBefore = Math.abs(ChronoUnit.MINUTES.between(candidate.getEndAtUtc(), startUtc));
            final long gapAfter = Math.abs(ChronoUnit.MINUTES.between(endUtc, candidate.getStartAtUtc()));
            if (gapBefore <= SOFT_CONFLICT_MINUTES || gapAfter <= SOFT_CONFLICT_MINUTES) {
                count++;
            }
        }
        return count;
    }

    private TeacherCalendarEventResponse toResponse(final TeacherCalendarEvent event, final Integer softConflicts) {
        return TeacherCalendarEventResponse.builder()
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
                .softConflictCount(softConflicts == null ? 0 : softConflicts)
                .build();
    }

    private void publishUpdate(
            final String teacherId,
            final String courseId,
            final String type,
            final List<String> eventIds,
            final String message
    ) {
        this.realtimeService.publishToTeacher(
                teacherId,
                TeacherCalendarRealtimeMessage.builder()
                        .type(type)
                        .teacherId(teacherId)
                        .courseId(courseId)
                        .eventIds(eventIds)
                        .message(message)
                        .timestamp(Instant.now())
                        .build()
        );
    }
}
