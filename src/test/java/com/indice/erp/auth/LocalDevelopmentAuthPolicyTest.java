package com.indice.erp.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.mock.env.MockEnvironment;

class LocalDevelopmentAuthPolicyTest {

    @Test
    void defaultConfigurationNeverBypassesMfa() {
        var environment = new MockEnvironment().withProperty("app.web.public-url", "https://app.indiceapp.com");
        environment.setActiveProfiles("production");
        var properties = new AuthSecurityProperties();
        properties.setMfaRequired(false);
        var policy = new LocalDevelopmentAuthPolicy(environment, properties);

        assertThatCode(policy::validateConfiguration).doesNotThrowAnyException();
        assertThat(policy.isMfaBypassed()).isFalse();
    }

    @Test
    void explicitLoopbackLocalConfigurationAllowsTheOptIn() {
        var properties = new AuthSecurityProperties();
        properties.setMfaRequired(false);
        var policy = new LocalDevelopmentAuthPolicy(localEnvironment(), properties);

        policy.validateConfiguration();

        assertThat(policy.isMfaBypassed()).isTrue();
        properties.setMfaRequired(true);
        assertThat(policy.isMfaBypassed()).isFalse();
    }

    @Test
    void minioProfileAloneDoesNotIdentifyLocalDevelopment() {
        var environment = localEnvironment();
        environment.setActiveProfiles("minio");
        var policy = new LocalDevelopmentAuthPolicy(environment, new AuthSecurityProperties());

        assertThatThrownBy(policy::validateConfiguration).isInstanceOf(IllegalStateException.class);
    }

    @ParameterizedTest
    @ValueSource(strings = {"prod", "production", "staging", "apptest"})
    void deployedProfilesRejectTheLocalExceptionEvenWhenLocalIsAlsoActive(String profile) {
        var environment = localEnvironment();
        environment.setActiveProfiles("local", profile);
        var policy = new LocalDevelopmentAuthPolicy(environment, new AuthSecurityProperties());

        assertThatThrownBy(policy::validateConfiguration).isInstanceOf(IllegalStateException.class);
    }

    @ParameterizedTest
    @ValueSource(strings = {"0.0.0.0", "::", "192.168.1.20"})
    void publicOrLanListenerCannotEnableTheLocalException(String address) {
        var environment = localEnvironment().withProperty("server.address", address);
        var policy = new LocalDevelopmentAuthPolicy(environment, new AuthSecurityProperties());

        assertThatThrownBy(policy::validateConfiguration).isInstanceOf(IllegalStateException.class);
    }

    @ParameterizedTest
    @ValueSource(strings = {"https://app.indiceapp.com", "https://localhost.example.com", "not-a-url"})
    void aPublicOrInvalidApplicationUrlCannotEnableTheLocalException(String url) {
        var environment = localEnvironment().withProperty("app.web.public-url", url);
        var policy = new LocalDevelopmentAuthPolicy(environment, new AuthSecurityProperties());

        assertThatThrownBy(policy::validateConfiguration).isInstanceOf(IllegalStateException.class);
    }

    private MockEnvironment localEnvironment() {
        var environment = new MockEnvironment()
            .withProperty("app.auth.local-mfa-bypass-enabled", "true")
            .withProperty("server.address", "127.0.0.1")
            .withProperty("app.web.public-url", "http://localhost:5173");
        environment.setActiveProfiles("local", "minio");
        return environment;
    }
}
