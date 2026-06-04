package com.example.demo.models;

import com.example.demo.enums.EducationLevel;
import com.example.demo.enums.Section;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.SuperBuilder;

import java.util.HashSet;
import java.util.Set;

@Entity
@Table(name = "courses")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class Course extends BaseEntity {

    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    // Cover image URL for course thumbnail
    @Column(name = "cover_image_url", columnDefinition = "TEXT")
    private String coverImageUrl;

    // Education classification
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private EducationLevel educationLevel;

    // Section/stream for secondary education
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private Section section = Section.NONE;

    // Specific grade/year (e.g., "Bac", "9ème de base", "3ème année")
    @Column(name = "specific_grade")
    private String specificGrade;

    // Subject (e.g., "Mathématiques", "Physique-Chimie", "Arabe")
    @Column(nullable = false)
    private String subject;

    // Pricing model
    @Column(nullable = false)
    @Builder.Default
    private Boolean isFree = true;

    @Column
    private Double price;

    // Relationships
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "teacher_id", nullable = false)
    private User teacher;

    @OneToMany(mappedBy = "course", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private Set<CourseSection> sections = new HashSet<>();

    @OneToMany(mappedBy = "course", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private Set<CourseContent> contents = new HashSet<>();

    @OneToMany(mappedBy = "course", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private Set<CourseEnrollment> enrollments = new HashSet<>();

    @OneToMany(mappedBy = "course", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private Set<SubscriptionKey> subscriptionKeys = new HashSet<>();

    @Column(nullable = false)
    @Builder.Default
    private Boolean isActive = true;

    // Rating and reviews
    @Column(name = "avg_rating")
    @Builder.Default
    private Double avgRating = 0.0;

    @Column(name = "review_count")
    @Builder.Default
    private Integer reviewCount = 0;
}
