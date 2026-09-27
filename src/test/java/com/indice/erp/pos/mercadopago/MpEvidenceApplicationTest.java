package com.indice.erp.pos.mercadopago;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import com.indice.erp.pos.settlement.TerminalRefundStore;
import java.util.function.Supplier;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class MpEvidenceApplicationTest {
    private final MpFinancialEvidenceLock locks = mock(MpFinancialEvidenceLock.class);
    private final MpIntentStore intents = mock(MpIntentStore.class);
    private final MpIntentWriter writer = mock(MpIntentWriter.class);
    private final TerminalRefundStore ledger = mock(TerminalRefundStore.class);
    private final MpPaymentAudit audit = mock(MpPaymentAudit.class);
    private final MpIntent observed = MpPaymentTestFixtures.intent();
    private final MpVerifiedOrder verified = new MpVerifiedOrder(MpPaymentTestFixtures.order(),
        MpPaymentTestFixtures.verifier().verify(observed, MpPaymentTestFixtures.order()));
    private final MpEvidenceApplication application = new MpEvidenceApplication(locks, intents,
        writer, new MpRefundEvidence(ledger, new MpOrderOwnership(), null), audit);
    @BeforeEach void transaction() {
        when(locks.apply(eq(observed), any())).thenAnswer(call -> ((Supplier<?>) call.getArgument(1)).get());
    }
    @Test void staleProviderEvidenceCannotOverwriteConcurrentIntentVersion() {
        when(intents.lock(42, 17)).thenReturn(MpPaymentTestFixtures.change(observed, "version", 5L));
        assertFalse(application.apply(observed, verified));
        verifyNoInteractions(writer, ledger, audit);
    }
    @Test void failedEvidenceCasCannotProduceRefundLedgerOrPaidAudit() {
        when(intents.lock(42, 17)).thenReturn(observed);
        assertFalse(application.apply(observed, verified));
        verifyNoInteractions(ledger, audit);
    }
    @Test void verifiedEvidenceAndAuditUseLockedStoredCompanyIntent() {
        when(intents.lock(42, 17)).thenReturn(observed);
        when(writer.evidence(observed, verified.evidence())).thenReturn(true);
        assertTrue(application.apply(observed, verified));
        var ordered = inOrder(locks, intents, writer, audit);
        ordered.verify(locks).apply(eq(observed), any());
        ordered.verify(intents).lock(42, 17);
        ordered.verify(writer).evidence(observed, verified.evidence());
        ordered.verify(audit).recordAs(observed, MpAuditActor.system(), "ORDER_VERIFIED", "APPROVED");
    }
}
