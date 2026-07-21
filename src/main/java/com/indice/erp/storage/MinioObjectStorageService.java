package com.indice.erp.storage;

import io.minio.BucketExistsArgs;
import io.minio.CopyObjectArgs;
import io.minio.CopySource;
import io.minio.GetPresignedObjectUrlArgs;
import io.minio.GetObjectArgs;
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
        return presignUpload(bucketName, objectKey, contentType, -1L, expirySeconds);
    }

    @Override
    public PresignedUpload presignUpload(
            String bucketName,
            String objectKey,
            String contentType,
            long expectedContentLength,
            int expirySeconds) {
        try {
            var signedHeaders = new java.util.LinkedHashMap<String, String>();
            if (contentType != null && !contentType.isBlank()) {
                signedHeaders.put("Content-Type", contentType);
            }
            if (expectedContentLength > 0) {
                signedHeaders.put("Content-Length", String.valueOf(expectedContentLength));
            }
            var uploadUrl = minioClient.getPresignedObjectUrl(
                GetPresignedObjectUrlArgs.builder()
                    .method(Method.PUT)
                    .bucket(bucketName)
                    .object(objectKey)
                    .expiry(expirySeconds)
                    .extraHeaders(signedHeaders)
                    .extraQueryParams(Map.of())
                    .build()
            );

            return new PresignedUpload(
                objectKey,
                rewritePublicUrl(uploadUrl),
                Instant.now().plusSeconds(expirySeconds),
                Map.copyOf(signedHeaders)
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
    public StoredObjectMetadata objectMetadata(String bucketName, String objectKey) {
        try {
            var metadata = minioClient.statObject(
                StatObjectArgs.builder()
                    .bucket(bucketName)
                    .object(objectKey)
                    .build()
            );
            return new StoredObjectMetadata(metadata.size(), metadata.contentType());
        } catch (Exception ex) {
            throw new ObjectStorageException("Unable to inspect MinIO object metadata.", ex);
        }
    }

    @Override
    public byte[] readObjectPrefix(String bucketName, String objectKey, int maxBytes) {
        if (maxBytes <= 0 || maxBytes > 64 * 1024) {
            throw new IllegalArgumentException("Object prefix size is invalid.");
        }
        try (var stream = minioClient.getObject(
                GetObjectArgs.builder()
                    .bucket(bucketName)
                    .object(objectKey)
                    .offset(0L)
                    .length((long) maxBytes)
                    .build())) {
            return stream.readNBytes(maxBytes);
        } catch (Exception ex) {
            throw new ObjectStorageException("Unable to inspect MinIO object content.", ex);
        }
    }

    @Override
    public void copyObject(String bucketName, String sourceObjectKey, String targetObjectKey) {
        try {
            minioClient.copyObject(
                CopyObjectArgs.builder()
                    .bucket(bucketName)
                    .object(targetObjectKey)
                    .source(CopySource.builder().bucket(bucketName).object(sourceObjectKey).build())
                    .build()
            );
        } catch (Exception ex) {
            throw new ObjectStorageException("Unable to copy uploaded object.", ex);
        }
    }

    @Override
    public void moveObject(String bucketName, String sourceObjectKey, String targetObjectKey) {
        try {
            copyObject(bucketName, sourceObjectKey, targetObjectKey);
            try {
                minioClient.removeObject(
                    RemoveObjectArgs.builder().bucket(bucketName).object(sourceObjectKey).build());
            } catch (Exception removalFailure) {
                try {
                    minioClient.removeObject(
                        RemoveObjectArgs.builder().bucket(bucketName).object(targetObjectKey).build());
                } catch (Exception ignored) {
                    removalFailure.addSuppressed(ignored);
                }
                throw removalFailure;
            }
        } catch (Exception ex) {
            throw new ObjectStorageException("Unable to seal uploaded object.", ex);
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
            var publicPath = joinPaths(publicBase.getRawPath(), signedUri.getRawPath());
            var rewritten = new StringBuilder()
                .append(publicBase.getScheme())
                .append("://")
                .append(publicBase.getRawAuthority())
                .append(publicPath);
            if (signedUri.getRawQuery() != null && !signedUri.getRawQuery().isBlank()) {
                rewritten.append('?').append(signedUri.getRawQuery());
            }
            if (signedUri.getRawFragment() != null && !signedUri.getRawFragment().isBlank()) {
                rewritten.append('#').append(signedUri.getRawFragment());
            }
            return new URI(rewritten.toString()).toString();
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
