package com.indice.erp.pos.customerdisplay;

import java.security.SecureRandom;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class KioskProtectionKeySentinelTest {

    private static final String SECRET = "kiosk-sentinel-test-protection-secret-1234";

    @Test
    void createsCanaryOnlyAfterCheckingExistingSecretStores() {
        var jdbc = mock(JdbcTemplate.class);
        var codec = new CustomerDisplaySecretCodec(SECRET, new SecureRandom());
        when(jdbc.queryForList(
                anyString(), eq(String.class), eq("KIOSK_TOKEN_PROTECTION_V1")))
            .thenReturn(List.of(), List.of(codec.keyVerificationMac()));
        when(jdbc.queryForList(anyString(), eq(String.class)))
            .thenReturn(List.of(), List.of());

        new KioskProtectionKeySentinel(jdbc, codec).afterSingletonsInstantiated();

        verify(jdbc).update(
            anyString(), eq("KIOSK_TOKEN_PROTECTION_V1"), eq(codec.keyVerificationMac()));
    }

    @Test
    void rejectsADeploymentKeyThatDoesNotMatchTheStoredCanary() {
        var jdbc = mock(JdbcTemplate.class);
        var codec = new CustomerDisplaySecretCodec(SECRET, new SecureRandom());
        when(jdbc.queryForList(
                anyString(), eq(String.class), eq("KIOSK_TOKEN_PROTECTION_V1")))
            .thenReturn(List.of("0".repeat(64)));

        assertThatThrownBy(() ->
            new KioskProtectionKeySentinel(jdbc, codec).afterSingletonsInstantiated())
            .isInstanceOf(IllegalStateException.class)
            .hasMessageContaining("does not match");
        verify(jdbc, never()).update(anyString(), any(), any());
    }

    @Test
    void rejectsCiphertextThatTheConfiguredKeyCannotOpen() {
        var jdbc = mock(JdbcTemplate.class);
        var codec = new CustomerDisplaySecretCodec(SECRET, new SecureRandom());
        when(jdbc.queryForList(
                anyString(), eq(String.class), eq("KIOSK_TOKEN_PROTECTION_V1")))
            .thenReturn(List.of(codec.keyVerificationMac()));
        when(jdbc.queryForList(anyString(), eq(String.class)))
            .thenReturn(List.of("enc.v1.invalid-ciphertext"));

        assertThatThrownBy(() ->
            new KioskProtectionKeySentinel(jdbc, codec).afterSingletonsInstantiated())
            .isInstanceOf(IllegalStateException.class)
            .hasMessageContaining("customer display secret store");
        verify(jdbc, never()).update(anyString(), any(), any());
    }
}
