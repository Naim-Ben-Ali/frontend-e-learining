package com.example.demo.dtos;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EnrollmentResponse {
    private String enrollmentId;
    private String courseId;
    private String courseTitle;
    private String teacherName;
    private String coverImageUrl;
    private String subject;
    private Boolean isActive;
    private Long enrolledAt;
}
