package com.example.demo.exceptions;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.springframework.http.HttpStatus;

import java.time.LocalDateTime;
import java.util.Map;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ApiErrorResponse {

    private String code;
    private String message;
    private HttpStatus status;
    private int statusCode;
    private LocalDateTime timestamp;
    private String path;
    private Map<String, String> validationErrors;

    /**
     * Builder method for business exceptions
     */
    public static ApiErrorResponse from(final BusinessException ex, final String path) {
        return ApiErrorResponse.builder()
                .code(ex.getErrorCode().getCode())
                .message(ex.getMessage())
                .status(ex.getErrorCode().getStatus())
                .statusCode(ex.getErrorCode().getStatus().value())
                .timestamp(LocalDateTime.now())
                .path(path)
                .build();
    }

    /**
     * Builder method for validation errors
     */
    public static ApiErrorResponse validation(final String code, final String message,
                                              final HttpStatus status, final String path,
                                              final Map<String, String> errors) {
        return ApiErrorResponse.builder()
                .code(code)
                .message(message)
                .status(status)
                .statusCode(status.value())
                .timestamp(LocalDateTime.now())
                .path(path)
                .validationErrors(errors)
                .build();
    }
}
