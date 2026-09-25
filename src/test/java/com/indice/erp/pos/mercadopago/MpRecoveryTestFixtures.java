package com.indice.erp.pos.mercadopago;

import com.fasterxml.jackson.databind.JsonNode;
import java.util.Optional;
import java.util.function.Function;
import java.util.function.Supplier;
import org.springframework.jdbc.core.JdbcTemplate;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

final class MpRecoveryTestFixtures {
    final JdbcTemplate jdbc = mock(JdbcTemplate.class);
    final MpIntentStore store = mock(MpIntentStore.class);
    final MpMerchantTokens tokens = mock(MpMerchantTokens.class);
    final MpPointGateway gateway = mock(MpPointGateway.class);
    final MpPaymentFinalizer finalizer = mock(MpPaymentFinalizer.class);
    final MpIntent approved = MpPaymentTestFixtures.change(MpPaymentTestFixtures.intent(), "status", "APPROVED");
    final MpPaymentRecovery recovery;
    MpRecoveryTestFixtures(JsonNode order) {
        when(store.find(42, 17)).thenReturn(Optional.of(approved));
        when(store.lock(42, 17)).thenReturn(approved);
        when(tokens.connection(42)).thenReturn(MpTestFixtures.connection());
        when(tokens.withCompanyToken(eq(42L), any())).thenAnswer(call ->
            ((Function<String, ?>) call.getArgument(1)).apply("synthetic-token"));
        when(gateway.getOrder("synthetic-token", "ORDtest")).thenReturn(order);
        var locks = mock(MpFinancialEvidenceLock.class);
        when(locks.apply(eq(approved), any())).thenAnswer(call -> ((Supplier<?>) call.getArgument(1)).get());
        when(jdbc.update(contains("verified_evidence_json=?"), any(Object[].class))).thenReturn(1);
        var writer = new MpIntentWriter(jdbc);
        var audit = new MpPaymentAudit(jdbc);
        var application = new MpEvidenceApplication(locks, store, writer,
            new MpRefundEvidence(null, new MpOrderOwnership(), null), audit);
        recovery = new MpPaymentRecovery(tokens, gateway, MpPaymentTestFixtures.verifier(),
            new MpActionRequiredRecovery(gateway, new MpOrderOwnership(), MpPaymentTestFixtures.JSON),
            store, writer, null, finalizer, audit, application);
    }
}
