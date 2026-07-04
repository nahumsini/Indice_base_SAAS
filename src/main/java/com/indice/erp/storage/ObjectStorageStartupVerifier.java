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
        if (properties.isRequired() && !objectStorageService.isEnabled()) {
            throw new IllegalStateException("Object storage is required but is not enabled.");
        }

        if (!properties.isMinioEnabled()) {
            return;
        }

        objectStorageService.validateConfiguration();
        objectStorageService.ensureBucketExists(properties.getMinio().getBucketAttendance());
        objectStorageService.ensureBucketExists(properties.getMinio().getBucketBiometric());
        objectStorageService.ensureBucketExists(properties.getMinio().getBucketDocuments());
        objectStorageService.ensureBucketExists(properties.getMinio().getBucketSalesDocuments());
    }
}
