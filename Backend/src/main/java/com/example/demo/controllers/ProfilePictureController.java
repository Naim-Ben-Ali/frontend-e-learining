package com.example.demo.controllers;

import com.example.demo.dtos.FileUploadResponse;
import com.example.demo.services.CurrentUserService;
import com.example.demo.services.UserService;
import com.example.demo.servicesImpl.FileUploadService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;

@RestController
@RequestMapping("/api/v1/files")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Profile files", description = "User profile image uploads")
public class ProfilePictureController {

    private final FileUploadService fileUploadService;
    private final UserService userService;
    private final CurrentUserService currentUserService;

    @PostMapping("/profile-picture")
    @Operation(summary = "Upload current user's profile picture")
    public ResponseEntity<FileUploadResponse> uploadProfilePicture(
            @RequestParam("file") final MultipartFile file,
            final Authentication authentication,
            final HttpServletRequest request) throws IOException {

        final String userId = this.currentUserService.getCurrentUserId(authentication);

        log.info("Profile picture upload: userId={}, fileName={}, size={} bytes",
                userId, file.getOriginalFilename(), file.getSize());

        final String filePath = this.fileUploadService.saveProfilePicture(file, userId);
        final String publicUrl = buildPublicFileUrl(request, filePath);
        this.userService.updateProfilePictureUrl(userId, publicUrl);

        final FileUploadResponse body = FileUploadResponse.builder()
                .filePath(filePath)
                .fileUrl(publicUrl)
                .fileName(file.getOriginalFilename())
                .fileSize(file.getSize())
                .build();

        return ResponseEntity.status(HttpStatus.CREATED).body(body);
    }

    /**
     * Build an absolute URL so clients (and {@code <img src>}) work from any origin.
     */
    private static String buildPublicFileUrl(final HttpServletRequest request, final String path) {
        if (path == null || path.isBlank()) {
            return path;
        }
        final String scheme = forwardedOr(request, "X-Forwarded-Proto", request.getScheme());
        final String hostHeader = forwardedOr(request, "X-Forwarded-Host", null);
        final String hostPort;
        if (hostHeader != null && !hostHeader.isBlank()) {
            hostPort = hostHeader.split(",")[0].trim();
        } else {
            final int port = request.getServerPort();
            final String host = request.getServerName();
            final boolean defaultPort = ("http".equalsIgnoreCase(scheme) && port == 80)
                    || ("https".equalsIgnoreCase(scheme) && port == 443);
            hostPort = defaultPort ? host : host + ":" + port;
        }
        return scheme + "://" + hostPort + path;
    }

    private static String forwardedOr(
            final HttpServletRequest request,
            final String headerName,
            final String fallback) {

        final String value = request.getHeader(headerName);
        if (value != null && !value.isBlank()) {
            return value.split(",")[0].trim();
        }
        return fallback;
    }
}
