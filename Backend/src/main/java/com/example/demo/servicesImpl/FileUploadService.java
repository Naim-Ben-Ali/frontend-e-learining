package com.example.demo.servicesImpl;

import com.example.demo.exceptions.BusinessException;
import com.example.demo.exceptions.ErrorCode;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;

@Service
@Slf4j
public class FileUploadService {

    private static final long MAX_CONTENT_FILE_SIZE = 50L * 1024 * 1024;
    private static final long MAX_IMAGE_FILE_SIZE = 5L * 1024 * 1024;
    private static final Set<String> IMAGE_CONTENT_TYPES = Set.of(
            "image/jpeg",
            "image/png",
            "image/webp",
            "image/gif"
    );

    @Value("${file.upload.dir:uploads}")
    private String uploadDir;

    @PostConstruct
    public void initializeUploadDirectory() {
        try {
            Path uploadPath = getUploadRoot();
            if (!Files.exists(uploadPath)) {
                Files.createDirectories(uploadPath);
                log.info("[FileUpload] Upload directory created: {}", uploadPath.toAbsolutePath());
            } else {
                log.info("[FileUpload] Upload directory already exists: {}", uploadPath.toAbsolutePath());
            }
        } catch (IOException e) {
            log.error("[FileUpload] Failed to initialize upload directory: {}", uploadDir, e);
        }
    }

    public String saveCourseContentFile(MultipartFile file, String courseId, String sectionId) throws IOException {
        validateFile(file, MAX_CONTENT_FILE_SIZE, false);
        return saveFile(file, buildContentPath(courseId, sectionId));
    }

    public String saveCourseImage(MultipartFile file, String courseId) throws IOException {
        validateFile(file, MAX_IMAGE_FILE_SIZE, true);
        return saveFile(file, buildImagePath(courseId));
    }

    /**
     * Save a profile picture for a user under {@code profiles/{userId}/}.
     */
    public String saveProfilePicture(MultipartFile file, String userId) throws IOException {
        validateFile(file, MAX_IMAGE_FILE_SIZE, true);
        return saveFile(file, "profiles/" + userId);
    }

    public void deleteFile(String filePath) throws IOException {
        if (filePath == null || filePath.isBlank() || !filePath.startsWith("/uploads/")) {
            return;
        }

        String relativePath = filePath.substring("/uploads/".length());
        Path filePathToDelete = getUploadRoot().resolve(relativePath);

        if (Files.exists(filePathToDelete)) {
            Files.delete(filePathToDelete);
            log.info("[FileUpload] File deleted: {}", filePathToDelete);
        }
    }

    private String saveFile(MultipartFile file, String relativePath) throws IOException {
        Path uploadPath = getUploadRoot().resolve(relativePath);
        Files.createDirectories(uploadPath);

        String originalFilename = file.getOriginalFilename();
        String fileExtension = getFileExtension(originalFilename);
        String uniqueFilename = UUID.randomUUID().toString() + (fileExtension.isEmpty() ? "" : "." + fileExtension);
        Path filePath = uploadPath.resolve(uniqueFilename);

        try (InputStream inputStream = file.getInputStream()) {
            Files.copy(inputStream, filePath, StandardCopyOption.REPLACE_EXISTING);
        }

        String returnPath = "/uploads/" + relativePath.replace("\\", "/") + "/" + uniqueFilename;
        log.info("[FileUpload] Returning relative path: {}", returnPath);
        return returnPath;
    }

    private void validateFile(MultipartFile file, long maxFileSize, boolean imageOnly) {
        if (file == null || file.isEmpty()) {
            throw new BusinessException(ErrorCode.EMPTY_FILE_UPLOAD);
        }

        if (file.getSize() > maxFileSize) {
            throw new BusinessException(ErrorCode.FILE_SIZE_EXCEEDED);
        }

        if (imageOnly && !isImage(file)) {
            throw new BusinessException(ErrorCode.INVALID_IMAGE_UPLOAD);
        }
    }

    private boolean isImage(MultipartFile file) {
        String contentType = file.getContentType();
        if (contentType == null) {
            return false;
        }

        return IMAGE_CONTENT_TYPES.contains(contentType.toLowerCase(Locale.ROOT));
    }

    private String buildContentPath(String courseId, String sectionId) {
        if (sectionId != null && !sectionId.isEmpty()) {
            return "courses/" + courseId + "/sections/" + sectionId;
        }
        return "courses/" + courseId + "/ungrouped";
    }

    private String buildImagePath(String courseId) {
        return "courses/" + courseId + "/images";
    }

    private Path getUploadRoot() {
        return Paths.get(uploadDir).toAbsolutePath().normalize();
    }

    private String getFileExtension(String filename) {
        if (filename == null || !filename.contains(".")) {
            return "";
        }
        return filename.substring(filename.lastIndexOf(".") + 1).toLowerCase(Locale.ROOT);
    }
}
