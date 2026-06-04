package com.example.demo.servicesImpl;

import com.example.demo.dtos.CourseContentRequest;
import com.example.demo.dtos.CourseContentResponse;
import com.example.demo.exceptions.BusinessException;
import com.example.demo.exceptions.ErrorCode;
import com.example.demo.models.Course;
import com.example.demo.models.CourseContent;
import com.example.demo.models.CourseSection;
import com.example.demo.repositories.CourseContentRepository;
import com.example.demo.repositories.CourseSectionRepository;
import com.example.demo.services.CourseContentService;
import com.example.demo.services.CourseService;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class CourseContentServiceImpl implements CourseContentService {

    private final CourseContentRepository courseContentRepository;
    private final CourseSectionRepository sectionRepository;
    private final CourseService courseService;

    @Override
    public CourseContentResponse addContent(final String courseId, final String teacherId, final CourseContentRequest request) {
        log.info("Adding content to course {} for teacher {}", courseId, teacherId);

        // Validate teacher ownership
        this.courseService.validateTeacherOwnership(courseId, teacherId);

        final Course course = this.courseService.findCourseByIdOrThrow(courseId);

        // Handle optional section
        CourseSection section = null;
        if (request.getSectionId() != null && !request.getSectionId().isEmpty()) {
            section = sectionRepository.findByIdActive(request.getSectionId())
                    .orElseThrow(() -> new BusinessException(ErrorCode.SECTION_NOT_FOUND));

            if (!section.getCourse().getId().equals(courseId)) {
                throw new BusinessException(ErrorCode.FORBIDDEN_RESOURCE);
            }
        }

        final CourseContent content = CourseContent.builder()
                .title(request.getTitle())
                .description(request.getDescription())
                .type(CourseContent.ContentType.valueOf(request.getType().toUpperCase()))
                .contentUrl(request.getContentUrl())
                .fileSize(request.getFileSize())
                .fileName(request.getFileName())
                .course(course)
                .section(section)
                .orderIndex(request.getOrderIndex() != null ? request.getOrderIndex() : 0)
                .isActive(true)
                .build();

        final CourseContent savedContent = this.courseContentRepository.save(content);
        log.info("Content added successfully with ID: {}", savedContent.getId());

        return buildContentResponse(savedContent);
    }

    @Override
    public CourseContentResponse getContent(final String contentId, final String courseId) {
        log.info("Getting content {} from course {}", contentId, courseId);

        final CourseContent content = this.courseContentRepository.findByIdAndCourseId(contentId, courseId)
                .orElseThrow(() -> new EntityNotFoundException("Content not found"));

        return buildContentResponse(content);
    }

    @Override
    public List<CourseContentResponse> getCourseContents(final String courseId) {
        log.info("Getting all contents for course: {}", courseId);

        final List<CourseContent> contents = this.courseContentRepository.findByCourseId(courseId);

        return contents.stream()
                .map(this::buildContentResponse)
                .collect(Collectors.toList());
    }

    @Override
    public CourseContentResponse updateContent(final String contentId, final String courseId, final String teacherId, final CourseContentRequest request) {
        log.info("Updating content {} in course {} for teacher {}", contentId, courseId, teacherId);

        validateTeacherOwnershipOfContent(contentId, courseId, teacherId);

        final CourseContent content = this.courseContentRepository.findByIdAndCourseId(contentId, courseId)
                .orElseThrow(() -> new EntityNotFoundException("Content not found"));

        content.setTitle(request.getTitle());
        content.setDescription(request.getDescription());
        content.setType(CourseContent.ContentType.valueOf(request.getType().toUpperCase()));
        content.setContentUrl(request.getContentUrl());
        content.setFileSize(request.getFileSize());
        content.setFileName(request.getFileName());
        if (request.getOrderIndex() != null) {
            content.setOrderIndex(request.getOrderIndex());
        }

        final CourseContent updatedContent = this.courseContentRepository.save(content);
        log.info("Content updated successfully: {}", contentId);

        return buildContentResponse(updatedContent);
    }

    @Override
    public void deleteContent(final String contentId, final String courseId, final String teacherId) {
        log.info("Deleting content {} from course {} for teacher {}", contentId, courseId, teacherId);

        validateTeacherOwnershipOfContent(contentId, courseId, teacherId);

        this.courseContentRepository.deleteById(contentId);

        log.info("Content deleted (soft delete): {}", contentId);
    }

    @Override
    public void validateTeacherOwnershipOfContent(final String contentId, final String courseId, final String teacherId) {
        // Validate that the teacher owns the course
        this.courseService.validateTeacherOwnership(courseId, teacherId);

        // Verify content belongs to this course
        this.courseContentRepository.findByIdAndCourseId(contentId, courseId)
                .orElseThrow(() -> new BusinessException(ErrorCode.CONTENT_NOT_FOUND));
    }

    private CourseContentResponse buildContentResponse(final CourseContent content) {
        return CourseContentResponse.builder()
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
                .build();
    }
}
