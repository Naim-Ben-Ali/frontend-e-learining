package com.example.demo.dtos;

import com.example.demo.enums.EducationLevel;
import com.example.demo.enums.Section;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StudentCourseResponse {
    private String id;
    private String title;
    private String description;
    private String coverImageUrl;
    private EducationLevel educationLevel;
    private Section section;
    private String specificGrade;
    private String subject;
    private Boolean isFree;
    private Double price;
    private String teacherName;
    private String teacherId;
    private Long enrollmentCount;
    private Boolean isEnrolled;
    private Double rating;
    private Integer reviewCount;
    private Long createdAt;
}
