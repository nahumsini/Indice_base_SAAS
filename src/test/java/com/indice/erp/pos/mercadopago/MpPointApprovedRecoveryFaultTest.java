package com.indice.erp.pos.mercadopago;

import java.util.Optional;
import java.util.function.Function;
import java.util.function.Supplier;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class MpPointApprovedRecoveryFaultTest {
    @Test void saleCompletionFaultPreservesPaidApprovalAndNeverCreatesAnotherOrder() {
        var jdbc = mock(JdbcTemplate.class);
        var store = mock(MpIntentStore.class);
        var tokens = mock(MpMerchantTokens.class);
        var gateway = mock(MpPointGateway.class);
        var finalizer = mock(MpPaymentFinalizer.class);
        var approved = MpPaymentTestFixtures.change(MpPaymentTestFixtures.intent(), "status", "APPROVED");
        when(store.find(42, 17)).thenReturn(Optional.of(approved));
        when(tokens.connection(42)).thenReturn(MpTestFixtures.connection());
        when(tokens.withCompanyToken(eq(42L), any())).thenAnswer(call ->
            ((Function<String, ?>) call.getArgument(1)).apply("synthetic-token"));
        when(gateway.getOrder("synthetic-token", "ORDtest")).thenReturn(MpPaymentTestFixtures.order());
        doThrow(new IllegalStateException("inventory unavailable")).when(finalizer)
            .finalizeApproved(approved, MpAuditActor.system());
        var locks = mock(MpFinancialEvidenceLock.class);
        when(locks.apply(eq(approved), any())).thenAnswer(call -> ((Supplier<?>) call.getArgument(1)).get());
        when(store.lock(42, 17)).thenReturn(approved);
        when(jdbc.update(contains("verified_evidence_json=?"), any(Object[].class))).thenReturn(1);
        var refunds = new MpRefundEvidence(null, new MpOrderOwnership(), null);
        var application = new MpEvidenceApplication(locks, store, new MpIntentWriter(jdbc), refunds, new MpPaymentAudit(jdbc));
        var recovery = new MpPaymentRecovery(tokens, gateway, MpPaymentTestFixtures.verifier(),
            new MpActionRequiredRecovery(gateway, new MpOrderOwnership(), MpPaymentTestFixtures.JSON),
            store, new MpIntentWriter(jdbc), null, finalizer, new MpPaymentAudit(jdbc), application);
        recovery.recover(approved);
        verify(finalizer).finalizeApproved(approved, MpAuditActor.system());
        verify(jdbc).update(contains("status=CASE WHEN status IN ('APPROVED','REFUNDED') THEN status"),
            eq("Payment received; sale completion requires recovery."), eq(42L), eq(17L));
        verify(gateway, never()).createOrder(anyString(), anyString(), anyString());
        verify(jdbc, never()).update(contains("SET pos_ticket_id=?"), any(Object[].class));
    }
}
