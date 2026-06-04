package com.example.demo.dtos;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CourseSectionResponse {

    @JsonProperty("id")
    private String id;

    @JsonProperty("title")
    private String title;

    @JsonProperty("description")
    private String description;

    @JsonProperty("order_index")
    private Integer orderIndex;

    @JsonProperty("is_active")
    private Boolean isActive;

    @JsonProperty("created_date")
    private LocalDateTime createdDate;

    @JsonProperty("contents")
    @Builder.Default
    private List<CourseContentResponse> contents = new ArrayList<>();
}
