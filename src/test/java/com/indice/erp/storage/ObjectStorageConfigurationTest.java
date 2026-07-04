package com.indice.erp.storage;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class ObjectStorageConfigurationTest {

    @Test
    void keepsComposeMinioEndpointWhenHostnameResolves() {
        var endpoint = ObjectStorageConfiguration.endpointForRuntime("http://minio:9000", host -> true);

        assertThat(endpoint).isEqualTo("http://minio:9000");
    }

    @Test
    void fallsBackToLocalhostWhenMinioHostnameDoesNotResolve() {
        var endpoint = ObjectStorageConfiguration.endpointForRuntime("http://minio:9000", host -> false);

        assertThat(endpoint).isEqualTo("http://127.0.0.1:9000");
    }

    @Test
    void keepsNonMinioEndpointUnchanged() {
        var endpoint = ObjectStorageConfiguration.endpointForRuntime("http://storage.internal:9000", host -> false);

        assertThat(endpoint).isEqualTo("http://storage.internal:9000");
    }
}
