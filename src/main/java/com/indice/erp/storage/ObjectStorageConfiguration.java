package com.indice.erp.storage;

import io.minio.MinioClient;
import java.net.HttpURLConnection;
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
        var runtimeEndpoint = endpointForRuntime(stripTrailingSlash(endpoint), this::hostResolves, this::endpointIsHealthy);
        return MinioClient.builder()
            .endpoint(runtimeEndpoint)
            .credentials(accessKey, secretKey)
            .build();
    }

    private String stripTrailingSlash(String value) {
        return value == null ? null : value.replaceAll("/+$", "");
    }

    static String endpointForRuntime(String endpoint, HostResolver resolver) {
        return endpointForRuntime(endpoint, resolver, candidate -> false);
    }

    static String endpointForRuntime(String endpoint, HostResolver resolver, EndpointProbe probe) {
        if (endpoint == null || endpoint.isBlank()) {
            return endpoint;
        }

        try {
            var uri = new URI(endpoint);
            var host = uri.getHost();
            if (!"minio".equalsIgnoreCase(host) || resolver.resolves(host)) {
                return endpoint;
            }

            for (var candidateHost : new String[] { "host.docker.internal", "172.17.0.1", "127.0.0.1" }) {
                var candidate = replaceHost(uri, candidateHost);
                if (probe.isReachable(candidate)) {
                    return candidate;
                }
            }

            return endpoint;
        } catch (URISyntaxException ex) {
            return endpoint;
        }
    }

    private static String replaceHost(URI uri, String host) throws URISyntaxException {
        return new URI(
            uri.getScheme(),
            uri.getUserInfo(),
            host,
            uri.getPort(),
            uri.getPath(),
            uri.getQuery(),
            uri.getFragment()
        ).toString();
    }

    private boolean hostResolves(String host) {
        try {
            InetAddress.getAllByName(host);
            return true;
        } catch (Exception ex) {
            return false;
        }
    }

    private boolean endpointIsHealthy(String endpoint) {
        HttpURLConnection connection = null;
        try {
            var healthUri = new URI(stripTrailingSlash(endpoint) + "/minio/health/live");
            connection = (HttpURLConnection) healthUri.toURL().openConnection();
            connection.setConnectTimeout(750);
            connection.setReadTimeout(750);
            connection.setRequestMethod("GET");
            var status = connection.getResponseCode();
            return status >= 200 && status < 400;
        } catch (Exception ex) {
            return false;
        } finally {
            if (connection != null) {
                connection.disconnect();
            }
        }
    }

    @FunctionalInterface
    interface HostResolver {
        boolean resolves(String host);
    }

    @FunctionalInterface
    interface EndpointProbe {
        boolean isReachable(String endpoint);
    }
}
