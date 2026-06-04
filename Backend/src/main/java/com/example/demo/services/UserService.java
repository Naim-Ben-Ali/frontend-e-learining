package com.example.demo.services;


import com.example.demo.dtos.UserProfileResponse;
import com.example.demo.models.ChangePasswordRequest;
import com.example.demo.models.ProfileUpdateRequest;
import com.example.demo.models.RoleSelectionRequest;
import org.springframework.security.core.userdetails.UserDetailsService;

import java.util.List;

public interface UserService extends UserDetailsService {

    UserProfileResponse getCurrentUserProfile(String userId);

    void updateProfileInfo(ProfileUpdateRequest request, String userId);

    void updateProfilePictureUrl(String userId, String profilePictureUrl);

    void changePassword(ChangePasswordRequest request, String userId);

    void deactivateAccount(String userId);

    void reactivateAccount(String userId);

    void deleteAccount(String userId);

    void selectRoles(RoleSelectionRequest request);

    void addRoleToUser(String userId, List<String> roleNames);
}
