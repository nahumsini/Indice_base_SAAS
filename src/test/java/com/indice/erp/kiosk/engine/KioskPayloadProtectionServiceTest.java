package com.indice.erp.kiosk.engine;

import java.security.SecureRandom;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class KioskPayloadProtectionServiceTest {

    private static final String TEST_SECRET = "kiosk-payload-protection-test-secret-1234";

    @Test
    void encryptsReplayPayloadsWithoutPersistingTheirSecrets() {
        var service = new KioskPayloadProtectionService(TEST_SECRET, new SecureRandom());
        var cleartext = "{\"deviceToken\":\"raw-customer-display-token\"}";

        var protectedValue = service.protect(cleartext);

        assertThat(protectedValue)
            .startsWith(KioskPayloadProtectionService.PREFIX)
            .doesNotContain("raw-customer-display-token", "deviceToken");
        assertThat(service.reveal(protectedValue)).isEqualTo(cleartext);
    }

    @Test
    void refusesCiphertextThatWasModified() {
        var service = new KioskPayloadProtectionService(TEST_SECRET, new SecureRandom());
        var protectedValue = service.protect("{\"ok\":true}");
        var tamperIndex = KioskPayloadProtectionService.PREFIX.length() + 5;
        var replacement = protectedValue.charAt(tamperIndex) == 'A' ? 'B' : 'A';
        var tampered = protectedValue.substring(0, tamperIndex) + replacement
            + protectedValue.substring(tamperIndex + 1);

        assertThatThrownBy(() -> service.reveal(tampered))
            .isInstanceOf(IllegalStateException.class);
    }
}
