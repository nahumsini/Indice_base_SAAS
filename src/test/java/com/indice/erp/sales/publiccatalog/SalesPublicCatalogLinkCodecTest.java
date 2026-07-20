package com.indice.erp.sales.publiccatalog;

import java.security.SecureRandom;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class SalesPublicCatalogLinkCodecTest {

    @Test
    void protectsAndRevealsTheBearerTokenWithoutPersistingPlaintext() {
        var codec = new SalesPublicCatalogLinkCodec(
            "test-kiosk-token-protection-secret-123456789", new SecureRandom());
        var token = "spc_1234567890abcdefghijklmnopqrstuvwxyz";

        var protectedToken = codec.protect(token);

        assertThat(protectedToken).startsWith(SalesPublicCatalogLinkCodec.PREFIX);
        assertThat(protectedToken).doesNotContain(token);
        assertThat(codec.reveal(protectedToken)).isEqualTo(token);
    }

    @Test
    void refusesPlaintextAndCiphertextProtectedWithAnotherKey() {
        var codec = new SalesPublicCatalogLinkCodec(
            "test-kiosk-token-protection-secret-123456789", new SecureRandom());
        var other = new SalesPublicCatalogLinkCodec(
            "other-kiosk-token-protection-secret-987654321", new SecureRandom());
        var protectedToken = other.protect("spc_secret");

        assertThatThrownBy(() -> codec.reveal("spc_secret"))
            .isInstanceOf(IllegalStateException.class);
        assertThatThrownBy(() -> codec.reveal(protectedToken))
            .isInstanceOf(IllegalStateException.class);
    }
}
