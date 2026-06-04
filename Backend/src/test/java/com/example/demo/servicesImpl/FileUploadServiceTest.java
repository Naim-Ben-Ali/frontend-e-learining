package com.example.demo.servicesImpl;

import com.example.demo.exceptions.BusinessException;
import com.example.demo.exceptions.ErrorCode;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.util.ReflectionTestUtils;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class FileUploadServiceTest {

    @TempDir
    Path tempDir;

    @Test
    void saveCourseContentFileShouldPersistFileInsideCourseFolder() throws IOException {
        FileUploadService service = new FileUploadService();
        ReflectionTestUtils.setField(service, "uploadDir", tempDir.toString());
        service.initializeUploadDirectory();

        MockMultipartFile multipartFile = new MockMultipartFile(
                "file",
                "lesson.pdf",
                "application/pdf",
                "course-content".getBytes()
        );

        String savedPath = service.saveCourseContentFile(multipartFile, "course-1", "section-1");

        assertThat(savedPath).startsWith("/uploads/courses/course-1/sections/section-1/");
        Path expectedFile = tempDir.resolve(savedPath.substring("/uploads/".length()));
        assertThat(Files.exists(expectedFile)).isTrue();
    }

    @Test
    void saveCourseImageShouldRejectNonImageFiles() {
        FileUploadService service = new FileUploadService();
        ReflectionTestUtils.setField(service, "uploadDir", tempDir.toString());
        service.initializeUploadDirectory();

        MockMultipartFile multipartFile = new MockMultipartFile(
                "file",
                "script.exe",
                "application/octet-stream",
                "not-an-image".getBytes()
        );

        assertThatThrownBy(() -> service.saveCourseImage(multipartFile, "course-1"))
                .isInstanceOf(BusinessException.class)
                .extracting(exception -> ((BusinessException) exception).getErrorCode())
                .isEqualTo(ErrorCode.INVALID_IMAGE_UPLOAD);
    }
}
