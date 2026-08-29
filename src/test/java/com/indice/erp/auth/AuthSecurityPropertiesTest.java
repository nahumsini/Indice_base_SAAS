package com.indice.erp.auth;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import org.junit.jupiter.api.Test;

class AuthSecurityPropertiesTest {

    @Test
    void mfaIsRequiredByDefault() {
        var properties = new AuthSecurityProperties();

        assertThat(properties.isMfaRequiredForCompany("Empresa Demo Spring")).isTrue();
    }

    @Test
    void globalMfaRequiredFlagCanDisableMfaForLocalRuns() {
        var properties = new AuthSecurityProperties();
        properties.setMfaRequired(false);

        assertThat(properties.isMfaRequiredForCompany("Empresa Demo Spring")).isFalse();
    }

    @Test
    void temporaryCompanyBypassSkipsMfaForConfiguredCompanyOnly() {
        var properties = new AuthSecurityProperties();
        properties.setMfaTemporaryBypassEnabled(true);
        properties.setMfaTemporaryBypassCompanyNames(List.of("El corazon del caribe"));

        assertThat(properties.isMfaRequiredForCompany("El corazón del caribe")).isFalse();
        assertThat(properties.isMfaRequiredForCompany("Empresa Demo Spring")).isTrue();
    }
}
