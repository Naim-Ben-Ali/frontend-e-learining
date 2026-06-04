package com.example.demo.controllers;

import com.example.demo.dtos.UserProfileResponse;
import com.example.demo.exceptions.BusinessException;
import com.example.demo.exceptions.ErrorCode;
import com.example.demo.models.ChangePasswordRequest;
import com.example.demo.models.ProfileUpdateRequest;
import com.example.demo.models.RoleSelectionRequest;
import com.example.demo.models.User;
import com.example.demo.services.UserService;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
@Tag(name = "User", description = "User API")
public class UserController {

    private final UserService service;

    @GetMapping("/me")
    public ResponseEntity<UserProfileResponse> getCurrentUser(final Authentication principal) {
        return ResponseEntity.ok(this.service.getCurrentUserProfile(getUserId(principal)));
    }

    @PatchMapping("/me")
    @ResponseStatus(code = HttpStatus.NO_CONTENT)
    public void updateProfile(
            @RequestBody
            @Valid
            final ProfileUpdateRequest request,
            final Authentication principal) {
        this.service.updateProfileInfo(request, getUserId(principal));
    }

    @PostMapping("/me/password")
    @ResponseStatus(code = HttpStatus.NO_CONTENT)
    public void changePassword(
            @RequestBody
            @Valid
            final ChangePasswordRequest request,
            final Authentication principal) {
        this.service.changePassword(request, getUserId(principal));
    }

    @PatchMapping("/me/deactivate")
    @ResponseStatus(code = HttpStatus.NO_CONTENT)
    public void deactivateAccount(final Authentication principal) {
        this.service.deactivateAccount(getUserId(principal));
    }

    @PatchMapping("/me/reactivate")
    @ResponseStatus(code = HttpStatus.NO_CONTENT)
    public void reactivateAccount(final Authentication principal) {
        this.service.reactivateAccount(getUserId(principal));
    }

    @DeleteMapping("/me")
    @ResponseStatus(code = HttpStatus.NO_CONTENT)
    public void deleteAccount(final Authentication principal) {
        this.service.deleteAccount(getUserId(principal));
    }

    @PostMapping("/select-roles")
    @ResponseStatus(code = HttpStatus.OK)
    public ResponseEntity<Map<String, String>> selectRoles(
            @RequestBody
            @Valid
            final RoleSelectionRequest request,
            final Authentication authentication) {
        // Use authenticated user ID, don't trust the one from request body
        final String authenticatedUserId = getUserId(authentication);

        // Validate that the user is selecting roles for themselves
        if (!authenticatedUserId.equals(request.getUserId())) {
            throw new BusinessException(ErrorCode.UNAUTHORIZED);
        }

        this.service.selectRoles(request);
        return ResponseEntity.ok(Map.of(
                "message", "Roles selected successfully",
                "status", "success"
        ));
    }

    private String getUserId(final Authentication authentication) {
        return ((User) authentication.getPrincipal()).getId();
    }


}

