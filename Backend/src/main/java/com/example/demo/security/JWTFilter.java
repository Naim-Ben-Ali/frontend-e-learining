package com.example.demo.security;

import com.example.demo.servicesImpl.JWTService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import lombok.extern.slf4j.Slf4j;

import java.io.IOException;

@Component
@RequiredArgsConstructor
@Slf4j
public class JWTFilter extends OncePerRequestFilter {

    private final JWTService jwtService;
    private final UserDetailsService userDetailsService;

    @Override
    protected void doFilterInternal(
            @NonNull
            final HttpServletRequest request,
            @NonNull
            final HttpServletResponse response,
            @NonNull
            final FilterChain filterChain) throws ServletException, IOException {

        final String servletPath = request.getServletPath();
        log.debug("[JWT Filter] Processing request: {}", servletPath);

        if (servletPath.contains("/api/v1/auth")) {
            log.debug("[JWT Filter] Auth endpoint, skipping JWT validation");
            filterChain.doFilter(request, response);
            return;
        }

        final String authHeader = request.getHeader(HttpHeaders.AUTHORIZATION);
        final String jwt;
        final String username;

        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            log.debug("[JWT Filter] No valid Authorization header for path: {}", servletPath);
            filterChain.doFilter(request, response);
            return;
        }

        log.debug("[JWT Filter] Found Bearer token for path: {}", servletPath);
        jwt = authHeader.substring(7);
        try {
            username = this.jwtService.extractUsername(jwt);
            log.debug("[JWT Filter] Extracted username from token: {}", username);
        } catch (RuntimeException ex) {
            log.warn("[JWT Filter] Invalid JWT received for path {}: {}", servletPath, ex.getMessage());
            filterChain.doFilter(request, response);
            return;
        }

        if (username != null && SecurityContextHolder.getContext().getAuthentication() == null) {
            final UserDetails userDetails = this.userDetailsService.loadUserByUsername(username);

            if (this.jwtService.isTokenValid(jwt, userDetails.getUsername())) {
                final UsernamePasswordAuthenticationToken authToken = new UsernamePasswordAuthenticationToken(
                        userDetails,
                        null,
                        userDetails.getAuthorities());

                authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));

                SecurityContextHolder.getContext().setAuthentication(authToken);
                log.debug("[JWT Filter] Authentication set for user: {}", username);
            } else {
                log.warn("[JWT Filter] Token validation failed for user: {}", username);
            }
        }

        filterChain.doFilter(request, response);
    }
}
