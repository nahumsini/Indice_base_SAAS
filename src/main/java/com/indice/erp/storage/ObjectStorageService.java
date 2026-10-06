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

    /** Bounded server intake/download using the existing private storage provider. */
    default void writeObject(String bucketName, String objectKey, String contentType, byte[] bytes) {
        throw new UnsupportedOperationException("Server file intake is unavailable.");
    }

    default byte[] readObject(String bucketName, String objectKey, int maxBytes) {
        throw new UnsupportedOperationException("Private file download is unavailable.");
    }

    void copyObject(String bucketName, String sourceObjectKey, String targetObjectKey);

    void moveObject(String bucketName, String sourceObjectKey, String targetObjectKey);

    String presignDownload(String bucketName, String objectKey, int expirySeconds);

    String presignServiceDownload(String bucketName, String objectKey, int expirySeconds);

    void deleteObject(String bucketName, String objectKey);
}
