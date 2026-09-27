package com.indice.erp.pos.square;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import java.time.Instant;
import org.junit.jupiter.api.Test;

class SquareSubmissionClaimTest {
    @Test void staleCrashLeaseRetriesOnlyAfterAuthoritativeSearch() {
        var f=new SquarePaymentCreationFixture(); var intent=f.storedIntent(Instant.now(),"{\"idempotency_key\":\"key\"}");
        var waiting=new SquareTerminalDtos.PaymentIntentResponse(91,"waiting",intent.amount(),"CAD",null,null,null,null,null);
        when(f.intents.markSubmissionStarted(91,intent.squareRequestJson())).thenReturn(false);
        when(f.recovery.recover(f.context(),91)).thenReturn(waiting);
        when(f.intents.markSubmissionRetry(eq(91L),any(Instant.class))).thenReturn(true);
        var claim=new SquareSubmissionClaim(f.dependencies,f.recovery,f.responses,f.submissionBody());
        assertThat(claim.acquire(f.context(),intent).response()).isNull();
        var order=inOrder(f.recovery,f.intents); order.verify(f.recovery).recover(f.context(),91);
        order.verify(f.intents).markSubmissionRetry(eq(91L),any(Instant.class));
    }
    @Test void freshCrashLeaseReturnsRecoveryWithoutConcurrentReplay() {
        var f=new SquarePaymentCreationFixture(); var intent=f.storedIntent(Instant.now(),"{\"idempotency_key\":\"key\"}");
        var waiting=new SquareTerminalDtos.PaymentIntentResponse(91,"waiting",intent.amount(),"CAD",null,null,null,null,null);
        when(f.intents.markSubmissionStarted(91,intent.squareRequestJson())).thenReturn(false);
        when(f.recovery.recover(f.context(),91)).thenReturn(waiting);
        var claim=new SquareSubmissionClaim(f.dependencies,f.recovery,f.responses,f.submissionBody());
        assertThat(claim.acquire(f.context(),intent).response()).isSameAs(waiting);
        verify(f.intents).markSubmissionRetry(eq(91L),any(Instant.class));
        verifyNoInteractions(f.gateway);
    }
    @Test void expiredReplayWindowRequiresManualReconciliation() {
        var f=new SquarePaymentCreationFixture(); var intent=f.storedIntent(Instant.now().minusSeconds(301),"{}");
        var waiting=new SquareTerminalDtos.PaymentIntentResponse(91,"waiting",intent.amount(),"CAD",null,null,null,null,null);
        var uncertain=new SquareTerminalDtos.PaymentIntentResponse(91,"uncertain",intent.amount(),"CAD",null,null,"manual",null,null);
        when(f.recovery.recover(f.context(),91)).thenReturn(waiting); when(f.responses.status(f.context(),91)).thenReturn(uncertain);
        var result=new SquareSubmissionClaim(f.dependencies,f.recovery,f.responses,f.submissionBody())
            .acquire(f.context(),intent);
        assertThat(result.response()).isSameAs(uncertain);
        verify(f.intents).markGatewayStatus(eq(91L),argThat(s -> "SQUARE_RECONCILIATION_REQUIRED".equals(s.failureCode())));
        verify(f.intents,never()).markSubmissionRetry(eq(91L),any());
    }
}
