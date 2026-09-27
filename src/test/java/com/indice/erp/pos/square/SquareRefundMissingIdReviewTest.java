package com.indice.erp.pos.square;

import com.indice.erp.pos.*;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

class SquareRefundMissingIdReviewTest {
    @Test void merchantReviewResumesOnlyThePersistedExactKey() {
        var context = new PosContext(11L, 7L, "Owner", "admin", true, PosScope.corporateOffice());
        var policy = mock(SquareRefundPolicy.class); var intents = mock(SquarePaymentIntentRepository.class);
        var access = mock(SquarePaymentAccess.class); var queries = mock(SquareRefundQueries.class);
        var recovery = mock(SquareRefundRecovery.class); var missing = mock(SquareRefundMissingIdResolution.class);
        var intent = SquareRefundFixtures.intent();
        var blocked = SquareRefundFixtures.refund("RECONCILIATION_REQUIRED", null, null);
        var resumed = SquareRefundFixtures.refund("UNCERTAIN", null, null);
        when(intents.findById(context, 91L)).thenReturn(java.util.Optional.of(intent));
        when(queries.find(7L, 71L, false)).thenReturn(java.util.Optional.of(blocked));
        when(missing.resolve(intent,blocked,SquareRefundActor.user(11L),"provider evidence"))
            .thenReturn(resumed);
        var result = new SquareRefundReviewService(policy, intents, access, queries, recovery,
            missing).recheck(context, 91L, 71L,
                new SquareRefundReviewRequest(" provider evidence ", 4L));
        assertThat(result.key()).isEqualTo("refund_key");
        verify(missing).resolve(intent,blocked,SquareRefundActor.user(11L),"provider evidence");
        verifyNoInteractions(recovery);
    }
}
