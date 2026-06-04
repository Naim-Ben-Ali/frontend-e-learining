package com.example.demo.security;

import com.example.demo.models.Role;
import com.example.demo.models.User;
import com.example.demo.repositories.RoleRepository;
import com.example.demo.repositories.UserRepository;
import com.example.demo.servicesImpl.JWTService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.security.core.authority.AuthorityUtils;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.oauth2.core.user.DefaultOAuth2User;
import org.springframework.security.web.RedirectStrategy;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class OAuth2AuthenticationSuccessHandlerTest {

    @Mock
    private JWTService jwtService;
    @Mock
    private UserRepository userRepository;
    @Mock
    private RoleRepository roleRepository;
    @Mock
    private HttpServletResponse response;
    @Mock
    private RedirectStrategy redirectStrategy;
    @InjectMocks
    private OAuth2AuthenticationSuccessHandler successHandler;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(successHandler, "frontendBaseUrl", "http://localhost:4200");
        successHandler.setRedirectStrategy(redirectStrategy);
    }

    @Test
    void onAuthenticationSuccessShouldCreateOAuthUserWithUniquePhoneAndRedirectWithSnakeCaseParams() throws Exception {
        Map<String, Object> attributes = new HashMap<>();
        attributes.put("sub", "google-user-1");
        attributes.put("email", "oauth@example.com");
        attributes.put("name", "OAuth User");

        DefaultOAuth2User principal = new DefaultOAuth2User(
                AuthorityUtils.createAuthorityList("ROLE_USER"),
                attributes,
                "sub"
        );
        OAuth2AuthenticationToken authentication = new OAuth2AuthenticationToken(
                principal,
                principal.getAuthorities(),
                "google"
        );
        HttpServletRequest request = new MockHttpServletRequest("GET", "/login/oauth2/code/google");

        Role role = Role.builder()
                .id("role-user")
                .name("ROLE_USER")
                .users(List.of())
                .build();

        when(roleRepository.findByName("ROLE_USER")).thenReturn(Optional.of(role));
        when(userRepository.findByOauthProviderAndOauthProviderUserId("google", "google-user-1"))
                .thenReturn(Optional.empty());
        when(userRepository.findByEmailIgnoreCase("oauth@example.com")).thenReturn(Optional.empty());
        when(userRepository.saveAndFlush(any(User.class))).thenAnswer(invocation -> {
            User user = invocation.getArgument(0);
            if (user.getId() == null) {
                user.setId("generated-user-id");
            }
            return user;
        });

        when(jwtService.generateAccessToken("oauth@example.com")).thenReturn("access-token");
        when(jwtService.generateRefreshToken("oauth@example.com")).thenReturn("refresh-token");
        doNothing().when(jwtService).saveToken(anyString(), any(User.class), any(LocalDateTime.class));

        successHandler.onAuthenticationSuccess(request, response, authentication);

        ArgumentCaptor<User> userCaptor = ArgumentCaptor.forClass(User.class);
        verify(userRepository, org.mockito.Mockito.atLeastOnce()).saveAndFlush(userCaptor.capture());
        User savedUser = userCaptor.getValue();

        assertThat(savedUser.getPhoneNumber()).startsWith("oauth-");
        assertThat(savedUser.getOauthProvider()).isEqualTo("google");
        assertThat(savedUser.getOauthProviderUserId()).isEqualTo("google-user-1");
        assertThat(savedUser.isHasSelectedRole()).isFalse();

        ArgumentCaptor<String> redirectCaptor = ArgumentCaptor.forClass(String.class);
        verify(redirectStrategy).sendRedirect(any(HttpServletRequest.class), any(HttpServletResponse.class), redirectCaptor.capture());
        String redirectUrl = redirectCaptor.getValue();

        assertThat(redirectUrl).contains("access_token=access-token");
        assertThat(redirectUrl).contains("refresh_token=refresh-token");
        assertThat(redirectUrl).contains("user_id=generated-user-id");
        assertThat(redirectUrl).contains("requires_role_selection=true");
        assertThat(redirectUrl).contains("roles=");
    }
}
