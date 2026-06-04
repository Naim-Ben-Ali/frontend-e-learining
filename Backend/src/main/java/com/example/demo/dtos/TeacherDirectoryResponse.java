package com.example.demo.dtos;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TeacherDirectoryResponse {

    @JsonProperty("teacher_id")
    private String teacherId;

    @JsonProperty("first_name")
    private String firstName;

    @JsonProperty("last_name")
    private String lastName;

    @JsonProperty("full_name")
    private String fullName;

    @JsonProperty("email")
    private String email;

    @JsonProperty("profile_picture_url")
    private String profilePictureUrl;

    @JsonProperty("course_count")
    private long courseCount;

    @JsonProperty("student_count")
    private long studentCount;

    @JsonProperty("subscribed")
    private boolean subscribed;

    @JsonProperty("pending_request")
    private boolean pendingRequest;
}
