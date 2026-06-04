package com.example.demo.dtos;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CourseResponse {

    @JsonProperty("id")
    private String id;

    @JsonProperty("title")
    private String title;

    @JsonProperty("description")
    private String description;

    @JsonProperty("cover_image_url")
    private String coverImageUrl;

    @JsonProperty("education_level")
    private String educationLevel;

    @JsonProperty("section")
    private String section;

    @JsonProperty("specific_grade")
    private String specificGrade;

    @JsonProperty("subject")
    private String subject;

    @JsonProperty("is_free")
    private Boolean isFree;

    @JsonProperty("price")
    private Double price;

    @JsonProperty("teacher_id")
    private String teacherId;

    @JsonProperty("teacher_email")
    private String teacherEmail;

    @JsonProperty("is_active")
    private Boolean isActive;

    @JsonProperty("created_date")
    private LocalDateTime createdDate;

    @JsonProperty("updated_date")
    private LocalDateTime updatedDate;

    @JsonProperty("student_count")
    private Long studentCount;

    @JsonProperty("content_count")
    private Integer contentCount;

    @JsonProperty("contents")
    private List<CourseContentResponse> contents;
}
