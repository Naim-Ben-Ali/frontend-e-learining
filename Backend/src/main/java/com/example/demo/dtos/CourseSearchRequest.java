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
public class CourseSearchRequest {
    private String searchQuery;
    private EducationLevel educationLevel;
    private Section section;
    private String subject;
    private String specificGrade;
    private Boolean isFree;
    private Integer page;
    private Integer pageSize;
    private String sortBy; // "LATEST", "POPULAR", "RATING", "RELEVANCE"
}
