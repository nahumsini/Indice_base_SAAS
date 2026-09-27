package com.indice.erp.pos.mercadopago;
import com.indice.erp.pos.PosApiException;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
class MpRefundReviewCompletionTest {
    private final MpEvidenceApplication evidence=mock(MpEvidenceApplication.class); private final MpRefundRequestStore requests=mock(MpRefundRequestStore.class);
    private final MpRefundReviewLease leases=mock(MpRefundReviewLease.class); private final MpRefundWorkStatus statuses=mock(MpRefundWorkStatus.class);
    private final MpPaymentAudit audit=mock(MpPaymentAudit.class); private final MpFinancialEvidenceLock locks=mock(MpFinancialEvidenceLock.class);
    private final MpIntentStore intents=mock(MpIntentStore.class);
    private final MpRefundReviewCompletion completion = new MpRefundReviewCompletion(evidence, requests, leases,
        statuses, audit, locks, intents, new MpProperties(), MpTestFixtures.CLOCK);
    { when(locks.apply(any(),any())).thenAnswer(c->((java.util.function.Supplier<?>)c.getArgument(1)).get()); when(intents.lock(42,17)).thenReturn(MpPaymentTestFixtures.intent()); }
    @Test void confirmedEvidenceAndReasonCompleteTogether() {
        var intent = MpPaymentTestFixtures.intent(); var refund = MpRefundTestFixtures.record("UNCERTAIN");
        var claimed = claimed(refund); var confirmed = changed(claimed, "status", "CONFIRMED", 2L);
        var request = new MpRefundReviewRequest("provider refund confirmed", 0L);
        var verified = new MpVerifiedOrder(null, null);
        when(leases.lockOwned(refund, "lease", MpTestFixtures.NOW)).thenReturn(Optional.of(claimed));
        when(evidence.applyLocked(intent, verified, MpAuditActor.user(11))).thenReturn(true);
        when(requests.find(42, 19)).thenReturn(Optional.of(confirmed));
        assertSame(confirmed, completion.complete(intent.context(), intent, refund, "lease", request, verified));
        verify(audit).review(intent, MpAuditActor.user(11), "REFUND_RECHECK",
            "CONFIRMED", "provider refund confirmed", 2L);
        verifyNoInteractions(statuses);
    }
    @Test void lostLeaseCannotApplyEvidenceOrWriteReason() {
        var intent = MpPaymentTestFixtures.intent(); var refund = MpRefundTestFixtures.record("PENDING");
        var request = new MpRefundReviewRequest("provider refund unresolved", 0L);
        assertThrows(PosApiException.class, () -> completion.complete(
            intent.context(), intent, refund, "lost", request, new MpVerifiedOrder(null, null)));
        verifyNoInteractions(evidence, requests, statuses, audit);
    }
    @Test void unresolvedStatusKeepsItsOperatorReason() {
        var intent = MpPaymentTestFixtures.intent(); var refund = MpRefundTestFixtures.record("PENDING");
        var claimed = claimed(refund); var reviewed = changed(claimed, "status", "RECONCILIATION_REQUIRED", 2L);
        var request = new MpRefundReviewRequest("provider refund unresolved", 0L);
        when(leases.lockOwned(refund, "lease", MpTestFixtures.NOW)).thenReturn(Optional.of(claimed));
        when(requests.find(42, 19)).thenReturn(Optional.of(claimed), Optional.of(reviewed));
        when(statuses.checked(eq(claimed), eq("lease"), anyString(), anyString(), any())).thenReturn(true);
        assertSame(reviewed, completion.complete(intent.context(), intent, refund, "lease", request, null));
        verify(audit).review(intent, MpAuditActor.user(11), "REFUND_RECHECK",
            "RECONCILIATION_REQUIRED", "provider refund unresolved", 2L);
    }
    private MpRefundRecord claimed(MpRefundRecord refund) { return changed(refund, "workLeaseId", "lease", 1L); }
    private MpRefundRecord changed(MpRefundRecord refund, String field, Object value, long version) { return MpRefundTestFixtures.change(MpRefundTestFixtures.change(refund, field, value), "version", version); }
}
