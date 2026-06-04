package com.example.demo.services;

import com.example.demo.dtos.CourseSearchRequest;
import com.example.demo.dtos.StudentCourseResponse;
import com.example.demo.dtos.TeacherDirectoryResponse;
import org.springframework.data.domain.Page;

import java.util.List;

public interface StudentCourseDiscoveryService {

    // Search and filtering
    Page<StudentCourseResponse> searchCourses(CourseSearchRequest request, String studentId);

    // Get all available courses with pagination
    Page<StudentCourseResponse> getAllCourses(int page, int pageSize, String studentId);

    // Get courses by category/subject
    Page<StudentCourseResponse> getCoursesBySubject(String subject, int page, int pageSize, String studentId);

    // Get course details for student
    StudentCourseResponse getCourseForStudent(String courseId, String studentId);

    // Get student's enrolled courses
    Page<StudentCourseResponse> getStudentEnrolledCourses(String studentId, int page, int pageSize);

    // Get recommended courses for student
    List<StudentCourseResponse> getRecommendedCourses(String studentId, int limit);

    // Enroll student in course using key
    void enrollWithCourseKey(String studentId, String courseKey);

    // Get available subjects for filtering
    List<String> getAvailableSubjects();

    // Get available education levels
    List<String> getAvailableEducationLevels();

    Page<TeacherDirectoryResponse> getTeacherDirectory(String studentId, String searchQuery, int page, int pageSize);

    TeacherDirectoryResponse getTeacherProfile(String teacherId, String studentId);

    Page<StudentCourseResponse> getTeacherCourses(String teacherId, String studentId, int page, int pageSize);
}
