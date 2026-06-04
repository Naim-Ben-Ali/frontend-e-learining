package com.example.demo.servicesImpl;

import com.example.demo.exceptions.BusinessException;
import com.example.demo.exceptions.ErrorCode;
import com.example.demo.models.Course;
import com.example.demo.models.User;
import com.example.demo.repositories.CourseRepository;
import com.example.demo.repositories.UserRepository;
import com.example.demo.services.CourseEnrollmentService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CourseServiceImplTest {

    @Mock
    private CourseRepository courseRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private CourseEnrollmentService courseEnrollmentService;
    @InjectMocks
    private CourseServiceImpl courseService;

    @Test
    void validateTeacherOwnershipShouldThrowForbiddenWhenTeacherDoesNotOwnCourse() {
        User owner = User.builder()
                .id("teacher-1")
                .email("owner@example.com")
                .build();

        Course course = Course.builder()
                .id("course-1")
                .teacher(owner)
                .build();

        when(courseRepository.findById("course-1")).thenReturn(Optional.of(course));

        assertThatThrownBy(() -> courseService.validateTeacherOwnership("course-1", "teacher-2"))
                .isInstanceOf(BusinessException.class)
                .extracting(exception -> ((BusinessException) exception).getErrorCode())
                .isEqualTo(ErrorCode.FORBIDDEN_RESOURCE);
    }

    @Test
    void getCourseByIdShouldThrowCourseNotFoundWhenTeacherCannotAccessCourse() {
        when(courseRepository.findByIdAndTeacherId("course-1", "teacher-1")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> courseService.getCourseById("course-1", "teacher-1"))
                .isInstanceOf(BusinessException.class)
                .extracting(exception -> ((BusinessException) exception).getErrorCode())
                .isEqualTo(ErrorCode.COURSE_NOT_FOUND);
    }
}
