package com.indice.erp.storage;

public class DisabledObjectStorageService implements ObjectStorageService {

    @Override
    public boolean isEnabled() {
        return false;
    }

    @Override
    public void validateConfiguration() {
    }

    @Override
    public void ensureBucketExists(String bucketName) {
    }

    @Override
    public PresignedUpload presignUpload(String bucketName, String objectKey, String contentType, int expirySeconds) {
        throw new ObjectStorageDisabledException("Object storage is not enabled.");
    }

    @Override
    public boolean objectExists(String bucketName, String objectKey) {
        return false;
    }

    @Override
    public StoredObjectMetadata objectMetadata(String bucketName, String objectKey) {
        throw new ObjectStorageDisabledException("Object storage is not enabled.");
    }

    @Override
    public byte[] readObjectPrefix(String bucketName, String objectKey, int maxBytes) {
        throw new ObjectStorageDisabledException("Object storage is not enabled.");
    }

    @Override
    public void copyObject(String bucketName, String sourceObjectKey, String targetObjectKey) {
        throw new ObjectStorageDisabledException("Object storage is not enabled.");
    }

    @Override
    public void moveObject(String bucketName, String sourceObjectKey, String targetObjectKey) {
        throw new ObjectStorageDisabledException("Object storage is not enabled.");
    }

    @Override
    public String presignDownload(String bucketName, String objectKey, int expirySeconds) {
        throw new ObjectStorageDisabledException("Object storage is not enabled.");
    }

    @Override
    public String presignServiceDownload(String bucketName, String objectKey, int expirySeconds) {
        throw new ObjectStorageDisabledException("Object storage is not enabled.");
    }

    @Override
    public void deleteObject(String bucketName, String objectKey) {
        throw new ObjectStorageDisabledException("Object storage is not enabled.");
    }
}
