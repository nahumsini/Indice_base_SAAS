package com.indice.erp.storage;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "app.storage")
public class ObjectStorageProperties {

    private String provider = "none";
    private final Minio minio = new Minio();

    public String getProvider() {
        return provider;
    }

    public void setProvider(String provider) {
        this.provider = provider == null ? "none" : provider.trim().toLowerCase();
    }

    public Minio getMinio() {
        return minio;
    }

    public boolean isMinioEnabled() {
        return "minio".equalsIgnoreCase(provider);
    }

    public static class Minio {

        private String endpoint;
        private String publicEndpoint;
        private String servicePublicEndpoint;
        private String accessKey;
        private String secretKey;
        private String region = "us-east-1";
        private String bucketAttendance = "indice-hr-attendance";
        private String bucketBiometric = "indice-hr-biometric";
        private String bucketDocuments = "indice-hr-documents";
        private int presignExpirySeconds = 900;

        public String getEndpoint() {
            return endpoint;
        }

        public void setEndpoint(String endpoint) {
            this.endpoint = endpoint;
        }

        public String getPublicEndpoint() {
            return publicEndpoint;
        }

        public void setPublicEndpoint(String publicEndpoint) {
            this.publicEndpoint = publicEndpoint;
        }

        public String getServicePublicEndpoint() {
            return servicePublicEndpoint;
        }

        public void setServicePublicEndpoint(String servicePublicEndpoint) {
            this.servicePublicEndpoint = servicePublicEndpoint;
        }

        public String getAccessKey() {
            return accessKey;
        }

        public void setAccessKey(String accessKey) {
            this.accessKey = accessKey;
        }

        public String getSecretKey() {
            return secretKey;
        }

        public void setSecretKey(String secretKey) {
            this.secretKey = secretKey;
        }

        public String getRegion() {
            return region;
        }

        public void setRegion(String region) {
            this.region = region;
        }

        public String getBucketAttendance() {
            return bucketAttendance;
        }

        public void setBucketAttendance(String bucketAttendance) {
            this.bucketAttendance = bucketAttendance;
        }

        public String getBucketBiometric() {
            return bucketBiometric;
        }

        public void setBucketBiometric(String bucketBiometric) {
            this.bucketBiometric = bucketBiometric;
        }

        public String getBucketDocuments() {
            return bucketDocuments;
        }

        public void setBucketDocuments(String bucketDocuments) {
            this.bucketDocuments = bucketDocuments;
        }

        public int getPresignExpirySeconds() {
            return presignExpirySeconds;
        }

        public void setPresignExpirySeconds(int presignExpirySeconds) {
            this.presignExpirySeconds = presignExpirySeconds;
        }
    }
}
