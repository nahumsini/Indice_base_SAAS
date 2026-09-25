package com.indice.erp.pos.square;

import com.indice.erp.pos.*;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

class SquareRefundReviewServiceTest {
    private final PosContext context = new PosContext(11L, 7L, "Owner", "admin", true,
        PosScope.corporateOffice());
    @Test void staleVersionFailsBeforeAuthenticatedProviderRead() {
        var policy = mock(SquareRefundPolicy.class); var intents = mock(SquarePaymentIntentRepository.class);
        var access = mock(SquarePaymentAccess.class); var queries = mock(SquareRefundQueries.class);
        var recovery = mock(SquareRefundRecovery.class); var missing = mock(SquareRefundMissingIdResolution.class);
        var intent = SquareRefundFixtures.intent();
        when(intents.findById(context, 91L)).thenReturn(java.util.Optional.of(intent));
        when(queries.find(7L, 71L, false)).thenReturn(java.util.Optional.of(
            SquareRefundFixtures.refund("UNCERTAIN", "refund-1", null)));
        var subject = new SquareRefundReviewService(policy, intents, access, queries, recovery, missing);
        assertThatThrownBy(() -> subject.recheck(context, 91L, 71L,
            new SquareRefundReviewRequest("provider evidence", 3L)))
            .isInstanceOf(PosApiException.class);
        verifyNoInteractions(recovery, missing);
    }
    @Test void whitespaceCannotPadTheAuditReason() {
        var intents = mock(SquarePaymentIntentRepository.class); var queries = mock(SquareRefundQueries.class);
        when(intents.findById(context, 91L)).thenReturn(java.util.Optional.of(SquareRefundFixtures.intent()));
        when(queries.find(7L, 71L, false)).thenReturn(java.util.Optional.of(
            SquareRefundFixtures.refund("UNCERTAIN", "refund-1", null)));
        var subject = new SquareRefundReviewService(mock(), intents, mock(), queries, mock(), mock());
        assertThatThrownBy(() -> subject.recheck(context, 91L, 71L,
            new SquareRefundReviewRequest("a       ", 4L))).isInstanceOf(PosApiException.class)
            .hasMessageContaining("reason");
    }
    @Test void missingIdUncertainCanBeReviewedWithoutWaitingForTheScheduler() {
        var intents=mock(SquarePaymentIntentRepository.class); var queries=mock(SquareRefundQueries.class);
        var missing=mock(SquareRefundMissingIdResolution.class); var refund=SquareRefundFixtures.refund(
            "UNCERTAIN",null,null); var intent=SquareRefundFixtures.intent();
        when(intents.findById(context,91L)).thenReturn(java.util.Optional.of(intent));
        when(queries.find(7L,71L,false)).thenReturn(java.util.Optional.of(refund));
        when(missing.resolve(intent,refund,SquareRefundActor.user(11L),"provider evidence"))
            .thenReturn(refund);
        var result=new SquareRefundReviewService(mock(),intents,mock(),queries,mock(),missing)
            .recheck(context,91L,71L,new SquareRefundReviewRequest("provider evidence",4L));
        assertThat(result).isSameAs(refund);
    }
}
