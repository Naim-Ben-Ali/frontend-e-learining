package com.example.demo.servicesImpl;

import com.example.demo.exceptions.BusinessException;
import com.example.demo.exceptions.ErrorCode;
import com.example.demo.models.User;
import com.example.demo.repositories.UserRepository;
import com.example.demo.services.CurrentUserService;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;

/**
 * Implementation of CurrentUserService
 * Centralizes user lookup logic and prevents controller-level repository access
 */
@Service
@RequiredArgsConstructor
public class CurrentUserServiceImpl implements CurrentUserService {

    private final UserRepository userRepository;

    @Override
    public User getCurrentUser(final Authentication authentication) {
        final String email = getCurrentUserEmail(authentication);
        return this.userRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));
    }

    @Override
    public String getCurrentUserId(final Authentication authentication) {
        return getCurrentUser(authentication).getId();
    }

    @Override
    public String getCurrentUserEmail(final Authentication authentication) {
        return authentication.getName();
    }

    @Override
    public String getCurrentUserRole(final Authentication authentication) {
        return authentication.getAuthorities().stream()
                .map(authority -> authority.getAuthority())
                .filter(role -> !"ROLE_USER".equals(role))
                .findFirst()
                .orElse("ROLE_USER");
    }
}
