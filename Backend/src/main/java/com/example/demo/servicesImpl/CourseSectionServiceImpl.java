package com.example.demo.servicesImpl;

import com.example.demo.dtos.CourseContentResponse;
import com.example.demo.dtos.CourseSectionRequest;
import com.example.demo.dtos.CourseSectionResponse;
import com.example.demo.exceptions.BusinessException;
import com.example.demo.exceptions.ErrorCode;
import com.example.demo.models.Course;
import com.example.demo.models.CourseSection;
import com.example.demo.repositories.CourseSectionRepository;
import com.example.demo.repositories.CourseRepository;
import com.example.demo.services.CourseSectionService;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class CourseSectionServiceImpl implements CourseSectionService {

    private final CourseSectionRepository sectionRepository;
    private final CourseRepository courseRepository;

    @Override
    public CourseSectionResponse createSection(final String courseId, final String teacherId, final CourseSectionRequest request) {
        log.info("Creating section for course: {}", courseId);

        final Course course = courseRepository.findById(courseId)
                .orElseThrow(() -> new EntityNotFoundException("Course not found"));

        if (!course.getTeacher().getId().equals(teacherId)) {
            throw new BusinessException(ErrorCode.FORBIDDEN_RESOURCE);
        }

        final CourseSection section = CourseSection.builder()
                .title(request.getTitle())
                .description(request.getDescription())
                .orderIndex(request.getOrderIndex() != null ? request.getOrderIndex() : 0)
                .course(course)
                .isActive(true)
                .build();

        final CourseSection savedSection = sectionRepository.save(section);
        log.info("Section created successfully with ID: {}", savedSection.getId());

        return buildSectionResponse(savedSection);
    }

    @Override
    public List<CourseSectionResponse> getAllSectionsByCourse(final String courseId, final String teacherId) {
        log.info("Getting all sections for course: {} by teacher: {}", courseId, teacherId);

        final Course course = courseRepository.findById(courseId)
                .orElseThrow(() -> new EntityNotFoundException("Course not found"));

        if (!course.getTeacher().getId().equals(teacherId)) {
            throw new BusinessException(ErrorCode.FORBIDDEN_RESOURCE);
        }

        final List<CourseSection> sections = sectionRepository.findAllByCourseIdActive(courseId);
        return sections.stream()
                .map(this::buildSectionResponse)
                .collect(Collectors.toList());
    }

    @Override
    public List<CourseSectionResponse> getPublicSectionsByCourse(final String courseId) {
        log.info("Getting public sections for course: {}", courseId);

        // Validate course exists
        courseRepository.findById(courseId)
                .orElseThrow(() -> new EntityNotFoundException("Course not found"));

        final List<CourseSection> sections = sectionRepository.findAllByCourseIdActive(courseId);
        return sections.stream()
                .map(this::buildSectionResponse)
                .collect(Collectors.toList());
    }

    @Override
    public CourseSectionResponse getSectionById(final String sectionId, final String courseId, final String teacherId) {
        log.info("Getting section: {}", sectionId);

        final Course course = courseRepository.findById(courseId)
                .orElseThrow(() -> new EntityNotFoundException("Course not found"));

        if (!course.getTeacher().getId().equals(teacherId)) {
            throw new BusinessException(ErrorCode.FORBIDDEN_RESOURCE);
        }

        final CourseSection section = sectionRepository.findByIdActive(sectionId)
                .orElseThrow(() -> new BusinessException(ErrorCode.SECTION_NOT_FOUND));

        if (!section.getCourse().getId().equals(courseId)) {
            throw new BusinessException(ErrorCode.FORBIDDEN_RESOURCE);
        }

        return buildSectionResponse(section);
    }

    @Override
    public CourseSectionResponse updateSection(final String sectionId, final String courseId, final String teacherId, final CourseSectionRequest request) {
        log.info("Updating section: {}", sectionId);

        final Course course = courseRepository.findById(courseId)
                .orElseThrow(() -> new EntityNotFoundException("Course not found"));

        if (!course.getTeacher().getId().equals(teacherId)) {
            throw new BusinessException(ErrorCode.FORBIDDEN_RESOURCE);
        }

        final CourseSection section = sectionRepository.findByIdActive(sectionId)
                .orElseThrow(() -> new BusinessException(ErrorCode.SECTION_NOT_FOUND));

        if (!section.getCourse().getId().equals(courseId)) {
            throw new BusinessException(ErrorCode.FORBIDDEN_RESOURCE);
        }

        section.setTitle(request.getTitle());
        section.setDescription(request.getDescription());
        section.setOrderIndex(request.getOrderIndex() != null ? request.getOrderIndex() : section.getOrderIndex());

        final CourseSection updatedSection = sectionRepository.save(section);
        log.info("Section updated successfully: {}", sectionId);

        return buildSectionResponse(updatedSection);
    }

    @Override
    public void deleteSection(final String sectionId, final String courseId, final String teacherId) {
        log.info("Deleting section: {}", sectionId);

        final Course course = courseRepository.findById(courseId)
                .orElseThrow(() -> new EntityNotFoundException("Course not found"));

        if (!course.getTeacher().getId().equals(teacherId)) {
            throw new BusinessException(ErrorCode.FORBIDDEN_RESOURCE);
        }

        final CourseSection section = sectionRepository.findByIdActive(sectionId)
                .orElseThrow(() -> new BusinessException(ErrorCode.SECTION_NOT_FOUND));

        if (!section.getCourse().getId().equals(courseId)) {
            throw new BusinessException(ErrorCode.FORBIDDEN_RESOURCE);
        }

        section.setIsActive(false);
        sectionRepository.save(section);

        log.info("Section deleted (soft delete): {}", sectionId);
    }

    private CourseSectionResponse buildSectionResponse(final CourseSection section) {
        return CourseSectionResponse.builder()
                .id(section.getId())
                .title(section.getTitle())
                .description(section.getDescription())
                .orderIndex(section.getOrderIndex())
                .isActive(section.getIsActive())
                .createdDate(section.getCreatedDate())
                .contents(section.getContents() != null ?
                        section.getContents().stream()
                                .filter(CourseContent -> CourseContent.getIsActive())
                                .sorted(Comparator.comparing(content -> content.getOrderIndex() != null ? content.getOrderIndex() : 0))
                                .map(content -> CourseContentResponse.builder()
                                        .id(content.getId())
                                        .title(content.getTitle())
                                        .description(content.getDescription())
                                        .type(content.getType().name())
                                        .contentUrl(content.getContentUrl())
                                        .fileSize(content.getFileSize())
                                        .fileName(content.getFileName())
                                        .sectionId(content.getSection() != null ? content.getSection().getId() : null)
                                        .orderIndex(content.getOrderIndex())
                                        .isActive(content.getIsActive())
                                        .createdDate(content.getCreatedDate())
                                        .build())
                                .collect(Collectors.toList()) : new ArrayList<>())
                .build();
    }
}
