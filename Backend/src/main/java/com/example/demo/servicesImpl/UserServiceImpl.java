package com.example.demo.servicesImpl;


import com.example.demo.dtos.UserProfileResponse;
import com.example.demo.exceptions.BusinessException;
import com.example.demo.exceptions.ErrorCode;
import com.example.demo.mappers.UserMapper;
import com.example.demo.models.ChangePasswordRequest;
import com.example.demo.models.ProfileUpdateRequest;
import com.example.demo.models.Role;
import com.example.demo.models.RoleSelectionRequest;
import com.example.demo.models.User;
import com.example.demo.repositories.RoleRepository;
import com.example.demo.repositories.UserRepository;
import com.example.demo.services.UserService;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.CollectionUtils;

import java.util.ArrayList;
import java.util.List;


@Service
@RequiredArgsConstructor
@Slf4j
public class UserServiceImpl implements UserService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final UserMapper userMapper;

    @Override
    @Transactional(readOnly = true)
    public UserProfileResponse getCurrentUserProfile(final String userId) {
        final User user = this.userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));

        return UserProfileResponse.builder()
                .id(user.getId())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .email(user.getEmail())
                .phoneNumber(user.getPhoneNumber())
                .dateOfBirth(user.getDateOfBirth())
                .profilePictureUrl(user.getProfilePictureUrl())
                .enabled(user.isEnabled())
                .hasSelectedRole(user.isHasSelectedRole())
                .roles(user.getRoles().stream()
                        .map(Role::getName)
                        .filter(role -> !"ROLE_USER".equals(role))
                        .toList())
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public UserDetails loadUserByUsername(final String userEmail) throws UsernameNotFoundException {
        return this.userRepository.findByEmailIgnoreCase(userEmail)
                .orElseThrow(() -> new UsernameNotFoundException("User not found with username: " + userEmail));
    }

    @Override
    public void updateProfileInfo(final ProfileUpdateRequest request, final String userId) {
        final User savedUser = this.userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));

        if (request.getPhoneNumber() != null
                && !request.getPhoneNumber().equals(savedUser.getPhoneNumber())
                && this.userRepository.existsByPhoneNumber(request.getPhoneNumber())) {
            throw new BusinessException(ErrorCode.PHONE_ALREADY_EXISTS);
        }

        this.userMapper.mergeUserInfo(savedUser, request);
        this.userRepository.save(savedUser);
    }

    @Override
    @Transactional
    public void updateProfilePictureUrl(final String userId, final String profilePictureUrl) {
        final User user = this.userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));
        user.setProfilePictureUrl(profilePictureUrl);
        this.userRepository.save(user);
        log.debug("Updated profile picture URL for user {}", userId);
    }

    @Override
    public void changePassword(final ChangePasswordRequest req, final String userId) {

        if (!req.getNewPassword()
                .equals(req.getConfirmNewPassword())) {
            throw new BusinessException(ErrorCode.CHANGE_PASSWORD_MISMATCH);
        }

        final User savedUser = this.userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));

        if (!this.passwordEncoder.matches(req.getCurrentPassword(),
                savedUser.getPassword())) {
            throw new BusinessException(ErrorCode.INVALID_CURRENT_PASSWORD);
        }

        final String encoded = this.passwordEncoder.encode(req.getNewPassword());
        savedUser.setPassword(encoded);
        this.userRepository.save(savedUser);
    }

    @Override
    public void deactivateAccount(final String userId) {

        final User user = this.userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));

        if (!user.isEnabled()) {
            throw new BusinessException(ErrorCode.ACCOUNT_ALREADY_DEACTIVATED);
        }

        user.setEnabled(false);
        this.userRepository.save(user);
    }

    @Override
    public void reactivateAccount(final String userId) {

        final User user = this.userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));

        if (user.isEnabled()) {
            throw new BusinessException(ErrorCode.ACCOUNT_ALREADY_DEACTIVATED);
        }

        user.setEnabled(true);
        this.userRepository.save(user);
    }

    @Override
    public void deleteAccount(final String userId) {
        // this method need the rest of the entities
        // the logic is just to schedule a profile for deletion
        // and then a scheduled job will pick up the profiles and delete everything
    }

    @Override
    @Transactional
    public void selectRoles(final RoleSelectionRequest request) {
        final User user = this.userRepository.findById(request.getUserId())
                .orElseThrow(() -> new EntityNotFoundException("User not found"));

        log.info("Selecting roles for user: {} - Requested roles: {}", user.getEmail(), request.getSelectedRoles());

        // Remove all existing roles properly using removeRole to maintain bidirectional relationship
        if (!CollectionUtils.isEmpty(user.getRoles())) {
            final List<Role> existingRoles = new ArrayList<>(user.getRoles());
            for (Role role : existingRoles) {
                user.removeRole(role);
            }
            log.debug("Removed existing roles for user: {}", user.getEmail());
        }

        // Add the newly selected roles
        for (String roleName : request.getSelectedRoles()) {
            final Role role = this.roleRepository.findByName(roleName)
                    .orElseThrow(() -> new EntityNotFoundException("Role " + roleName + " not found"));
            user.addRole(role);
            log.debug("Added role {} to user {}", roleName, user.getEmail());
        }

        user.setHasSelectedRole(true);
        this.userRepository.saveAndFlush(user);

        log.info("User {} has successfully selected roles: {}", user.getEmail(), request.getSelectedRoles());
    }

    @Override
    @Transactional
    public void addRoleToUser(final String userId, final List<String> roleNames) {
        final User user = this.userRepository.findById(userId)
                .orElseThrow(() -> new EntityNotFoundException("User not found"));

        for (String roleName : roleNames) {
            final Role role = this.roleRepository.findByName(roleName)
                    .orElseThrow(() -> new EntityNotFoundException("Role " + roleName + " not found"));

            if (!user.getRoles().contains(role)) {
                user.addRole(role);
            }
        }

        this.userRepository.saveAndFlush(user);
        log.debug("Added roles {} to user {}", roleNames, user.getEmail());
    }
}


