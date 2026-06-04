package com.example.demo.services;

import com.example.demo.dtos.CourseEnrollmentResponse;
import java.util.List;

public interface CourseEnrollmentService {

    CourseEnrollmentResponse enrollStudentInCourse(String courseId, String studentId);

    void removeStudentFromCourse(String enrollmentId, String courseId, String teacherId);

    List<CourseEnrollmentResponse> getCourseEnrollments(String courseId, String teacherId);

    List<CourseEnrollmentResponse> getStudentEnrolledCourses(String studentId);

    long getEnrollmentCount(String courseId);

    void validateStudentNotAlreadyEnrolled(String courseId, String studentId);

    void validateTeacherOwnershipOfCourse(String courseId, String teacherId);
}
