package com.example.demo.services;

import com.example.demo.dtos.CourseContentRequest;
import com.example.demo.dtos.CourseContentResponse;
import java.util.List;

public interface CourseContentService {

    CourseContentResponse addContent(String courseId, String teacherId, CourseContentRequest request);

    CourseContentResponse getContent(String contentId, String courseId);

    List<CourseContentResponse> getCourseContents(String courseId);

    CourseContentResponse updateContent(String contentId, String courseId, String teacherId, CourseContentRequest request);

    void deleteContent(String contentId, String courseId, String teacherId);

    void validateTeacherOwnershipOfContent(String contentId, String courseId, String teacherId);
}
