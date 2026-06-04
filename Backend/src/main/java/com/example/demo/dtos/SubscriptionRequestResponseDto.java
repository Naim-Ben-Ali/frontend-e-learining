package com.example.demo.dtos;

import com.example.demo.models.SubscriptionRequestStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SubscriptionRequestResponseDto {
    private String id;
    private String studentId;
    private String studentName;
    private String studentEmail;
    private String teacherId;
    private String courseId;
    private String courseName;
    private String requestMessage;
    private SubscriptionRequestStatus status;
    private LocalDateTime createdDate;
    private LocalDateTime respondedDate;
    private String subscriptionKey; // Only populated if approved
}
