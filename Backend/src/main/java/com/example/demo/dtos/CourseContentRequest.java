package com.example.demo.dtos;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CourseContentRequest {

    @NotBlank(message = "Content title is required")
    @Size(min = 3, max = 200, message = "Title must be between 3 and 200 characters")
    private String title;

    @Size(max = 1000, message = "Description must not exceed 1000 characters")
    private String description;

    @NotNull(message = "Content type is required")
    @JsonProperty("type")
    private String type; // DOCUMENT, VIDEO, LINK

    @NotBlank(message = "Content URL is required")
    @JsonProperty("content_url")
    private String contentUrl;

    @JsonProperty("file_size")
    private String fileSize;

    @JsonProperty("file_name")
    private String fileName;

    @JsonProperty("section_id")
    private String sectionId; // Optional: group content into sections

    @JsonProperty("order_index")
    private Integer orderIndex = 0;
}
