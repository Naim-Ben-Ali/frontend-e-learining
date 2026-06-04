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
public class CourseContentResponse {

    @JsonProperty("id")
    private String id;

    @JsonProperty("title")
    private String title;

    @JsonProperty("description")
    private String description;

    @JsonProperty("type")
    private String type;

    @JsonProperty("content_url")
    private String contentUrl;

    @JsonProperty("file_size")
    private String fileSize;

    @JsonProperty("file_name")
    private String fileName;

    @JsonProperty("section_id")
    private String sectionId;

    @JsonProperty("order_index")
    private Integer orderIndex;

    @JsonProperty("is_active")
    private Boolean isActive;

    @JsonProperty("created_date")
    private LocalDateTime createdDate;
}
