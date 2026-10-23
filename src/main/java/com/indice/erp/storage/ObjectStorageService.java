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

    /** Read a complete object no larger than maxBytes. Pass the accepted content limit,
     * without adding a sentinel byte: over-limit detection belongs to the provider.
     * Implementations must reject oversized objects rather than silently truncate them. */
    default byte[] readObject(String bucketName, String objectKey, int maxBytes) {
        throw new UnsupportedOperationException("Private file download is unavailable.");
    }

    void copyObject(String bucketName, String sourceObjectKey, String targetObjectKey);

    void moveObject(String bucketName, String sourceObjectKey, String targetObjectKey);

    String presignDownload(String bucketName, String objectKey, int expirySeconds);

    /** Preserve a human filename when opening a private document in its native viewer. */
    default String presignDownload(String bucketName, String objectKey, int expirySeconds, String fileName) {
        return presignDownload(bucketName, objectKey, expirySeconds);
    }

    String presignServiceDownload(String bucketName, String objectKey, int expirySeconds);

    void deleteObject(String bucketName, String objectKey);
}
