package com.example.demo.services;

import com.example.demo.models.User;
import org.springframework.security.core.Authentication;

/**
 * Service to retrieve the currently authenticated user information.
 * Abstracts user lookup logic from controllers.
 */
public interface CurrentUserService {

    /**
     * Get the current authenticated user from Authentication context
     * @param authentication Spring Security authentication object
     * @return User entity
     * @throws jakarta.persistence.EntityNotFoundException if user not found
     */
    User getCurrentUser(Authentication authentication);

    /**
     * Get the current authenticated user ID
     * @param authentication Spring Security authentication object
     * @return User ID
     * @throws jakarta.persistence.EntityNotFoundException if user not found
     */
    String getCurrentUserId(Authentication authentication);

    /**
     * Get the current authenticated user email
     * @param authentication Spring Security authentication object
     * @return User email
     */
    String getCurrentUserEmail(Authentication authentication);

    /**
     * Get the current authenticated user's primary role
     * @param authentication Spring Security authentication object
     * @return User role (e.g., ROLE_TEACHER, ROLE_STUDENT) or null if not found
     */
    String getCurrentUserRole(Authentication authentication);
}
