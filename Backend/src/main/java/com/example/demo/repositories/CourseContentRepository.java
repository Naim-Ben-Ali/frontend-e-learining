package com.example.demo.repositories;

import com.example.demo.models.CourseContent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CourseContentRepository extends JpaRepository<CourseContent, String> {

    @Query("SELECT cc FROM CourseContent cc WHERE cc.course.id = :courseId AND cc.isActive = true ORDER BY cc.orderIndex ASC")
    List<CourseContent> findByCourseId(@Param("courseId") String courseId);

    @Query("SELECT cc FROM CourseContent cc WHERE cc.id = :contentId AND cc.course.id = :courseId")
    Optional<CourseContent> findByIdAndCourseId(@Param("contentId") String contentId, @Param("courseId") String courseId);
}
