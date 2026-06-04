package com.example.demo.servicesImpl;

import com.example.demo.dtos.TeacherCalendarRealtimeMessage;
import com.example.demo.services.TeacherCalendarRealtimeService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;

@Service
@Slf4j
public class TeacherCalendarRealtimeServiceImpl implements TeacherCalendarRealtimeService {

    private static final long SSE_TIMEOUT_MS = 0L;
    private final Map<String, List<SseEmitter>> emittersByTeacher = new ConcurrentHashMap<>();

    @Override
    public SseEmitter subscribeTeacher(final String teacherId) {
        final SseEmitter emitter = new SseEmitter(SSE_TIMEOUT_MS);
        this.emittersByTeacher.computeIfAbsent(teacherId, key -> new CopyOnWriteArrayList<>()).add(emitter);

        emitter.onCompletion(() -> removeEmitter(teacherId, emitter));
        emitter.onTimeout(() -> removeEmitter(teacherId, emitter));
        emitter.onError(ex -> removeEmitter(teacherId, emitter));

        try {
            emitter.send(SseEmitter.event()
                    .name("connected")
                    .data("teacher-calendar-stream-connected"));
        } catch (IOException e) {
            removeEmitter(teacherId, emitter);
            log.warn("Failed to send initial SSE event for teacher {}", teacherId, e);
        }
        return emitter;
    }

    @Override
    public void publishToTeacher(final String teacherId, final TeacherCalendarRealtimeMessage message) {
        final List<SseEmitter> emitters = this.emittersByTeacher.getOrDefault(teacherId, List.of());
        if (emitters.isEmpty()) {
            return;
        }

        for (final SseEmitter emitter : emitters) {
            try {
                emitter.send(SseEmitter.event()
                        .name("calendar-update")
                        .data(message));
            } catch (Exception e) {
                // Client may disconnect at any moment; this must never fail main API operations.
                removeEmitter(teacherId, emitter);
                try {
                    emitter.completeWithError(e);
                } catch (Exception ignored) {
                    // no-op
                }
                log.debug("Removed stale SSE emitter for teacher {} after send failure: {}", teacherId, e.getMessage());
            }
        }
    }

    private void removeEmitter(final String teacherId, final SseEmitter emitter) {
        final List<SseEmitter> emitters = this.emittersByTeacher.get(teacherId);
        if (emitters == null) {
            return;
        }
        emitters.remove(emitter);
        if (emitters.isEmpty()) {
            this.emittersByTeacher.remove(teacherId);
        }
    }
}
