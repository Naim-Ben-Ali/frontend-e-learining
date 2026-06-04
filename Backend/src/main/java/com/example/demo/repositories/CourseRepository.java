package com.example.demo.repositories;

import com.example.demo.models.Course;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CourseRepository extends JpaRepository<Course, String> {

    @Query("SELECT c FROM Course c WHERE c.teacher.id = :teacherId AND c.isActive = true ORDER BY c.createdDate DESC")
    List<Course> findAllByTeacherId(@Param("teacherId") String teacherId);

    @Query("SELECT c FROM Course c WHERE c.id = :courseId AND c.teacher.id = :teacherId")
    Optional<Course> findByIdAndTeacherId(@Param("courseId") String courseId, @Param("teacherId") String teacherId);

    @Query("SELECT c FROM Course c WHERE c.id = :courseId AND c.isActive = true")
    Optional<Course> findActiveById(@Param("courseId") String courseId);

    @Query("SELECT c FROM Course c WHERE c.isActive = true ORDER BY c.createdDate DESC")
    Page<Course> findByIsActiveTrue(Pageable pageable);

    @Query("SELECT c FROM Course c WHERE c.isActive = true")
    List<Course> findByIsActiveTrue();

    @Query("SELECT c FROM Course c WHERE c.subject = :subject AND c.isActive = true ORDER BY c.createdDate DESC")
    Page<Course> findBySubjectAndIsActiveTrue(@Param("subject") String subject, Pageable pageable);

    @Query("SELECT DISTINCT c.subject FROM Course c WHERE c.isActive = true ORDER BY c.subject")
    List<String> findDistinctSubjects();

    @Query("SELECT c FROM Course c WHERE c.teacher.id = :teacherId AND c.isActive = true ORDER BY c.createdDate DESC")
    Page<Course> findActiveByTeacherId(@Param("teacherId") String teacherId, Pageable pageable);

    @Query("SELECT COUNT(c) FROM Course c WHERE c.teacher.id = :teacherId AND c.isActive = true")
    long countActiveByTeacherId(@Param("teacherId") String teacherId);
}
