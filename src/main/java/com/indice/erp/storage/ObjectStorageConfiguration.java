package com.indice.erp.storage;

import io.minio.MinioClient;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class ObjectStorageConfiguration {

    @Bean
    ObjectStorageService objectStorageService(ObjectStorageProperties properties) {
        if (!properties.isMinioEnabled()) {
            return new DisabledObjectStorageService();
        }

        var minio = properties.getMinio();
        var internalClient = buildClient(minio.getEndpoint(), minio.getAccessKey(), minio.getSecretKey());

        return new MinioObjectStorageService(internalClient, properties);
    }

    private MinioClient buildClient(String endpoint, String accessKey, String secretKey) {
        return MinioClient.builder()
            .endpoint(stripTrailingSlash(endpoint))
            .credentials(accessKey, secretKey)
            .build();
    }

    private String stripTrailingSlash(String value) {
        return value == null ? null : value.replaceAll("/+$", "");
    }
}
