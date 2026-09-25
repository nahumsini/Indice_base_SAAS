package com.indice.erp.pos.mercadopago;

import com.indice.erp.pos.PosContext;
import com.indice.erp.pos.PosScope;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;

final class MpTestFixtures {
    static final Instant NOW = Instant.parse("2026-09-18T12:00:00Z");
    static final Clock CLOCK = Clock.fixed(NOW, ZoneOffset.UTC);
    static PosContext context() { return new PosContext(11L, 42L, "Test", "admin", true, PosScope.corporateOffice()); }
    static MpConnection connection() {
        return new MpConnection(3, 42, "12345", "sandbox", "CONNECTED", "MX", "MLM", false,
            "encrypted-access", "encrypted-refresh", NOW.plusSeconds(30), "read write offline_access",
            MpCompanyActivation.disabled(), 7, null, null);
    }
    static MpConnection productionConnection(String state) {
        var activation = new MpCompanyActivation(state, NOW, null, null, 11L, null, 2);
        return new MpConnection(4, 42, "12345", "production", "CONNECTED", "MX", "MLM", true,
            "protected-access", "protected-refresh", NOW.plusSeconds(600), "read write offline_access",
            activation, 0, null, null);
    }
    static MpProviderDtos.Tokens tokens() {
        return new MpProviderDtos.Tokens("synthetic-access", "synthetic-refresh", "12345", 15552000,
            "read write offline_access", false);
    }
    static MpTerminal terminal(String status, Long register) {
        return new MpTerminal(5, 42, 3, "NEWLAND_N950__TEST0001", "store1", "pos1", "Test",
            status, "PDV", register, NOW, NOW, "READY".equals(status) ? "READY" : status, null, 7, null, null);
    }
    private MpTestFixtures() {}
}
