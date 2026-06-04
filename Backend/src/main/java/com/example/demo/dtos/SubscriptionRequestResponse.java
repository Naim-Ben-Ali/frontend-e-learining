package com.example.demo.dtos;

import com.example.demo.models.SubscriptionRequestStatus;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SubscriptionRequestResponse {

    @JsonProperty("id")
    private String id;

    @JsonProperty("student_id")
    private String studentId;

    @JsonProperty("student_name")
    private String studentName;

    @JsonProperty("student_email")
    private String studentEmail;

    @JsonProperty("teacher_id")
    private String teacherId;

    @JsonProperty("teacher_name")
    private String teacherName;

    @JsonProperty("request_message")
    private String requestMessage;

    @JsonProperty("status")
    private SubscriptionRequestStatus status;

    @JsonProperty("created_date")
    private LocalDateTime createdDate;

    @JsonProperty("responded_date")
    private LocalDateTime respondedDate;
}
