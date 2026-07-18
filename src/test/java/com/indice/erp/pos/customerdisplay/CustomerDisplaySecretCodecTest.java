package com.indice.erp.pos.customerdisplay;

import java.security.SecureRandom;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class CustomerDisplaySecretCodecTest {

    private static final String FIRST_SECRET = "first-customer-display-test-secret-123456";
    private static final String SECOND_SECRET = "second-customer-display-test-secret-12345";

    @Test
    void protectsRecoverableLegacyValueAndKeepsStableLookupHash() {
        var codec = new CustomerDisplaySecretCodec(FIRST_SECRET, new SecureRandom());
        var raw = "posd_0123456789abcdef0123456789abcdef";

        var protectedValue = codec.protect(raw);

        assertThat(protectedValue).startsWith(CustomerDisplaySecretCodec.PREFIX).doesNotContain(raw);
        assertThat(codec.reveal(protectedValue)).isEqualTo(raw);
        assertThat(codec.hash(raw)).hasSize(64).isEqualTo(codec.hash(codec.reveal(protectedValue)));
        assertThat(codec.hint(raw)).isEqualTo("89abcdef");
    }

    @Test
    void usesAKeyedBlindIndexForLowEntropyPairingCodes() {
        var first = new CustomerDisplaySecretCodec(FIRST_SECRET, new SecureRandom());
        var second = new CustomerDisplaySecretCodec(SECOND_SECRET, new SecureRandom());

        assertThat(first.pairingHash("ABC234"))
            .hasSize(64)
            .isEqualTo(first.pairingHash("ABC234"))
            .isNotEqualTo(first.hash("ABC234"))
            .isNotEqualTo(second.pairingHash("ABC234"));
        assertThat(first.keyVerificationMac())
            .hasSize(64)
            .isEqualTo(first.keyVerificationMac())
            .isNotEqualTo(second.keyVerificationMac());
    }

    @Test
    void refusesCiphertextProtectedWithAnotherSecret() {
        var protectedValue = new CustomerDisplaySecretCodec(FIRST_SECRET, new SecureRandom())
            .protect("posd_token");

        assertThatThrownBy(() -> new CustomerDisplaySecretCodec(SECOND_SECRET, new SecureRandom())
            .reveal(protectedValue))
            .isInstanceOf(IllegalStateException.class);
    }

    @Test
    void rejectsWeakDeploymentSecrets() {
        assertThatThrownBy(() -> new CustomerDisplaySecretCodec("too-short", new SecureRandom()))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("32 characters");
    }
}
