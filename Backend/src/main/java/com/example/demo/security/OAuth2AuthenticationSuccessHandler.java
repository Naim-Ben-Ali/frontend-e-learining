package com.example.demo.security;

import com.example.demo.models.Role;
import com.example.demo.models.User;
import com.example.demo.exceptions.BusinessException;
import com.example.demo.exceptions.ErrorCode;
import com.example.demo.repositories.RoleRepository;
import com.example.demo.repositories.UserRepository;
import com.example.demo.servicesImpl.JWTService;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.oauth2.core.user.DefaultOAuth2User;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationSuccessHandler;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.util.UriComponentsBuilder;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Component
@RequiredArgsConstructor
@Slf4j
public class OAuth2AuthenticationSuccessHandler extends SimpleUrlAuthenticationSuccessHandler {

    private final JWTService jwtService;
    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    @Value("${app.frontend.base-url:http://localhost:4200}")
    private String frontendBaseUrl;

    @Override
    @Transactional
    public void onAuthenticationSuccess(HttpServletRequest request, HttpServletResponse response, Authentication authentication) throws IOException, ServletException {
        try {
            // Validate authentication object
            if (!(authentication.getPrincipal() instanceof DefaultOAuth2User)) {
                log.error("OAuth2 authentication failed: Invalid principal type - {}",
                        authentication.getPrincipal().getClass().getSimpleName());
                getRedirectStrategy().sendRedirect(request, response,
                        frontendBaseUrl + "/login?error=invalid_oauth_principal");
                return;
            }

            DefaultOAuth2User oAuth2User = (DefaultOAuth2User) authentication.getPrincipal();
            Map<String, Object> attributes = oAuth2User.getAttributes();

            log.info("OAuth2 authentication initiated - attributes keys: {}", attributes.keySet());

            String provider = extractProvider(authentication, request);
            String providerUserId = extractProviderUserId(attributes);
            String email = extractEmail(attributes, provider, providerUserId);
            String name = extractName(attributes);

            log.info("OAuth2 authentication - email: {}, name: {}, provider: {}, providerUserId: {}",
                    email, name, provider, providerUserId);

            User user = userRepository.findByOauthProviderAndOauthProviderUserId(provider, providerUserId)
                    .or(() -> userRepository.findByEmailIgnoreCase(email))
                    .orElseGet(() -> createNewOAuth2User(email, name, provider));

            user.setOauthProvider(provider);
            user.setOauthProviderUserId(providerUserId);
            user = userRepository.saveAndFlush(user);

            log.info("OAuth2 user found/created - ID: {}, Email: {}, Username: {}",
                    user.getId(), user.getEmail(), user.getUsername() != null ? user.getUsername() : "NULL");

            String tokenIdentifier = user.getEmail();
            String accessToken = jwtService.generateAccessToken(tokenIdentifier);
            String refreshToken = jwtService.generateRefreshToken(tokenIdentifier);

            log.info("Tokens generated successfully for user: {}", email);

            // Save tokens to database
            LocalDateTime accessTokenExpiration = LocalDateTime.now().plusHours(24);
            LocalDateTime refreshTokenExpiration = LocalDateTime.now().plusDays(7);
            jwtService.saveToken(accessToken, user, accessTokenExpiration);
            jwtService.saveToken(refreshToken, user, refreshTokenExpiration);

            log.info("Tokens saved to database for user: {}", email);

            boolean needsRoleSelection = !user.isHasSelectedRole() || !hasStudentOrTeacherRole(user);
            List<String> roleNames = extractAppRoles(user);

            log.info("OAuth2 user - ID: {}, hasSelectedRole: {}, needsRoleSelection: {}, roles: {}",
                    user.getId(), user.isHasSelectedRole(), needsRoleSelection,
                    roleNames);

            String targetUrl = UriComponentsBuilder.fromUriString(frontendBaseUrl + "/oauth2/callback")
                    .queryParam("access_token", accessToken)
                    .queryParam("refresh_token", refreshToken)
                    .queryParam("user_id", user.getId())
                    .queryParam("email", user.getEmail())
                    .queryParam("first_name", user.getFirstName())
                    .queryParam("last_name", user.getLastName())
                    .queryParam("profile_picture_url", user.getProfilePictureUrl())
                    .queryParam("requires_role_selection", needsRoleSelection)
                    .queryParam("roles", String.join(",", roleNames))
                    .build()
                    .toUriString();

            log.info("OAuth2 authentication successful, redirecting to: {}", targetUrl);
            getRedirectStrategy().sendRedirect(request, response, targetUrl);
        } catch (Exception e) {
            log.error("Error in OAuth2 authentication success handler - Exception: {}, Message: {}",
                    e.getClass().getSimpleName(), e.getMessage());
            log.debug("Full stack trace:", e);

            String errorCode = "oauth2_failed";
            if (e.getMessage() != null) {
                if (e.getMessage().contains("INVALID_OAUTH_CONFIGURATION")) {
                    errorCode = "invalid_oauth_provider_user_id";
                } else if (e.getMessage().contains("INTERNAL_EXCEPTION")) {
                    errorCode = "role_not_found";
                }
            }

            String redirectUrl = frontendBaseUrl + "/login?error=" + errorCode;
            log.info("Redirecting to: {}", redirectUrl);
            getRedirectStrategy().sendRedirect(request, response, redirectUrl);
        }
    }

