package com.example.demo.services;

import com.example.demo.dtos.TeacherCalendarRealtimeMessage;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

public interface TeacherCalendarRealtimeService {
    SseEmitter subscribeTeacher(String teacherId);
    void publishToTeacher(String teacherId, TeacherCalendarRealtimeMessage message);
}
