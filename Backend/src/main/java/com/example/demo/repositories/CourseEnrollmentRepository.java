package com.example.demo.repositories;

import com.example.demo.models.CourseEnrollment;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CourseEnrollmentRepository extends JpaRepository<CourseEnrollment, String> {

    @Query("SELECT ce FROM CourseEnrollment ce WHERE ce.course.id = :courseId AND ce.isActive = true")
    List<CourseEnrollment> findByCourseId(@Param("courseId") String courseId);

    @Query("SELECT ce FROM CourseEnrollment ce WHERE ce.course.id = :courseId AND ce.student.id = :studentId")
    Optional<CourseEnrollment> findByCourseIdAndStudentId(@Param("courseId") String courseId, @Param("studentId") String studentId);

    @Query("SELECT ce FROM CourseEnrollment ce JOIN FETCH ce.course WHERE ce.student.id = :studentId AND ce.isActive = true")
    List<CourseEnrollment> findEnrolledCoursesByStudentId(@Param("studentId") String studentId);

    @Query("SELECT COUNT(ce) FROM CourseEnrollment ce WHERE ce.course.id = :courseId AND ce.isActive = true")
    long countActiveEnrollmentsByCourseId(@Param("courseId") String courseId);

    @Query("SELECT ce FROM CourseEnrollment ce WHERE ce.student.id = :studentId")
    List<CourseEnrollment> findByStudentId(@Param("studentId") String studentId);

    @Query("SELECT ce FROM CourseEnrollment ce WHERE ce.student.id = :studentId AND ce.isActive = true")
    Page<CourseEnrollment> findByStudentIdAndIsActiveTrue(@Param("studentId") String studentId, Pageable pageable);

    @Query("SELECT DISTINCT ce FROM CourseEnrollment ce " +
           "LEFT JOIN FETCH ce.course c " +
           "LEFT JOIN FETCH c.teacher " +
           "WHERE ce.student.id = :studentId AND ce.isActive = true")
    Page<CourseEnrollment> findByStudentIdAndIsActiveTrueWithCourseAndTeacher(@Param("studentId") String studentId, Pageable pageable);

    @Query("SELECT CASE WHEN COUNT(ce) > 0 THEN true ELSE false END FROM CourseEnrollment ce WHERE ce.student.id = :studentId AND ce.course.id = :courseId AND ce.isActive = true")
    boolean existsByStudentIdAndCourseId(@Param("studentId") String studentId, @Param("courseId") String courseId);

    @Modifying
    @Query("""
           UPDATE CourseEnrollment ce
           SET ce.isActive = false
           WHERE ce.course.id = :courseId AND (ce.isActive = true OR ce.isActive IS NULL)
           """)
    int deactivateAllActiveByCourseId(@Param("courseId") String courseId);
}