    private User createNewOAuth2User(String email, String name, String provider) {
        Role userRole = roleRepository.findByName("ROLE_USER")
                .orElseThrow(() -> new BusinessException(ErrorCode.INTERNAL_EXCEPTION));

        List<Role> roles = new ArrayList<>();
        roles.add(userRole);

        // Split name into first and last name
        String firstName = name;
        String lastName = "";

        if (name != null && name.contains(" ")) {
            String[] parts = name.trim().split("\\s+", 2);
            firstName = parts[0];
            lastName = parts.length > 1 ? parts[1] : "";
        }

        User user = User.builder()
                .email(email)
                .firstName(firstName)
                .lastName(lastName)
                .password(UUID.randomUUID().toString())
                .roles(roles)
                .phoneNumber("oauth-" + UUID.randomUUID())
                .enabled(true)
                .emailVerified(true)
                .hasSelectedRole(false)
                .build();

        return userRepository.saveAndFlush(user);
    }

    private String extractEmail(Map<String, Object> attributes, String provider, String providerUserId) {
        Object email = attributes.get("email");
        if (email != null && !email.toString().isEmpty()) {
            return email.toString();
        }

        Object login = attributes.get("login");
        if (login != null && !login.toString().isEmpty()) {
            return login.toString() + "+" + provider + "@oauth2.local";
        }

        if (providerUserId != null && !providerUserId.isEmpty()) {
            return provider + "-" + providerUserId + "@oauth2.local";
        }

        return "oauth2-user+" + provider + "@oauth2.local";
    }

    private String extractName(Map<String, Object> attributes) {
        Object name = attributes.get("name");
        if (name != null) {
            return name.toString();
        }

        Object givenName = attributes.get("given_name");
        Object familyName = attributes.get("family_name");
        if (givenName != null && familyName != null) {
            return givenName.toString() + " " + familyName.toString();
        }

        Object login = attributes.get("login");
        if (login != null) {
            return login.toString();
        }

        Object email = attributes.get("email");
        if (email != null) {
            return email.toString();
        }

        return "User";
    }

    private String extractProviderUserId(Map<String, Object> attributes) {
        // Google uses "sub" (subject claim)
        Object sub = attributes.get("sub");
        if (sub != null && !sub.toString().isBlank()) {
            log.debug("Provider user ID extracted from 'sub' field: {}", sub);
            return sub.toString();
        }

        // GitHub uses "id" (numeric ID)
        Object id = attributes.get("id");
        if (id != null && !id.toString().isBlank()) {
            log.debug("Provider user ID extracted from 'id' field: {}", id);
            return id.toString();
        }

        // GitHub also provides "login" (username)
        Object login = attributes.get("login");
        if (login != null && !login.toString().isBlank()) {
            log.debug("Provider user ID extracted from 'login' field: {}", login);
            return login.toString();
        }

        // Last resort: try "user_id" or "userId" for edge cases
        Object userId = attributes.get("user_id");
        if (userId != null && !userId.toString().isBlank()) {
            log.debug("Provider user ID extracted from 'user_id' field: {}", userId);
            return userId.toString();
        }

        log.error("Cannot extract provider user ID from attributes - Available keys: {}", attributes.keySet());
        throw new BusinessException(ErrorCode.INVALID_OAUTH_CONFIGURATION);
    }

    private boolean hasStudentOrTeacherRole(User user) {
        if (user == null || user.getRoles() == null || user.getRoles().isEmpty()) {
            return false;
        }
        return user.getRoles().stream()
                .anyMatch(role -> "ROLE_STUDENT".equals(role.getName()) || "ROLE_TEACHER".equals(role.getName()));
    }

    private List<String> extractAppRoles(User user) {
        if (user.getRoles() == null) {
            return List.of();
        }

        return user.getRoles().stream()
                .map(Role::getName)
                .filter(role -> !"ROLE_USER".equals(role))
                .sorted()
                .collect(Collectors.toList());
    }

    private String extractProvider(Authentication authentication, HttpServletRequest request) {
        if (authentication instanceof OAuth2AuthenticationToken token) {
            String registrationId = token.getAuthorizedClientRegistrationId();
            log.debug("Provider from OAuth2AuthenticationToken: {}", registrationId);
            return registrationId;
        }

        // Fallback to request URI inspection
        String uri = request.getRequestURI();
        if (uri.contains("google")) {
            log.debug("Provider detected from URI (google)");
            return "google";
        }
        if (uri.contains("facebook")) {
            log.debug("Provider detected from URI (facebook)");
            return "facebook";
        }
        if (uri.contains("github")) {
            log.debug("Provider detected from URI (github)");
            return "github";
        }

        log.warn("Unknown OAuth2 provider detected from URI: {}", uri);
        return "unknown";
    }
}
