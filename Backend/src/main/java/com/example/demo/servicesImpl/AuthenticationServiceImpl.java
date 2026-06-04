package com.example.demo.servicesImpl;

import com.example.demo.exceptions.BusinessException;
import com.example.demo.exceptions.ErrorCode;
import com.example.demo.mappers.UserMapper;
import com.example.demo.models.*;
import com.example.demo.repositories.RoleRepository;
import com.example.demo.repositories.UserRepository;
import com.example.demo.services.AuthenticationService;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthenticationServiceImpl implements AuthenticationService {

    private final AuthenticationManager authenticationManager;
    private final JWTService jwtService;
    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final UserMapper userMapper;

    @Override
    @Transactional
    public AuthenticationResponse login(final AuthenticationRequest request) {
        final Authentication auth = this.authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        request.getEmail(),
                        request.getPassword()
                )
        );

        // Get fresh user from database to ensure it's managed by current session
        final User authUser = (User) auth.getPrincipal();
        final User user = this.userRepository.findByEmailIgnoreCase(authUser.getEmail())
                .orElseThrow(() -> new EntityNotFoundException("User not found"));

        final String token = this.jwtService.generateAccessToken(user.getUsername());
        final String refreshToken = this.jwtService.generateRefreshToken(user.getUsername());

        // Save tokens to database with expiration times
        LocalDateTime accessTokenExpiration = LocalDateTime.now().plusHours(24);
        LocalDateTime refreshTokenExpiration = LocalDateTime.now().plusDays(7);
        this.jwtService.saveToken(token, user, accessTokenExpiration);
        this.jwtService.saveToken(refreshToken, user, refreshTokenExpiration);

        log.debug("Tokens saved successfully for user: {}", user.getEmail());

        final String tokenType = "Bearer";

        // Check if user needs to select role (first login)
        final Boolean requiresRoleSelection = !user.isHasSelectedRole();

        // Extract role names (excluding ROLE_USER which is default)
        final List<String> roleNames = user.getRoles().stream()
                .map(Role::getName)
                .filter(name -> !name.equals("ROLE_USER")) // Exclude default role
                .toList();

        return AuthenticationResponse.builder()
                .accessToken(token)
                .refreshToken(refreshToken)
                .tokenType(tokenType)
                .requiresRoleSelection(requiresRoleSelection)
                .userId(user.getId())
                .email(user.getEmail())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .profilePictureUrl(user.getProfilePictureUrl())
                .roles(roleNames)
                .build();
    }

    @Override
    @Transactional
    public void register(final RegistrationRequest request) {
        checkUserEmail(request.getEmail());
        checkUserPhoneNumber(request.getPhoneNumber());
        checkPasswords(request.getPassword(), request.getConfirmPassword());

        final Role userRole = this.roleRepository.findByName("ROLE_USER")
                .orElseThrow(() -> new EntityNotFoundException("Role user does not exist"));
        final List<Role> roles = new ArrayList<>();
        roles.add(userRole);

        final User user = this.userMapper.toUser(request);
        user.setRoles(roles);

        // Ensure firstName and lastName are persisted
        log.debug("Saving user {} with firstName: {}, lastName: {}",
                user.getEmail(), user.getFirstName(), user.getLastName());
        final User savedUser = this.userRepository.save(user);

        final List<User> users = new ArrayList<>();
        users.add(savedUser);
        userRole.setUsers(users);

        this.roleRepository.save(userRole);
        log.info("User registered successfully: {}", savedUser.getEmail());

    }

    @Override
    public AuthenticationResponse refreshToken(final RefreshRequest req) {
        final String newAccessToken = this.jwtService.refreshAccessToken(req.getRefreshToken());
        final String tokenType = "Bearer";
        return AuthenticationResponse.builder()
                .accessToken(newAccessToken)
                .refreshToken(req.getRefreshToken())
                .tokenType(tokenType)
                .build();
    }

    private void checkUserEmail(final String email) {
        final boolean emailExists = this.userRepository.existsByEmailIgnoreCase(email);
        if (emailExists) {
            throw new BusinessException(ErrorCode.EMAIL_ALREADY_EXISTS);
        }
    }

    private void checkPasswords(final String password,
                                final String confirmPassword) {
        if (password == null || !password.equals(confirmPassword)) {
            throw new BusinessException(ErrorCode.PASSWORD_MISMATCH);
        }
    }

    private void checkUserPhoneNumber(final String phoneNumber) {
        final boolean phoneNumberExists = this.userRepository.existsByPhoneNumber(phoneNumber);
        if (phoneNumberExists) {
            throw new BusinessException(ErrorCode.PHONE_ALREADY_EXISTS);
        }
    }
}

