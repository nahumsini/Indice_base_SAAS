package com.indice.erp.storage;

public interface ObjectStorageService {

    boolean isEnabled();

    void validateConfiguration();

    void ensureBucketExists(String bucketName);

    PresignedUpload presignUpload(String bucketName, String objectKey, String contentType, int expirySeconds);

    boolean objectExists(String bucketName, String objectKey);

    String presignDownload(String bucketName, String objectKey, int expirySeconds);

    String presignServiceDownload(String bucketName, String objectKey, int expirySeconds);

    void deleteObject(String bucketName, String objectKey);
}
