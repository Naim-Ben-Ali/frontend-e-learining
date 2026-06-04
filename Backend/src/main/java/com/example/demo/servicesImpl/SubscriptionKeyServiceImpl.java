package com.example.demo.servicesImpl;

import com.example.demo.exceptions.BusinessException;
import com.example.demo.exceptions.ErrorCode;
import com.example.demo.models.Course;
import com.example.demo.models.SubscriptionKey;
import com.example.demo.repositories.CourseEnrollmentRepository;
import com.example.demo.repositories.CourseRepository;
import com.example.demo.repositories.StudentSubscriptionRequestRepository;
import com.example.demo.repositories.SubscriptionKeyRepository;
import com.example.demo.repositories.StudentTeacherRepository;
import com.example.demo.services.SubscriptionKeyService;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class SubscriptionKeyServiceImpl implements SubscriptionKeyService {

    private final SubscriptionKeyRepository subscriptionKeyRepository;
    private final StudentTeacherRepository studentTeacherRepository;
    private final CourseRepository courseRepository;
    private final CourseEnrollmentRepository courseEnrollmentRepository;
    private final StudentSubscriptionRequestRepository requestRepository;

    @Override
    @Transactional
    public SubscriptionKey generateKeyForCourse(final String courseId) {
        final Course course = this.courseRepository.findById(courseId)
                .orElseThrow(() -> new EntityNotFoundException("Course not found"));
        requirePaidCourse(course);

        // Check if course already has an active key
        final var existingKey = this.subscriptionKeyRepository.findActiveKeyByCourseId(courseId);
        if (existingKey.isPresent()) {
            log.info("Course '{}' already has an active subscription key", course.getTitle());
            return existingKey.get();
        }

        // Generate new key with course title prefix
        final String newKey = generateUniqueKey(course.getTitle());
        final SubscriptionKey subscriptionKey = SubscriptionKey.builder()
                .subscriptionKey(newKey)
                .course(course)
                .active(true)
                .build();

        this.subscriptionKeyRepository.save(subscriptionKey);
        log.info("Generated new subscription key for course: {}", course.getTitle());
        return subscriptionKey;
    }

    @Override
    @Transactional
    public void deactivateAllKeysForCourse(final String courseId) {
        final List<SubscriptionKey> keys = this.subscriptionKeyRepository.findAllByCourseId(courseId);
        if (keys.isEmpty()) {
            return;
        }
        final LocalDateTime now = LocalDateTime.now();
        boolean changed = false;
        for (final SubscriptionKey key : keys) {
            if (key.isActive()) {
                key.setActive(false);
                key.setDeactivatedDate(now);
                changed = true;
            }
        }
        if (changed) {
            this.subscriptionKeyRepository.saveAll(keys);
            log.info("Deactivated subscription keys for course {}", courseId);
        }
    }

    @Override
    @Transactional(readOnly = true)
    public SubscriptionKey getActiveKeyByCourseId(final String courseId) {
        return this.subscriptionKeyRepository.findActiveKeyByCourseId(courseId)
                .orElseThrow(() -> new EntityNotFoundException("No active subscription key found for course"));
    }

    @Override
    @Transactional(readOnly = true)
    public List<SubscriptionKey> getAllKeysByCourseId(final String courseId) {
        return this.subscriptionKeyRepository.findAllByCourseId(courseId);
    }

    @Override
    @Transactional
    public SubscriptionKey regenerateKeyForCourse(final String courseId) {
        final Course course = this.courseRepository.findById(courseId)
                .orElseThrow(() -> new EntityNotFoundException("Course not found"));
        requirePaidCourse(course);

        // Get the current active key
        final SubscriptionKey oldKey = this.subscriptionKeyRepository.findActiveKeyByCourseId(courseId)
                .orElseThrow(() -> new EntityNotFoundException("No active subscription key found for course"));

        // Deactivate the old key
        oldKey.setActive(false);
        oldKey.setDeactivatedDate(LocalDateTime.now());
        this.subscriptionKeyRepository.save(oldKey);

        // Remove all active teacher subscriptions created with the old key
        final int removedSubscriptionsCount = this.studentTeacherRepository
                .deactivateActiveBySubscriptionKeyId(oldKey.getId());

        // Unenroll all active students from this course
        final int removedEnrollmentsCount = this.courseEnrollmentRepository
                .deactivateAllActiveByCourseId(courseId);

        // Revoke old approvals so students must request access again
        final int revokedApprovalsCount = this.requestRepository.revokeApprovedRequestsByCourseId(courseId);

        log.info("Deactivated old key for course '{}'. Deactivated {} subscriptions, {} course enrollments, revoked {} approvals",
                course.getTitle(), removedSubscriptionsCount, removedEnrollmentsCount, revokedApprovalsCount);

        // Generate new key with course title prefix
        final String newKeyString = generateUniqueKey(course.getTitle());
        final SubscriptionKey newKey = SubscriptionKey.builder()
                .subscriptionKey(newKeyString)
                .course(course)
                .active(true)
                .build();

        this.subscriptionKeyRepository.save(newKey);
        log.info("Generated new subscription key for course: {}", course.getTitle());
        return newKey;
    }

    @Override
    @Transactional(readOnly = true)
    public boolean isKeyValid(final String key) {
        return this.subscriptionKeyRepository.findByKey(key)
                .map(sk -> sk.isActive() && Boolean.FALSE.equals(sk.getCourse().getIsFree()))
                .orElse(false);
    }

    @Override
    @Transactional(readOnly = true)
    public String getCourseIdByKey(final String key) {
        return this.subscriptionKeyRepository.findByKey(key)
                .map(sk -> sk.getCourse().getId())
                .orElseThrow(() -> new EntityNotFoundException("Subscription key not found"));
    }

    @Override
    @Transactional(readOnly = true)
    public List<SubscriptionKey> getActiveKeysForTeacher(final String teacherId) {
        return this.subscriptionKeyRepository.findActiveKeysByTeacherId(teacherId).stream()
                .filter(sk -> Boolean.FALSE.equals(sk.getCourse().getIsFree()))
                .toList();
    }

    private String generateUniqueKey(final String name) {
        String key;
        do {
            // Format: First 2 letters of name (uppercase) + 12 random alphanumeric characters
            final String namePrefix = name.substring(0, Math.min(2, name.length())).toUpperCase();
            final String randomPart = UUID.randomUUID().toString().replace("-", "").substring(0, 12).toUpperCase();
            key = namePrefix + randomPart;
        } while (this.subscriptionKeyRepository.findByKey(key).isPresent());
        return key;
    }

    private static void requirePaidCourse(final Course course) {
        if (Boolean.TRUE.equals(course.getIsFree())) {
            throw new BusinessException(ErrorCode.SUBSCRIPTION_KEY_NOT_APPLICABLE);
        }
    }
}
