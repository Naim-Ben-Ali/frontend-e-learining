package com.example.demo.services;

import com.example.demo.dtos.SubscriptionRequestResponse;
import com.example.demo.models.StudentTeacher;

import java.util.List;

public interface StudentSubscriptionService {

    /**
     * Subscribe a student to a teacher using a subscription key.
     */
    StudentTeacher subscribeStudentWithKey(String studentId, String subscriptionKey);

    /**
     * Get all students subscribed to a specific teacher.
     */
    List<StudentTeacher> getStudentsByTeacherId(String teacherId);

    /**
     * Check if a student is subscribed to a teacher.
     */
    boolean isStudentSubscribedToTeacher(String studentId, String teacherId);

    /**
     * Unsubscribe a student from a teacher.
     */
    void unsubscribeStudent(String studentId, String teacherId);

    SubscriptionRequestResponse requestTeacherSubscription(String studentId, String teacherId, String requestMessage);

    List<SubscriptionRequestResponse> getTeacherRequests(String teacherId);

    SubscriptionRequestResponse approveRequest(String teacherId, String requestId);

    SubscriptionRequestResponse denyRequest(String teacherId, String requestId);
}
