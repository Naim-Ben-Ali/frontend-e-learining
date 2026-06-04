package com.example.demo.config;


import com.example.demo.models.User;
import org.springframework.data.domain.AuditorAware;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.core.user.DefaultOAuth2User;

import java.util.Optional;

public class ApplicationAuditorAware implements AuditorAware<String> {

    @Override
    public Optional<String> getCurrentAuditor() {
        final Authentication authentication = SecurityContextHolder.getContext()
                .getAuthentication();

        if (authentication == null || !authentication.isAuthenticated() || authentication instanceof AnonymousAuthenticationToken) {
            return Optional.of("system");
        }

        Object principal = authentication.getPrincipal();

        // Handle OAuth2 users
        if (principal instanceof DefaultOAuth2User) {
            DefaultOAuth2User oAuth2User = (DefaultOAuth2User) principal;
            String email = (String) oAuth2User.getAttributes().get("email");
            return Optional.ofNullable(email != null ? email : "oauth2-user");
        }

        // Handle regular users
        if (principal instanceof User) {
            final User user = (User) principal;
            return Optional.ofNullable(user.getId());
        }

        return Optional.of("system");
    }
}
