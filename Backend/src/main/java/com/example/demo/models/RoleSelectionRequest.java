package com.example.demo.models;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class RoleSelectionRequest {

    @JsonProperty("selected_roles")
    private List<String> selectedRoles; // e.g., ["ROLE_TEACHER", "ROLE_STUDENT"]

    @JsonProperty("user_id")
    private String userId;
}
