package com.indice.erp.pos.mercadopago;

import java.util.List;
import org.junit.jupiter.api.Test;
import static org.mockito.Mockito.*;

class MpRefundRecoveryJobTest {
    @Test void exhaustedCrashedSubmissionMovesToMerchantReviewWithoutAnotherRefund() {
        var properties = new MpProperties(); properties.setEnabled(true);
        var queue = mock(MpRefundRecoveryQueue.class); var outcomes = mock(MpRefundRecoveryOutcome.class);
        var intents = mock(MpIntentStore.class); var submission = mock(MpRefundSubmission.class);
        var refund = MpRefundTestFixtures.change(MpRefundTestFixtures.record("SUBMITTING"),
            "submissionAttempts", properties.refundSubmissionAttempts());
        when(queue.due(25)).thenReturn(List.of(refund));
        when(intents.find(42, 17)).thenReturn(java.util.Optional.of(MpPaymentTestFixtures.intent()));
        var job = new MpRefundRecoveryJob(properties, new MpRefundPolicy(true), queue,
            mock(MpRefundWorkClaims.class), outcomes, mock(MpRefundRequestStore.class), intents,
            submission, null, MpTestFixtures.CLOCK);
        job.recover();
        verify(outcomes).unresolved(refund, "RECONCILIATION_REQUIRED", "SUBMISSION_ATTEMPTS_EXHAUSTED");
        verifyNoInteractions(submission);
    }
    @Test void crashAfterReservationResumesWaitingRequestWithItsOriginalKey() {
        var properties = new MpProperties(); properties.setEnabled(true);
        var queue = mock(MpRefundRecoveryQueue.class); var intents = mock(MpIntentStore.class);
        var submission = mock(MpRefundSubmission.class); var refund = MpRefundTestFixtures.record("WAITING");
        var intent = MpPaymentTestFixtures.intent(); when(queue.due(25)).thenReturn(List.of(refund));
        when(intents.find(42, 17)).thenReturn(java.util.Optional.of(intent));
        new MpRefundRecoveryJob(properties, new MpRefundPolicy(true), queue,
            mock(MpRefundWorkClaims.class), mock(MpRefundRecoveryOutcome.class),
            mock(MpRefundRequestStore.class), intents, submission, null, MpTestFixtures.CLOCK).recover();
        verify(submission).submit(intent, refund, MpAuditActor.scheduled());
    }
}
