package com.example.demo.repositories;

import com.example.demo.models.SubscriptionKey;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SubscriptionKeyRepository extends JpaRepository<SubscriptionKey, String> {

    @Query("SELECT sk FROM SubscriptionKey sk WHERE sk.course.id = :courseId AND sk.active = true")
    Optional<SubscriptionKey> findActiveKeyByCourseId(@Param("courseId") String courseId);

    @Query("SELECT sk FROM SubscriptionKey sk WHERE sk.subscriptionKey = :key")
    Optional<SubscriptionKey> findByKey(@Param("key") String key);

    @Query("SELECT sk FROM SubscriptionKey sk WHERE sk.course.id = :courseId ORDER BY sk.createdDate DESC")
    List<SubscriptionKey> findAllByCourseId(@Param("courseId") String courseId);

    @Query("SELECT sk FROM SubscriptionKey sk WHERE sk.course.teacher.id = :teacherId AND sk.active = true ORDER BY sk.createdDate DESC")
    List<SubscriptionKey> findActiveKeysByTeacherId(@Param("teacherId") String teacherId);

    @Query("SELECT sk FROM SubscriptionKey sk WHERE sk.course.teacher.id = :teacherId ORDER BY sk.createdDate DESC")
    List<SubscriptionKey> findAllByTeacherId(@Param("teacherId") String teacherId);

    boolean existsBySubscriptionKey(String subscriptionKey);

    @Query("SELECT sk FROM SubscriptionKey sk WHERE sk.course.teacher.id = :teacherId AND sk.active = true LIMIT 1")
    Optional<SubscriptionKey> findFirstActiveByTeacherId(@Param("teacherId") String teacherId);
}
