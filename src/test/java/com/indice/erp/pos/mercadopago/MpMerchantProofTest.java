package com.indice.erp.pos.mercadopago;

import com.indice.erp.pos.PosApiException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import static org.junit.jupiter.api.Assertions.*;

class MpMerchantProofTest {
    @Test void acceptsVerifiedMexicanSandboxMerchant() {
        assertDoesNotThrow(() -> MpMerchantProof.mexico(new MpProviderDtos.Profile("12345", "MX", "MLM"), "12345"));
        assertDoesNotThrow(() -> MpMerchantProof.tokens(MpTestFixtures.tokens(), false, "12345"));
    }
    @ParameterizedTest @CsvSource({"12345,BR,MLB", "12345,MX,MLB", "98765,MX,MLM", "12345,AR,MLA"})
    void rejectsForeignCountrySiteOrSeller(String id, String country, String site) {
        assertThrows(PosApiException.class, () -> MpMerchantProof.mexico(new MpProviderDtos.Profile(id, country, site), "12345"));
    }
    @Test void rejectsLiveModeAndIdentityMismatch() {
        assertThrows(PosApiException.class, () -> MpMerchantProof.tokens(MpTestFixtures.tokens(), true, "12345"));
        assertThrows(PosApiException.class, () -> MpMerchantProof.tokens(MpTestFixtures.tokens(), false, "99999"));
        var unknownMode = new MpProviderDtos.Tokens("access", "refresh", "12345", 1800, "read write offline_access", null);
        assertThrows(PosApiException.class, () -> MpMerchantProof.tokens(unknownMode, false, null));
    }
    @ParameterizedTest @CsvSource({"read write", "read offline_access", "write offline_access", "read"})
    void requiresAllOperationalScopes(String scope) {
        var token = new MpProviderDtos.Tokens("synthetic-access", "synthetic-refresh", "12345", 1800, scope, false);
        assertThrows(PosApiException.class, () -> MpMerchantProof.tokens(token, false, null));
    }
}
