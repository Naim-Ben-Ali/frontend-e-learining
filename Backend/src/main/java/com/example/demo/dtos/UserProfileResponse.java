package com.example.demo.dtos;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserProfileResponse {

    @JsonProperty("id")
    private String id;

    @JsonProperty("first_name")
    private String firstName;

    @JsonProperty("last_name")
    private String lastName;

    @JsonProperty("email")
    private String email;

    @JsonProperty("phone_number")
    private String phoneNumber;

    @JsonProperty("date_of_birth")
    private LocalDate dateOfBirth;

    @JsonProperty("profile_picture_url")
    private String profilePictureUrl;

    @JsonProperty("roles")
    private List<String> roles;

    @JsonProperty("enabled")
    private boolean enabled;

    @JsonProperty("has_selected_role")
    private boolean hasSelectedRole;
}
