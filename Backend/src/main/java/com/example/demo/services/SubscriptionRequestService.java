package com.example.demo.services;

import com.example.demo.dtos.NotificationCountDto;
import com.example.demo.dtos.SubscriptionRequestActionDto;
import com.example.demo.dtos.SubscriptionRequestCreateDto;
import com.example.demo.dtos.SubscriptionRequestResponseDto;
import com.example.demo.exceptions.BusinessException;
import com.example.demo.exceptions.ErrorCode;
import com.example.demo.models.Course;
import com.example.demo.models.StudentSubscriptionRequestEntity;
import com.example.demo.models.SubscriptionKey;
import com.example.demo.models.SubscriptionRequestStatus;
import com.example.demo.models.User;
import com.example.demo.repositories.CourseRepository;
import com.example.demo.repositories.StudentSubscriptionRequestRepository;
import com.example.demo.repositories.SubscriptionKeyRepository;
import com.example.demo.repositories.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class SubscriptionRequestService {

    private final StudentSubscriptionRequestRepository requestRepository;
    private final SubscriptionKeyRepository keyRepository;
    private final UserRepository userRepository;
    private final CourseRepository courseRepository;

    /**
     * Student requests a subscription key for a course
     */
    @Transactional
    public SubscriptionRequestResponseDto requestSubscriptionKey(String studentId, SubscriptionRequestCreateDto dto) {
        log.info("Student {} requesting subscription key for course {}", studentId, dto.getCourseId());

        User student = userRepository.findById(studentId)
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));

        User teacher = userRepository.findById(dto.getTeacherId())
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));

        Course course = courseRepository.findById(dto.getCourseId())
                .orElseThrow(() -> new BusinessException(ErrorCode.INTERNAL_EXCEPTION));

        // Check if request already exists
        boolean exists = requestRepository.existsByStudentAndCourseAndStatus(
                student,
                course,
                SubscriptionRequestStatus.PENDING
        );

        if (exists) {
            throw new BusinessException(ErrorCode.INTERNAL_EXCEPTION, "Request already pending for this course");
        }

        boolean blocked = requestRepository.existsByStudentAndCourseAndStatus(
                student,
                course,
                SubscriptionRequestStatus.BLOCKED
        );

        if (blocked) {
            throw new BusinessException(ErrorCode.FORBIDDEN_RESOURCE, "You are blocked from requesting this course");
        }

        StudentSubscriptionRequestEntity request = StudentSubscriptionRequestEntity.builder()
                .student(student)
                .teacher(teacher)
                .course(course)
                .requestMessage(dto.getRequestMessage())
                .status(SubscriptionRequestStatus.PENDING)
                .build();

        StudentSubscriptionRequestEntity saved = requestRepository.save(request);
        log.info("Subscription request created: {}", saved.getId());

        return mapToResponseDto(saved);
    }

    /**
     * Get all pending requests for a teacher
     */
    @Transactional(readOnly = true)
    public List<SubscriptionRequestResponseDto> getTeacherPendingRequests(String teacherId) {
        log.info("Fetching pending requests for teacher {}", teacherId);

        User teacher = userRepository.findById(teacherId)
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));

        List<StudentSubscriptionRequestEntity> requests = requestRepository
                .findByTeacherAndStatus(teacher, SubscriptionRequestStatus.PENDING);

        return requests.stream().map(this::mapToResponseDto).collect(Collectors.toList());
    }

    /**
     * Get all request states for a student
     */
    @Transactional(readOnly = true)
    public List<SubscriptionRequestResponseDto> getStudentResponses(String studentId) {
        log.info("Fetching responses for student {}", studentId);

        User student = userRepository.findById(studentId)
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));

        List<StudentSubscriptionRequestEntity> requests = requestRepository
                .findByStudentAndStatusIn(
                        student,
                        List.of(
                                SubscriptionRequestStatus.PENDING,
                                SubscriptionRequestStatus.APPROVED,
                                SubscriptionRequestStatus.DENIED,
                                SubscriptionRequestStatus.BLOCKED
                        )
                );

        return requests.stream().map(this::mapToResponseDto).collect(Collectors.toList());
    }

    /**
     * Teacher approves or denies a subscription request
     */
    @Transactional
    public SubscriptionRequestResponseDto respondToRequest(String teacherId, SubscriptionRequestActionDto dto) {
        log.info("Teacher {} responding to request {} with action {}", teacherId, dto.getRequestId(), dto.getAction());

        StudentSubscriptionRequestEntity request = requestRepository.findById(dto.getRequestId())
                .orElseThrow(() -> new BusinessException(ErrorCode.INTERNAL_EXCEPTION, "Request not found"));

        // Verify the teacher owns this request
        if (!request.getTeacher().getId().equals(teacherId)) {
            throw new BusinessException(ErrorCode.INTERNAL_EXCEPTION, "Unauthorized to respond to this request");
        }

        request.setStatus(dto.getAction());

        // If approved, ensure an active subscription key exists for this course (reuse if present)
        if (dto.getAction() == SubscriptionRequestStatus.APPROVED) {
            Course course = request.getCourse();
            Optional<SubscriptionKey> existing = keyRepository.findActiveKeyByCourseId(course.getId());
            if (existing.isEmpty()) {
                String keyCode = generateUniqueKey();
                SubscriptionKey key = SubscriptionKey.builder()
                        .subscriptionKey(keyCode)
                        .course(course)
                        .active(true)
                        .build();
                keyRepository.save(key);
                log.info("Created subscription key: {}", keyCode);
            }
        }

        request.setRespondedDate(LocalDateTime.now());
        StudentSubscriptionRequestEntity updated = requestRepository.save(request);
        return mapToResponseDto(updated);
    }

    /**
     * Count pending notifications for a teacher
     */
    @Transactional(readOnly = true)
    public long countTeacherNotifications(String teacherId) {
        User teacher = userRepository.findById(teacherId)
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));

        return requestRepository.countByTeacherAndStatus(teacher, SubscriptionRequestStatus.PENDING);
    }

    /**
     * Count pending responses for a student
     */
    @Transactional(readOnly = true)
    public long countStudentNotifications(String studentId) {
        User student = userRepository.findById(studentId)
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));

        return requestRepository.countByStudentAndStatusIn(
                student,
                List.of(
                        SubscriptionRequestStatus.APPROVED,
                        SubscriptionRequestStatus.DENIED,
                        SubscriptionRequestStatus.BLOCKED
                )
        );
    }

    /**
     * Get notification count DTO
     */
    @Transactional(readOnly = true)
    public NotificationCountDto getNotificationCount(String userId, String userRole) {
        NotificationCountDto dto = new NotificationCountDto();

        if ("ROLE_TEACHER".equals(userRole)) {
            long pending = countTeacherNotifications(userId);
            dto.setPendingRequests(pending);
            dto.setTotalNotifications(pending);
        } else if ("ROLE_STUDENT".equals(userRole)) {
            long pending = countStudentNotifications(userId);
            dto.setPendingResponses(pending);
            dto.setTotalNotifications(pending);
        }

        return dto;
    }

    /**
     * Generate a unique subscription key
     */
    private String generateUniqueKey() {
        String key;
        do {
            key = UUID.randomUUID().toString().replace("-", "").substring(0, 16).toUpperCase();
        } while (keyRepository.existsBySubscriptionKey(key));
        return key;
    }

    /**
     * Map entity to DTO
     */
    private SubscriptionRequestResponseDto mapToResponseDto(StudentSubscriptionRequestEntity entity) {
        SubscriptionRequestResponseDto dto = SubscriptionRequestResponseDto.builder()
                .id(entity.getId())
                .studentId(entity.getStudent().getId())
                .studentName(entity.getStudent().getFirstName() + " " + entity.getStudent().getLastName())
                .studentEmail(entity.getStudent().getEmail())
                .teacherId(entity.getTeacher().getId())
                .courseId(entity.getCourse().getId())
                .courseName(entity.getCourse().getTitle())
                .requestMessage(entity.getRequestMessage())
                .status(entity.getStatus())
                .createdDate(entity.getCreatedDate())
                .respondedDate(entity.getRespondedDate())
                .build();

        // If approved, fetch the active subscription key for this course
        if (entity.getStatus() == SubscriptionRequestStatus.APPROVED) {
            keyRepository.findActiveKeyByCourseId(entity.getCourse().getId())
                    .ifPresent(key -> dto.setSubscriptionKey(key.getSubscriptionKey()));
        }

        return dto;
    }
}
