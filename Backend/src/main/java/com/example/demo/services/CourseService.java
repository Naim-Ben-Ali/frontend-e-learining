package com.example.demo.services;

import com.example.demo.dtos.CreateCourseRequest;
import com.example.demo.dtos.CourseResponse;
import com.example.demo.models.Course;

import java.util.List;

public interface CourseService {

    CourseResponse createCourse(String teacherId, CreateCourseRequest request);

    CourseResponse getCourseById(String courseId, String teacherId);

    CourseResponse getCourseDetails(String courseId);

    List<CourseResponse> getAllTeacherCourses(String teacherId);

    CourseResponse updateCourse(String courseId, String teacherId, CreateCourseRequest request);

    void deleteCourse(String courseId, String teacherId);

    Course findCourseByIdOrThrow(String courseId);

    void validateTeacherOwnership(String courseId, String teacherId);

    /**
     * @return true if the course is paid ({@code isFree == false})
     */
    boolean isPaidCourse(String courseId);
}
