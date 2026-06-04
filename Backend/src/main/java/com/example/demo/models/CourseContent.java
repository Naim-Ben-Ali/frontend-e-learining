package com.example.demo.models;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.SuperBuilder;

@Entity
@Table(name = "course_contents")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class CourseContent extends BaseEntity {

    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ContentType type; // DOCUMENT, VIDEO, LINK

    // File URL or link URL depending on type
    @Column(nullable = false)
    private String contentUrl;

    // For display purposes
    @Column
    private String fileSize; // e.g., "5.2 MB"

    @Column
    private String fileName;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "course_id", nullable = false)
    private Course course;

    // Optional section to group content into chapters/modules
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "section_id", nullable = true)
    private CourseSection section;

    @Column(nullable = false)
    private Integer orderIndex = 0; // For ordering content within a course or section

    @Column(nullable = false)
    private Boolean isActive = true;

    public enum ContentType {
        DOCUMENT,
        VIDEO,
        LINK
    }
}
