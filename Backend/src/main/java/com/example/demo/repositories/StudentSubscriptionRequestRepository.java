package com.example.demo.repositories;

import com.example.demo.models.Course;
import com.example.demo.models.StudentSubscriptionRequestEntity;
import com.example.demo.models.SubscriptionRequestStatus;
import com.example.demo.models.User;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface StudentSubscriptionRequestRepository extends JpaRepository<StudentSubscriptionRequestEntity, String> {

    @Query("""
            SELECT r FROM StudentSubscriptionRequestEntity r
            WHERE r.student.id = :studentId AND r.teacher.id = :teacherId AND r.status = :status
            """)
    Optional<StudentSubscriptionRequestEntity> findByStudentIdAndTeacherIdAndStatus(
            @Param("studentId") String studentId,
            @Param("teacherId") String teacherId,
            @Param("status") SubscriptionRequestStatus status
    );

    @Query("""
            SELECT r FROM StudentSubscriptionRequestEntity r
            WHERE r.teacher.id = :teacherId
            ORDER BY CASE WHEN r.status = com.example.demo.models.SubscriptionRequestStatus.PENDING THEN 0 ELSE 1 END,
                     r.createdDate DESC
            """)
    List<StudentSubscriptionRequestEntity> findAllByTeacherId(@Param("teacherId") String teacherId);

    @Query("""
            SELECT COUNT(r) > 0 FROM StudentSubscriptionRequestEntity r
            WHERE r.student.id = :studentId AND r.teacher.id = :teacherId AND r.status = com.example.demo.models.SubscriptionRequestStatus.PENDING
            """)
    boolean hasPendingRequest(@Param("studentId") String studentId, @Param("teacherId") String teacherId);

    // New methods for subscription request service
    List<StudentSubscriptionRequestEntity> findByTeacherAndStatus(User teacher, SubscriptionRequestStatus status);

    List<StudentSubscriptionRequestEntity> findByStudentAndStatusIn(User student, List<SubscriptionRequestStatus> statuses);

    long countByTeacherAndStatus(User teacher, SubscriptionRequestStatus status);

    long countByStudentAndStatusIn(User student, List<SubscriptionRequestStatus> statuses);

    boolean existsByStudentAndCourseAndStatus(User student, Course course, SubscriptionRequestStatus status);

    Optional<StudentSubscriptionRequestEntity> findTopByStudentAndCourseOrderByCreatedDateDesc(User student, Course course);

    Optional<StudentSubscriptionRequestEntity> findTopByStudentAndCourseAndStatusOrderByCreatedDateDesc(
            User student,
            Course course,
            SubscriptionRequestStatus status
    );

    @Modifying
    @Query("""
           UPDATE StudentSubscriptionRequestEntity r
           SET r.status = com.example.demo.models.SubscriptionRequestStatus.DENIED,
               r.respondedDate = CURRENT_TIMESTAMP
           WHERE r.course.id = :courseId AND r.status = com.example.demo.models.SubscriptionRequestStatus.APPROVED
           """)
    int revokeApprovedRequestsByCourseId(@Param("courseId") String courseId);

    @Modifying
    @Query("""
           UPDATE StudentSubscriptionRequestEntity r
           SET r.status = com.example.demo.models.SubscriptionRequestStatus.DENIED,
               r.respondedDate = CURRENT_TIMESTAMP
           WHERE r.student.id = :studentId
             AND r.course.id = :courseId
             AND r.status = com.example.demo.models.SubscriptionRequestStatus.APPROVED
           """)
    int revokeApprovedRequestsByStudentAndCourse(@Param("studentId") String studentId, @Param("courseId") String courseId);
}
