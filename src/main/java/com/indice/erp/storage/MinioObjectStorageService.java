package com.indice.erp.storage;

import io.minio.BucketExistsArgs;
import io.minio.GetPresignedObjectUrlArgs;
import io.minio.MakeBucketArgs;
import io.minio.MinioClient;
import io.minio.RemoveObjectArgs;
import io.minio.StatObjectArgs;
import io.minio.errors.ErrorResponseException;
import io.minio.http.Method;
import java.net.URI;
import java.net.URISyntaxException;
import java.time.Instant;
import java.util.Map;

public class MinioObjectStorageService implements ObjectStorageService {

    private final MinioClient minioClient;
    private final ObjectStorageProperties properties;

    public MinioObjectStorageService(MinioClient minioClient, ObjectStorageProperties properties) {
        this.minioClient = minioClient;
        this.properties = properties;
    }

    @Override
    public boolean isEnabled() {
        return true;
    }

    @Override
    public void validateConfiguration() {
        var minio = properties.getMinio();
        if (isBlank(minio.getEndpoint()) || isBlank(minio.getAccessKey()) || isBlank(minio.getSecretKey())) {
            throw new ObjectStorageException("MinIO storage is enabled but required credentials or endpoint are missing.", null);
        }
    }

    @Override
    public void ensureBucketExists(String bucketName) {
        try {
            var exists = minioClient.bucketExists(BucketExistsArgs.builder().bucket(bucketName).build());
            if (!exists) {
                minioClient.makeBucket(MakeBucketArgs.builder().bucket(bucketName).build());
            }
        } catch (Exception ex) {
            throw new ObjectStorageException("Unable to verify or create MinIO bucket '" + bucketName + "'.", ex);
        }
    }

    @Override
    public PresignedUpload presignUpload(String bucketName, String objectKey, String contentType, int expirySeconds) {
        try {
            var uploadUrl = minioClient.getPresignedObjectUrl(
                GetPresignedObjectUrlArgs.builder()
                    .method(Method.PUT)
                    .bucket(bucketName)
                    .object(objectKey)
                    .expiry(expirySeconds)
                    .extraQueryParams(Map.of())
                    .build()
            );

            return new PresignedUpload(
                objectKey,
                rewritePublicUrl(uploadUrl),
                Instant.now().plusSeconds(expirySeconds),
                contentType == null || contentType.isBlank() ? Map.of() : Map.of("Content-Type", contentType)
            );
        } catch (Exception ex) {
            throw new ObjectStorageException("Unable to generate a MinIO upload URL.", ex);
        }
    }

    @Override
    public boolean objectExists(String bucketName, String objectKey) {
        try {
            minioClient.statObject(
                StatObjectArgs.builder()
                    .bucket(bucketName)
                    .object(objectKey)
                    .build()
            );
            return true;
        } catch (ErrorResponseException ex) {
            var errorCode = ex.errorResponse() == null ? "" : ex.errorResponse().code();
            if ("NoSuchKey".equalsIgnoreCase(errorCode) || "NoSuchObject".equalsIgnoreCase(errorCode)) {
                return false;
            }
            throw new ObjectStorageException("Unable to verify MinIO object existence.", ex);
        } catch (Exception ex) {
            throw new ObjectStorageException("Unable to verify MinIO object existence.", ex);
        }
    }

    @Override
    public String presignDownload(String bucketName, String objectKey, int expirySeconds) {
        try {
            return rewritePublicUrl(minioClient.getPresignedObjectUrl(
                GetPresignedObjectUrlArgs.builder()
                    .method(Method.GET)
                    .bucket(bucketName)
                    .object(objectKey)
                    .expiry(expirySeconds)
                    .build()
            ), properties.getMinio().getPublicEndpoint());
        } catch (Exception ex) {
            throw new ObjectStorageException("Unable to generate a MinIO download URL.", ex);
        }
    }

    @Override
    public String presignServiceDownload(String bucketName, String objectKey, int expirySeconds) {
        try {
            var serviceEndpoint = isBlank(properties.getMinio().getServicePublicEndpoint())
                ? properties.getMinio().getPublicEndpoint()
                : properties.getMinio().getServicePublicEndpoint();

            return rewritePublicUrl(minioClient.getPresignedObjectUrl(
                GetPresignedObjectUrlArgs.builder()
                    .method(Method.GET)
                    .bucket(bucketName)
                    .object(objectKey)
                    .expiry(expirySeconds)
                    .build()
            ), serviceEndpoint);
        } catch (Exception ex) {
            throw new ObjectStorageException("Unable to generate a MinIO download URL.", ex);
        }
    }

    @Override
    public void deleteObject(String bucketName, String objectKey) {
        try {
            minioClient.removeObject(
                RemoveObjectArgs.builder()
                    .bucket(bucketName)
                    .object(objectKey)
                    .build()
            );
        } catch (Exception ex) {
            throw new ObjectStorageException("Unable to delete MinIO object.", ex);
        }
    }

    private String rewritePublicUrl(String signedUrl) {
        return rewritePublicUrl(signedUrl, properties.getMinio().getPublicEndpoint());
    }

    private String rewritePublicUrl(String signedUrl, String configuredPublicEndpoint) {
        if (isBlank(configuredPublicEndpoint)) {
            return signedUrl;
        }

        try {
            var signedUri = new URI(signedUrl);
            var publicBase = new URI(trimTrailingSlash(configuredPublicEndpoint));
            var publicPath = joinPaths(publicBase.getPath(), signedUri.getPath());

            return new URI(
                publicBase.getScheme(),
                publicBase.getUserInfo(),
                publicBase.getHost(),
                publicBase.getPort(),
                publicPath,
                signedUri.getQuery(),
                signedUri.getFragment()
            ).toString();
        } catch (URISyntaxException ex) {
            throw new ObjectStorageException("Unable to rewrite the MinIO public URL.", ex);
        }
    }

    private String joinPaths(String basePath, String signedPath) {
        var normalizedBasePath = normalizePath(basePath);
        var normalizedSignedPath = normalizePath(signedPath);

        if (normalizedBasePath.isEmpty()) {
            return normalizedSignedPath.isEmpty() ? "/" : normalizedSignedPath;
        }

        if (normalizedSignedPath.isEmpty() || "/".equals(normalizedSignedPath)) {
            return normalizedBasePath;
        }

        return normalizedBasePath + (normalizedSignedPath.startsWith("/") ? normalizedSignedPath : "/" + normalizedSignedPath);
    }

    private String normalizePath(String value) {
        if (isBlank(value) || "/".equals(value)) {
            return "";
        }
        return value.startsWith("/") ? trimTrailingSlash(value) : "/" + trimTrailingSlash(value);
    }

    private String trimTrailingSlash(String value) {
        if (value == null) {
            return null;
        }
        return value.replaceAll("/+$", "");
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}
