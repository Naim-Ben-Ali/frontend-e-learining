package com.example.demo.repositories;

import com.example.demo.models.StudentTeacher;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface StudentTeacherRepository extends JpaRepository<StudentTeacher, String> {

    @Query("SELECT st FROM StudentTeacher st WHERE st.student.id = :studentId AND st.teacher.id = :teacherId AND st.active = true")
    Optional<StudentTeacher> findActiveSubscription(@Param("studentId") String studentId, @Param("teacherId") String teacherId);

    @Query("SELECT st FROM StudentTeacher st WHERE st.teacher.id = :teacherId AND st.active = true")
    List<StudentTeacher> findAllActiveSubscribersByTeacherId(@Param("teacherId") String teacherId);

    @Query("SELECT COUNT(st) FROM StudentTeacher st WHERE st.teacher.id = :teacherId AND st.active = true")
    long countActiveSubscribersByTeacherId(@Param("teacherId") String teacherId);

    @Query("SELECT st FROM StudentTeacher st WHERE st.subscriptionKey.id = :keyId AND st.active = true")
    List<StudentTeacher> findAllBySubscriptionKeyId(@Param("keyId") String keyId);

    @Query("SELECT st FROM StudentTeacher st WHERE st.subscriptionKey.id = :keyId")
    List<StudentTeacher> findAllBySubscriptionKeyIdIncludingInactive(@Param("keyId") String keyId);

    @Query("SELECT st FROM StudentTeacher st WHERE st.student.id = :studentId AND st.active = true")
    List<StudentTeacher> findAllActiveSubscriptionsByStudentId(@Param("studentId") String studentId);

    @Modifying
    @Query("""
           UPDATE StudentTeacher st
           SET st.active = false
           WHERE st.subscriptionKey.id = :keyId AND st.active = true
           """)
    int deactivateActiveBySubscriptionKeyId(@Param("keyId") String keyId);

    @Modifying
    @Query("""
           UPDATE StudentTeacher st
           SET st.active = false
           WHERE st.student.id = :studentId AND st.teacher.id = :teacherId AND st.active = true
           """)
    int deactivateActiveByStudentAndTeacher(@Param("studentId") String studentId, @Param("teacherId") String teacherId);
}
