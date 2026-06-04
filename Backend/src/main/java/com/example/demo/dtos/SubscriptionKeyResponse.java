package com.example.demo.dtos;

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
public class SubscriptionKeyResponse {

    @JsonProperty("id")
    private String id;

    @JsonProperty("subscription_key")
    private String subscriptionKey;

    @JsonProperty("is_active")
    private boolean active;

    @JsonProperty("course_id")
    private String courseId;

    @JsonProperty("course_name")
    private String courseName;

    @JsonProperty("teacher_id")
    private String teacherId;

    @JsonProperty("created_date")
    private LocalDateTime createdDate;

    @JsonProperty("deactivated_date")
    private LocalDateTime deactivatedDate;
}
