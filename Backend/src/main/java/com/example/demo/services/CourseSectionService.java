package com.example.demo.services;

import com.example.demo.dtos.CourseSectionRequest;
import com.example.demo.dtos.CourseSectionResponse;

import java.util.List;

public interface CourseSectionService {

    CourseSectionResponse createSection(String courseId, String teacherId, CourseSectionRequest request);

    List<CourseSectionResponse> getAllSectionsByCourse(String courseId, String teacherId);

    /**
     * Get all active sections for a course (public access, no teacher validation required).
     * Used by students to view course sections and their content.
     */
    List<CourseSectionResponse> getPublicSectionsByCourse(String courseId);

    CourseSectionResponse getSectionById(String sectionId, String courseId, String teacherId);

    CourseSectionResponse updateSection(String sectionId, String courseId, String teacherId, CourseSectionRequest request);

    void deleteSection(String sectionId, String courseId, String teacherId);
}
