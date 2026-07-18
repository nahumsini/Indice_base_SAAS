package com.indice.erp.storage;

public interface ObjectStorageService {

    boolean isEnabled();

    void validateConfiguration();

    void ensureBucketExists(String bucketName);

    PresignedUpload presignUpload(String bucketName, String objectKey, String contentType, int expirySeconds);

    default PresignedUpload presignUpload(
            String bucketName,
            String objectKey,
            String contentType,
            long expectedContentLength,
            int expirySeconds) {
        return presignUpload(bucketName, objectKey, contentType, expirySeconds);
    }

    boolean objectExists(String bucketName, String objectKey);

    StoredObjectMetadata objectMetadata(String bucketName, String objectKey);

    byte[] readObjectPrefix(String bucketName, String objectKey, int maxBytes);

    void copyObject(String bucketName, String sourceObjectKey, String targetObjectKey);

    void moveObject(String bucketName, String sourceObjectKey, String targetObjectKey);

    String presignDownload(String bucketName, String objectKey, int expirySeconds);

    String presignServiceDownload(String bucketName, String objectKey, int expirySeconds);

    void deleteObject(String bucketName, String objectKey);
}
