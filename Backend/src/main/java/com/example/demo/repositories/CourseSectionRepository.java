package com.example.demo.repositories;

import com.example.demo.models.CourseSection;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CourseSectionRepository extends JpaRepository<CourseSection, String> {

    @Query("SELECT cs FROM CourseSection cs WHERE cs.course.id = :courseId AND cs.isActive = true ORDER BY cs.orderIndex ASC")
    List<CourseSection> findAllByCourseIdActive(@Param("courseId") String courseId);

    @Query("SELECT cs FROM CourseSection cs WHERE cs.id = :sectionId AND cs.isActive = true")
    Optional<CourseSection> findByIdActive(@Param("sectionId") String sectionId);

    @Query("SELECT COUNT(cs) FROM CourseSection cs WHERE cs.course.id = :courseId AND cs.isActive = true")
    long countActiveSectionsByCourseId(@Param("courseId") String courseId);
}
