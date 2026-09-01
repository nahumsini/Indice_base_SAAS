package com.indice.erp.pos.square;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.security.SecureRandom;
import org.junit.jupiter.api.Test;

class SquareTokenCodecTest {

    private static final String FIRST_SECRET = "first-square-terminal-test-secret-123456";
    private static final String SECOND_SECRET = "second-square-terminal-test-secret-12345";

    @Test
    void protectsRecoverableTokensWithoutLeakingTheRawValue() {
        var codec = new SquareTokenCodec(FIRST_SECRET, new SecureRandom());
        var raw = "EAAAEaSQUARE_ACCESS_TOKEN";

        var protectedValue = codec.protect(raw);

        assertThat(protectedValue).startsWith(SquareTokenCodec.PREFIX).doesNotContain(raw);
        assertThat(codec.reveal(protectedValue)).isEqualTo(raw);
    }

    @Test
    void refusesTokensProtectedWithAnotherSecret() {
        var protectedValue = new SquareTokenCodec(FIRST_SECRET, new SecureRandom()).protect("square-token");

        assertThatThrownBy(() -> new SquareTokenCodec(SECOND_SECRET, new SecureRandom()).reveal(protectedValue))
            .isInstanceOf(IllegalStateException.class);
    }

    @Test
    void rejectsWeakProtectionSecrets() {
        assertThatThrownBy(() -> new SquareTokenCodec("short", new SecureRandom()))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("32 characters");
    }
}
