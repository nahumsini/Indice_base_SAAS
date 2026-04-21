package com.indice.erp.storage;

import jakarta.annotation.PostConstruct;
import org.springframework.stereotype.Component;

@Component
public class ObjectStorageStartupVerifier {

    private final ObjectStorageService objectStorageService;
    private final ObjectStorageProperties properties;

    public ObjectStorageStartupVerifier(
        ObjectStorageService objectStorageService,
        ObjectStorageProperties properties
    ) {
        this.objectStorageService = objectStorageService;
        this.properties = properties;
    }

    @PostConstruct
    void verifyStorage() {
        if (!properties.isMinioEnabled()) {
            return;
        }

        objectStorageService.validateConfiguration();
        objectStorageService.ensureBucketExists(properties.getMinio().getBucketAttendance());
        objectStorageService.ensureBucketExists(properties.getMinio().getBucketBiometric());
        objectStorageService.ensureBucketExists(properties.getMinio().getBucketDocuments());
    }
}
