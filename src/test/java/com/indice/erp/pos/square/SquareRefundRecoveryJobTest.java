package com.indice.erp.pos.square;

import java.util.List;
import org.junit.jupiter.api.Test;
import static org.mockito.Mockito.*;

class SquareRefundRecoveryJobTest {
    @Test void crashedManualReplayReturnsToReviewWithoutAnotherPost() {
        var policy=mock(SquareRefundPolicy.class); var queries=mock(SquareRefundQueries.class);
        var intents=mock(SquarePaymentIntentRepository.class); var submission=mock(SquareRefundSubmission.class);
        var recovery=mock(SquareRefundRecovery.class); var exhaustion=mock(SquareRefundExhaustion.class);
        var refund=SquareRefundFixtures.refund("SUBMITTING",null,null,2,1,0,4L);
        when(policy.enabled()).thenReturn(true); when(queries.due(25)).thenReturn(List.of(refund));
        when(intents.findById(7L,91L)).thenReturn(java.util.Optional.of(SquareRefundFixtures.intent()));
        new SquareRefundRecoveryJob(policy,new SquareRefundProperties(),queries,intents,submission,
            recovery,exhaustion).recover();
        verify(exhaustion).manualReplayUnknown(refund);
        verifyNoInteractions(submission,recovery);
    }
    @Test void ambiguousDeliveredSubmissionRequiresMerchantReviewWithoutAutomaticReplay() {
        var policy = mock(SquareRefundPolicy.class); var queries = mock(SquareRefundQueries.class);
        var intents = mock(SquarePaymentIntentRepository.class); var submission = mock(SquareRefundSubmission.class);
        var recovery = mock(SquareRefundRecovery.class); var exhaustion = mock(SquareRefundExhaustion.class);
        var refund = SquareRefundFixtures.refund("UNCERTAIN", null, null, 1, 0, 0, 4L);
        var properties = new SquareRefundProperties();
        properties.setSubmissionMaxAttempts(3);
        when(policy.enabled()).thenReturn(true);
        when(queries.due(25)).thenReturn(List.of(refund));
        when(intents.findById(7L, 91L)).thenReturn(java.util.Optional.of(SquareRefundFixtures.intent()));
        new SquareRefundRecoveryJob(policy, properties, queries, intents, submission,
            recovery, exhaustion).recover();
        verify(exhaustion).requireReview(refund);
        verifyNoInteractions(submission, recovery);
    }
}
