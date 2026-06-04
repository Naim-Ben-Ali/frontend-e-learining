package com.example.demo.servicesImpl;


import com.example.demo.dtos.SubscriptionRequestResponse;
import com.example.demo.exceptions.BusinessException;
import com.example.demo.exceptions.ErrorCode;
import com.example.demo.models.Course;
import com.example.demo.models.StudentSubscriptionRequestEntity;
import com.example.demo.models.StudentTeacher;
import com.example.demo.models.SubscriptionKey;
import com.example.demo.models.SubscriptionRequestStatus;
import com.example.demo.models.User;
import com.example.demo.repositories.StudentSubscriptionRequestRepository;
import com.example.demo.repositories.StudentTeacherRepository;
import com.example.demo.repositories.SubscriptionKeyRepository;
import com.example.demo.repositories.UserRepository;
import com.example.demo.services.StudentSubscriptionService;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class StudentSubscriptionServiceImpl implements StudentSubscriptionService {

    private final StudentTeacherRepository studentTeacherRepository;
    private final StudentSubscriptionRequestRepository requestRepository;
    private final SubscriptionKeyRepository subscriptionKeyRepository;
    private final UserRepository userRepository;

    @Override
    @Transactional
    public StudentTeacher subscribeStudentWithKey(final String studentId, final String subscriptionKey) {
        final User student = this.userRepository.findById(studentId)
                .orElseThrow(() -> new EntityNotFoundException("Student not found"));

        final SubscriptionKey key = this.subscriptionKeyRepository.findByKey(subscriptionKey)
                .orElseThrow(() -> new EntityNotFoundException("Subscription key not found or invalid"));

        if (!key.isActive()) {
            throw new IllegalArgumentException("Subscription key is no longer active");
        }

        // Get the teacher from the course associated with this key
        final User teacher = key.getCourse().getTeacher();
        final Course course = key.getCourse();

        // Student must have a current APPROVED request for this specific course.
        final var latestRequest = this.requestRepository.findTopByStudentAndCourseOrderByCreatedDateDesc(student, course)
                .orElseThrow(() -> new BusinessException(ErrorCode.FORBIDDEN_RESOURCE, "Request approval required for this course"));
        if (latestRequest.getStatus() != SubscriptionRequestStatus.APPROVED) {
            throw new BusinessException(ErrorCode.FORBIDDEN_RESOURCE, "Request approval required for this course");
        }
        if (latestRequest.getRespondedDate() == null || latestRequest.getRespondedDate().isBefore(key.getCreatedDate())) {
            throw new BusinessException(ErrorCode.FORBIDDEN_RESOURCE, "Request approval required for this course");
        }

        // Check if student is already subscribed to this teacher
        final var existingSubscription = this.studentTeacherRepository
                .findActiveSubscription(studentId, teacher.getId());

        if (existingSubscription.isPresent()) {
            log.info("Student {} is already subscribed to teacher {}", student.getEmail(), teacher.getEmail());
            return existingSubscription.get();
        }

        // Create new subscription
        final StudentTeacher subscription = StudentTeacher.builder()
                .student(student)
                .teacher(teacher)
                .subscriptionKey(key)
                .active(true)
                .build();

        this.studentTeacherRepository.save(subscription);
        log.info("Student {} subscribed to teacher {} using course key for course: {}",
                student.getEmail(), teacher.getEmail(), key.getCourse().getTitle());
        return subscription;
    }

    @Override
    @Transactional(readOnly = true)
    public List<StudentTeacher> getStudentsByTeacherId(final String teacherId) {
        return this.studentTeacherRepository.findAllActiveSubscribersByTeacherId(teacherId);
    }

    @Override
    @Transactional(readOnly = true)
    public boolean isStudentSubscribedToTeacher(final String studentId, final String teacherId) {
        return this.studentTeacherRepository.findActiveSubscription(studentId, teacherId).isPresent();
    }

    @Override
    @Transactional
    public void unsubscribeStudent(final String studentId, final String teacherId) {
        final StudentTeacher subscription = this.studentTeacherRepository
                .findActiveSubscription(studentId, teacherId)
                .orElseThrow(() -> new EntityNotFoundException("Subscription not found"));

        subscription.setActive(false);
        this.studentTeacherRepository.save(subscription);

        final User student = this.userRepository.findById(studentId).orElseThrow();
        final User teacher = this.userRepository.findById(teacherId).orElseThrow();
        log.info("Student {} unsubscribed from teacher {}", student.getEmail(), teacher.getEmail());
    }

    @Override
    @Transactional
    public SubscriptionRequestResponse requestTeacherSubscription(final String studentId, final String teacherId, final String requestMessage) {
        if (isStudentSubscribedToTeacher(studentId, teacherId)) {
            throw new BusinessException(ErrorCode.CONFLICT, "Student is already subscribed to this teacher");
        }

        if (this.requestRepository.hasPendingRequest(studentId, teacherId)) {
            throw new BusinessException(ErrorCode.SUBSCRIPTION_REQUEST_ALREADY_EXISTS);
        }

        final User student = this.userRepository.findById(studentId)
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));
        final User teacher = this.userRepository.findById(teacherId)
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));

        final StudentSubscriptionRequestEntity request = this.requestRepository.save(
                StudentSubscriptionRequestEntity.builder()
                        .student(student)
                        .teacher(teacher)
                        .requestMessage(requestMessage)
                        .status(SubscriptionRequestStatus.PENDING)
                        .build()
        );

        return toResponse(request);
    }

    @Override
    @Transactional(readOnly = true)
    public List<SubscriptionRequestResponse> getTeacherRequests(final String teacherId) {
        return this.requestRepository.findAllByTeacherId(teacherId).stream()
                .map(this::toResponse)
                .toList();
    }

    @Override
    @Transactional
    public SubscriptionRequestResponse approveRequest(final String teacherId, final String requestId) {
        final StudentSubscriptionRequestEntity request = getTeacherRequest(teacherId, requestId);
        request.setStatus(SubscriptionRequestStatus.APPROVED);
        request.setRespondedDate(LocalDateTime.now());

        // Get the course-specific subscription key for the requested course
        final SubscriptionKey activeKey = this.subscriptionKeyRepository.findActiveKeyByCourseId(request.getCourse().getId())
                .orElseThrow(() -> new BusinessException(ErrorCode.INVALID_OAUTH_CONFIGURATION, "Course has no active subscription key"));

        subscribeStudentWithKey(request.getStudent().getId(), activeKey.getSubscriptionKey());
        return toResponse(this.requestRepository.save(request));
    }

    @Override
    @Transactional
    public SubscriptionRequestResponse denyRequest(final String teacherId, final String requestId) {
        final StudentSubscriptionRequestEntity request = getTeacherRequest(teacherId, requestId);
        request.setStatus(SubscriptionRequestStatus.DENIED);
        request.setRespondedDate(LocalDateTime.now());
        return toResponse(this.requestRepository.save(request));
    }

    private StudentSubscriptionRequestEntity getTeacherRequest(final String teacherId, final String requestId) {
        final StudentSubscriptionRequestEntity request = this.requestRepository.findById(requestId)
                .orElseThrow(() -> new BusinessException(ErrorCode.SUBSCRIPTION_REQUEST_NOT_FOUND));

        if (!request.getTeacher().getId().equals(teacherId)) {
            throw new BusinessException(ErrorCode.FORBIDDEN_RESOURCE);
        }
        return request;
    }

    private SubscriptionRequestResponse toResponse(final StudentSubscriptionRequestEntity request) {
        return SubscriptionRequestResponse.builder()
                .id(request.getId())
                .studentId(request.getStudent().getId())
                .studentName(request.getStudent().getFullName())
                .studentEmail(request.getStudent().getEmail())
                .teacherId(request.getTeacher().getId())
                .teacherName(request.getTeacher().getFullName())
                .requestMessage(request.getRequestMessage())
                .status(request.getStatus())
                .createdDate(request.getCreatedDate())
                .respondedDate(request.getRespondedDate())
                .build();
    }
}
