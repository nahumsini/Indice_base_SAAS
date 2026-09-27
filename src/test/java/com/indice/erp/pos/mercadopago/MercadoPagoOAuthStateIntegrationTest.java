package com.indice.erp.pos.mercadopago;

import static org.junit.jupiter.api.Assertions.*;
import com.indice.erp.pos.PosApiException;
import com.indice.erp.pos.PosContext;
import com.indice.erp.pos.PosScope;
import java.time.Instant;
import org.junit.jupiter.api.Test;

class MercadoPagoOAuthStateIntegrationTest extends MpRegisterDatabaseFixture {
    @Test void stateIsCompanyActorBoundAndConsumedOnlyOnce() {
        var store = application.getBean(MpOAuthStore.class);
        var now = Instant.now();
        var hash = MpSecurity.hash("synthetic-state-" + companyId);
        store.create(context(companyId, actorId), hash, "sandbox", "synthetic-protected-verifier", now.plusSeconds(300));
        assertThrows(PosApiException.class, () -> store.consume(context(companyId, actorId + 1), hash, now));
        assertThrows(PosApiException.class, () -> store.consume(context(company(), actorId), hash, now));
        assertEquals(0, jdbc.queryForObject("SELECT COUNT(*) FROM pos_mercado_pago_oauth_states WHERE company_id=? AND consumed_at IS NOT NULL",
            Integer.class, companyId));
        var state = store.consume(context(companyId, actorId), hash, now);
        assertEquals(companyId, state.companyId());
        assertEquals(actorId, state.actorUserId());
        assertEquals("synthetic-protected-verifier", state.verifierCiphertext());
        assertEquals(0, jdbc.queryForObject("SELECT COUNT(*) FROM pos_mercado_pago_oauth_states WHERE state_hash=?",
            Integer.class, hash));
        assertThrows(PosApiException.class, () -> store.consume(context(companyId, actorId), hash, now));
    }
    @Test void expiredStateRemainsUnconsumed() {
        var store = application.getBean(MpOAuthStore.class);
        var now = Instant.now();
        var hash = MpSecurity.hash("synthetic-expired-state-" + companyId);
        store.create(context(companyId, actorId), hash, "sandbox", "synthetic-protected-verifier", now.minusSeconds(1));
        assertThrows(PosApiException.class, () -> store.consume(context(companyId, actorId), hash, now));
        assertEquals(0, jdbc.queryForObject("SELECT COUNT(*) FROM pos_mercado_pago_oauth_states WHERE company_id=? AND consumed_at IS NOT NULL",
            Integer.class, companyId));
    }
    private PosContext context(long company, long actor) {
        return new PosContext(actor, company, "Synthetic MP actor", "admin", true, PosScope.corporateOffice());
    }
}
