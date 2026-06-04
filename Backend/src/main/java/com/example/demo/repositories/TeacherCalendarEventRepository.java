package com.example.demo.repositories;

import com.example.demo.models.TeacherCalendarEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;

public interface TeacherCalendarEventRepository extends JpaRepository<TeacherCalendarEvent, String> {

    @Query("""
           SELECT e
           FROM TeacherCalendarEvent e
           WHERE e.teacher.id = :teacherId
             AND e.cancelled = false
             AND e.startAtUtc < :toUtc
             AND e.endAtUtc > :fromUtc
           ORDER BY e.startAtUtc ASC
           """)
    List<TeacherCalendarEvent> findTeacherEventsInRange(
            @Param("teacherId") String teacherId,
            @Param("fromUtc") Instant fromUtc,
            @Param("toUtc") Instant toUtc
    );

    @Query("""
           SELECT e
           FROM TeacherCalendarEvent e
           WHERE e.teacher.id = :teacherId
             AND e.course.id = :courseId
             AND e.cancelled = false
             AND e.startAtUtc < :toUtc
             AND e.endAtUtc > :fromUtc
           ORDER BY e.startAtUtc ASC
           """)
    List<TeacherCalendarEvent> findTeacherEventsInRangeByCourse(
            @Param("teacherId") String teacherId,
            @Param("courseId") String courseId,
            @Param("fromUtc") Instant fromUtc,
            @Param("toUtc") Instant toUtc
    );

    @Query("""
           SELECT e
           FROM TeacherCalendarEvent e
           WHERE e.teacher.id = :teacherId
             AND e.cancelled = false
             AND e.startAtUtc < :endUtc
             AND e.endAtUtc > :startUtc
             AND (:excludeId IS NULL OR e.id <> :excludeId)
           """)
    List<TeacherCalendarEvent> findOverlappingEvents(
            @Param("teacherId") String teacherId,
            @Param("startUtc") Instant startUtc,
            @Param("endUtc") Instant endUtc,
            @Param("excludeId") String excludeId
    );

    @Query("""
           SELECT e
           FROM TeacherCalendarEvent e
           WHERE e.teacher.id = :teacherId
             AND e.cancelled = false
             AND e.startAtUtc < :toUtc
             AND e.endAtUtc > :fromUtc
             AND (:excludeId IS NULL OR e.id <> :excludeId)
           """)
    List<TeacherCalendarEvent> findPotentialSoftConflicts(
            @Param("teacherId") String teacherId,
            @Param("fromUtc") Instant fromUtc,
            @Param("toUtc") Instant toUtc,
            @Param("excludeId") String excludeId
    );

    @Query("""
           SELECT e
           FROM TeacherCalendarEvent e
           JOIN FETCH e.course
           WHERE e.course.id IN :courseIds
             AND e.cancelled = false
             AND e.startAtUtc < :toUtc
             AND e.endAtUtc > :fromUtc
           ORDER BY e.startAtUtc ASC
           """)
    List<TeacherCalendarEvent> findEventsByCourseIdsInRange(
            @Param("courseIds") List<String> courseIds,
            @Param("fromUtc") Instant fromUtc,
            @Param("toUtc") Instant toUtc
    );
}
