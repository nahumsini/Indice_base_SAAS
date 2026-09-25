package com.indice.erp.pos.square;

import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

class SquareRefundMissingIdResolutionTest {
    @Test void operatorReviewAllowsOneExactKeyReplay() {
        var missing=mock(SquareRefundMissingIdReview.class);
        var lifecycle=mock(SquareRefundLifecycle.class);
        var intent=SquareRefundFixtures.intent(); var actor=SquareRefundActor.user(11L);
        var blocked=SquareRefundFixtures.refund("RECONCILIATION_REQUIRED",null,null);
        var claim=new SquareRefundManualClaim(blocked,"lease");
        when(missing.claim(blocked,actor,"provider evidence")).thenReturn(claim);
        when(lifecycle.progressManual(intent,claim,actor)).thenReturn(blocked);
        var result=new SquareRefundMissingIdResolution(missing,lifecycle)
            .resolve(intent,blocked,actor,"provider evidence");
        assertThat(result).isSameAs(blocked); verify(lifecycle).progressManual(intent,claim,actor);
    }
}
