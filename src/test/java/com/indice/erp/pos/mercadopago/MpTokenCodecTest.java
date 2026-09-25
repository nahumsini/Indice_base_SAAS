package com.indice.erp.pos.mercadopago;

import com.indice.erp.pos.PosApiException;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class MpTokenCodecTest {
    private MpTokenCodec codec() {
        var secrets = mock(MpSecrets.class);
        when(secrets.tokenProtectionSecret()).thenReturn("synthetic-test-protection-key-at-least-32-characters");
        return new MpTokenCodec(secrets);
    }
    @Test void encryptsWithFreshNonceAndTenantBoundAuthentication() {
        var codec = codec();
        String first = codec.protect(42, "sandbox:12345:access", "synthetic-access");
        String second = codec.protect(42, "sandbox:12345:access", "synthetic-access");
        assertNotEquals(first, second);
        assertFalse(first.contains("synthetic-access"));
        assertEquals("synthetic-access", codec.reveal(42, "sandbox:12345:access", first));
        assertThrows(PosApiException.class, () -> codec.reveal(99, "sandbox:12345:access", first));
        assertThrows(PosApiException.class, () -> codec.reveal(42, "production:12345:access", first));
        assertThrows(PosApiException.class, () -> codec.reveal(42, "sandbox:99999:access", first));
        assertThrows(PosApiException.class, () -> codec.reveal(42, "sandbox:12345:refresh", first));
    }
    @Test void rejectsPlaintextAndTamperedCiphertext() {
        var codec = codec();
        assertThrows(PosApiException.class, () -> codec.reveal(42, "access", "synthetic-access"));
        String protectedValue = codec.protect(42, "access", "synthetic-access");
        String changed = protectedValue.substring(0, 15) + "!" + protectedValue.substring(16);
        assertThrows(PosApiException.class, () -> codec.reveal(42, "access", changed));
    }
}
