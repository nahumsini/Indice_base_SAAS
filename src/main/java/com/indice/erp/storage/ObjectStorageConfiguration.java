package com.indice.erp.storage;

import io.minio.MinioClient;
import java.net.InetAddress;
import java.net.URI;
import java.net.URISyntaxException;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class ObjectStorageConfiguration {

    @Bean
    ObjectStorageService objectStorageService(ObjectStorageProperties properties) {
        if (!properties.isMinioEnabled()) {
            return new DisabledObjectStorageService();
        }

        var minio = properties.getMinio();
        var internalClient = buildClient(minio.getEndpoint(), minio.getAccessKey(), minio.getSecretKey());

        return new MinioObjectStorageService(internalClient, properties);
    }

    private MinioClient buildClient(String endpoint, String accessKey, String secretKey) {
        var runtimeEndpoint = endpointForRuntime(stripTrailingSlash(endpoint), this::hostResolves);
        return MinioClient.builder()
            .endpoint(runtimeEndpoint)
            .credentials(accessKey, secretKey)
            .build();
    }

    private String stripTrailingSlash(String value) {
        return value == null ? null : value.replaceAll("/+$", "");
    }

    static String endpointForRuntime(String endpoint, HostResolver resolver) {
        if (endpoint == null || endpoint.isBlank()) {
            return endpoint;
        }

        try {
            var uri = new URI(endpoint);
            var host = uri.getHost();
            if (!"minio".equalsIgnoreCase(host) || resolver.resolves(host)) {
                return endpoint;
            }

            return new URI(
                uri.getScheme(),
                uri.getUserInfo(),
                "127.0.0.1",
                uri.getPort(),
                uri.getPath(),
                uri.getQuery(),
                uri.getFragment()
            ).toString();
        } catch (URISyntaxException ex) {
            return endpoint;
        }
    }

    private boolean hostResolves(String host) {
        try {
            InetAddress.getAllByName(host);
            return true;
        } catch (Exception ex) {
            return false;
        }
    }

    @FunctionalInterface
    interface HostResolver {
        boolean resolves(String host);
    }
}
