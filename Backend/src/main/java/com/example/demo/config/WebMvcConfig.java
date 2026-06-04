package com.example.demo.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.nio.file.Paths;

/**
 * Web MVC Configuration for serving static resources.
 * Configures the server to serve uploaded files from the uploads directory.
 */
@Configuration
@Slf4j
public class WebMvcConfig implements WebMvcConfigurer {

    @Value("${file.upload.dir:uploads}")
    private String uploadDir;

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        String uploadDirPath = Paths.get(uploadDir).toAbsolutePath().toString();
        String fileUri = "file:///" + uploadDirPath.replace("\\", "/") + "/";

        log.info("[v0] Configuring static resource handler for: {}", fileUri);

        registry.addResourceHandler("/uploads/**")
                .addResourceLocations(fileUri)
                .setCachePeriod(3600) // Cache for 1 hour
                .resourceChain(true)
                .addResolver(new org.springframework.web.servlet.resource.PathResourceResolver());

        log.info("[v0] Static resource handler configured for uploads at: {}", uploadDirPath);
    }
}
