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
public class CourseEnrollmentResponse {

    @JsonProperty("id")
    private String id;

    @JsonProperty("course_id")
    private String courseId;

    @JsonProperty("student_id")
    private String studentId;

    @JsonProperty("student_email")
    private String studentEmail;

    @JsonProperty("student_name")
    private String studentName;

    @JsonProperty("is_active")
    private Boolean isActive;

    @JsonProperty("enrolled_date")
    private LocalDateTime enrolledDate;
}
