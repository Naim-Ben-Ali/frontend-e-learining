package com.example.demo.exceptions;

import lombok.Getter;
import org.springframework.http.HttpStatus;

import static org.springframework.http.HttpStatus.*;

@Getter
public enum ErrorCode {

    // --- CONFLICT (409) ---
    CONFLICT("CONFLICT", "A conflict occurred with the current state of the resource", HttpStatus.CONFLICT),
    EMAIL_ALREADY_EXISTS("ERR_EMAIL_EXISTS", "Email already exists", HttpStatus.CONFLICT),
    PHONE_ALREADY_EXISTS("ERR_PHONE_EXISTS", "An account with this phone number already exists", HttpStatus.CONFLICT),
    CATEGORY_ALREADY_EXISTS_FOR_USER("CATEGORY_ALREADY_EXISTS_FOR_USER", "Category already exists for this user", HttpStatus.CONFLICT),

    // --- UNAUTHORIZED (401) ---
    UNAUTHORIZED("UNAUTHORIZED", "Unauthorized access", HttpStatus.UNAUTHORIZED),
    ERR_USER_DISABLED("ERR_USER_DISABLED", "User account is disabled, please activate your account or contact the administrator", HttpStatus.UNAUTHORIZED),
    BAD_CREDENTIALS("BAD_CREDENTIALS", "Username and / or password is incorrect", HttpStatus.UNAUTHORIZED),

    // --- FORBIDDEN (403) ---
    FORBIDDEN_RESOURCE("FORBIDDEN_RESOURCE", "You are not allowed to access this resource", HttpStatus.FORBIDDEN),

    // --- BAD REQUEST (400) ---
    PASSWORD_MISMATCH("ERR_PASSWORD_MISMATCH", "The password and confirmation do not match", BAD_REQUEST),
    CHANGE_PASSWORD_MISMATCH("ERR_PASSWORD_MISMATCH", "New password and confirmation do not match", BAD_REQUEST),
    INVALID_CURRENT_PASSWORD("INVALID_CURRENT_PASSWORD", "The current password is incorrect", BAD_REQUEST),
    ACCOUNT_ALREADY_DEACTIVATED("ACCOUNT_ALREADY_DEACTIVATED", "Account has been deactivated", BAD_REQUEST),
    INVALID_FILE_UPLOAD("INVALID_FILE_UPLOAD", "The uploaded file is invalid", BAD_REQUEST),
    EMPTY_FILE_UPLOAD("EMPTY_FILE_UPLOAD", "File cannot be empty", BAD_REQUEST),
    FILE_SIZE_EXCEEDED("FILE_SIZE_EXCEEDED", "File size exceeds the allowed limit", BAD_REQUEST),
    INVALID_IMAGE_UPLOAD("INVALID_IMAGE_UPLOAD", "Only image files are allowed for this upload", BAD_REQUEST),
    INVALID_OAUTH_CONFIGURATION("INVALID_OAUTH_CONFIGURATION", "OAuth provider configuration is invalid", BAD_REQUEST),
    COURSE_ALREADY_ENROLLED("COURSE_ALREADY_ENROLLED", "Student is already enrolled in this course", BAD_REQUEST),
    SUBSCRIPTION_REQUIRED("SUBSCRIPTION_REQUIRED", "Student must be subscribed to this teacher before enrolling", BAD_REQUEST),
    SUBSCRIPTION_REQUEST_ALREADY_EXISTS("SUBSCRIPTION_REQUEST_ALREADY_EXISTS", "A subscription request is already pending for this teacher", BAD_REQUEST),
    SUBSCRIPTION_KEY_NOT_APPLICABLE("SUBSCRIPTION_KEY_NOT_APPLICABLE", "Subscription keys are only used for paid courses", BAD_REQUEST),

    // --- NOT FOUND (404) ---
    USER_NOT_FOUND("USER_NOT_FOUND", "User not found", NOT_FOUND),
    USERNAME_NOT_FOUND("USERNAME_NOT_FOUND", "Cannot find user with the provided username", NOT_FOUND),
    COURSE_NOT_FOUND("COURSE_NOT_FOUND", "Course not found", NOT_FOUND),
    SECTION_NOT_FOUND("SECTION_NOT_FOUND", "Section not found", NOT_FOUND),
    CONTENT_NOT_FOUND("CONTENT_NOT_FOUND", "Content not found", NOT_FOUND),
    SUBSCRIPTION_REQUEST_NOT_FOUND("SUBSCRIPTION_REQUEST_NOT_FOUND", "Subscription request not found", NOT_FOUND),

    // --- INTERNAL SERVER ERROR (500) ---
    ERR_SENDING_ACTIVATION_EMAIL("ERR_SENDING_ACTIVATION_EMAIL", "An error occurred while sending the activation email", INTERNAL_SERVER_ERROR),
    INTERNAL_EXCEPTION("INTERNAL_EXCEPTION", "An internal exception occurred, please try again or contact the admin", INTERNAL_SERVER_ERROR);

    private final String code;
    private final String defaultMessage;
    private final HttpStatus status;

    ErrorCode(final String code, final String defaultMessage, final HttpStatus status) {
        this.code = code;
        this.defaultMessage = defaultMessage;
        this.status = status;
    }
}
