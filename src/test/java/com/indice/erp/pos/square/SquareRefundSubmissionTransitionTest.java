package com.indice.erp.pos.square;

import java.time.*;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class SquareRefundSubmissionTransitionTest {
    @Test void auditUsesReloadedVersionAfterAnyClaimPath() {
        var statuses=mock(SquareRefundWorkStatus.class); var queries=mock(SquareRefundQueries.class);
        var audit=mock(SquareRefundAudit.class); var properties=new SquareRefundProperties();
        var observed=SquareRefundFixtures.refund("SUBMITTING",null,"lease",0,1,0,4L);
        var resulting=SquareRefundFixtures.refund("PENDING","refund-1",null,0,1,0,9L);
        when(statuses.submitted(eq(observed),eq("lease"),any(),any())).thenReturn(true);
        when(queries.byKey(7L,"refund_key")).thenReturn(java.util.Optional.of(resulting));
        var service=new SquareRefundSubmissionTransition(statuses,queries,audit,properties,
            Clock.fixed(Instant.parse("2026-09-22T12:00:00Z"),ZoneOffset.UTC));
        var outcome=new SquareRefundSubmissionOutcome("PENDING",null,"refund-1");
        assertThat(service.apply(observed,"lease",outcome,SquareRefundActor.user(11L))).isSameAs(resulting);
        verify(audit).record(resulting,SquareRefundActor.user(11L),
            "REFUND_PENDING","PENDING",null,9L);
    }
}
