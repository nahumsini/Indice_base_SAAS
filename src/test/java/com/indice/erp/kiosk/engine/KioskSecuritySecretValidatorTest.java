package com.indice.erp.kiosk.engine;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class KioskSecuritySecretValidatorTest {

    @Test
    void acceptsStrongIndependentSecrets() {
        assertThatCode(() -> new KioskSecuritySecretValidator(
            "hr-identification-secret-for-tests-123456",
            "kiosk-protection-secret-for-tests-123456"))
            .doesNotThrowAnyException();
    }

    @Test
    void rejectsReusedOrWeakSecrets() {
        var reused = "same-kiosk-security-secret-for-tests-1234";
        assertThatThrownBy(() -> new KioskSecuritySecretValidator(reused, reused))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("must be different");
        assertThatThrownBy(() -> new KioskSecuritySecretValidator(
            "short", "kiosk-protection-secret-for-tests-123456"))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("32 characters");
    }
}
