package com.example.demo.dtos;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CreateCourseRequest {

    @NotBlank(message = "Course title is required")
    @Size(min = 3, max = 200, message = "Title must be between 3 and 200 characters")
    private String title;

    @Size(max = 2000, message = "Description must not exceed 2000 characters")
    private String description;

    @JsonProperty("cover_image_url")
    private String coverImageUrl;

    @NotBlank(message = "Education level is required")
    @JsonProperty("education_level")
    private String educationLevel;

    private String section;

    @JsonProperty("specific_grade")
    private String specificGrade;

    @NotBlank(message = "Subject is required")
    @Size(min = 2, max = 100, message = "Subject must be between 2 and 100 characters")
    private String subject;

    @NotNull(message = "Course type (free/paid) must be specified")
    @JsonProperty("is_free")
    private Boolean isFree;

    @DecimalMin(value = "0.01", message = "Price must be greater than 0 for paid courses")
    @DecimalMax(value = "99999.99", message = "Price must be less than 100000")
    private Double price;
}
