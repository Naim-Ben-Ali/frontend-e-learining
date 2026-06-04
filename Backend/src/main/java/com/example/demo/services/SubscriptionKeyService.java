package com.example.demo.services;

import com.example.demo.models.SubscriptionKey;

public interface SubscriptionKeyService {

    /**
     * Generate a new subscription key for a course.
     * If a key already exists and is active, it remains active.
     * This creates an initial key if none exists.
     */
    SubscriptionKey generateKeyForCourse(String courseId);

    /**
     * Get the currently active subscription key for a course.
     */
    SubscriptionKey getActiveKeyByCourseId(String courseId);

    /**
     * Get all subscription keys for a course (active and inactive).
     */
    java.util.List<SubscriptionKey> getAllKeysByCourseId(String courseId);

    /**
     * Regenerate a subscription key for a course.
     * This deactivates the current key and creates a new one.
     * All students enrolled with the old key are removed/unenrolled.
     */
    SubscriptionKey regenerateKeyForCourse(String courseId);

    /**
     * Verify if a subscription key is valid and active.
     */
    boolean isKeyValid(String key);

    /**
     * Get the course ID associated with a subscription key.
     */
    String getCourseIdByKey(String key);

    /**
     * Get all active keys for a teacher's courses.
     */
    java.util.List<SubscriptionKey> getActiveKeysForTeacher(String teacherId);

    /**
     * Deactivate every subscription key for a course (e.g. when a course becomes free).
     */
    void deactivateAllKeysForCourse(String courseId);
}
