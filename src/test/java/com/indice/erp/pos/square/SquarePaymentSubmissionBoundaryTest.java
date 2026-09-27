package com.indice.erp.pos.square;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import org.junit.jupiter.api.Test;

class SquarePaymentSubmissionBoundaryTest {
    @Test void startedSubmissionRecoversWithoutAnotherProviderPost() {
        var f=new SquarePaymentCreationFixture(); var intent=f.intent(); var response=f.response("waiting");
        when(f.reservations.reserve(any(),any())).thenReturn(intent);
        when(f.claims.acquire(f.context(),intent)).thenReturn(new SquareSubmissionClaim.Claim(response,null));
        assertThat(f.creation.create(f.context(),f.request())).isSameAs(response);
        verify(f.gateway,never()).createCheckout(any(),any());
    }
    @Test void runtimeFailureAfterDeliveryStartsIsUncertain() {
        var f=new SquarePaymentCreationFixture(); var intent=f.intent(); var response=f.response("uncertain");
        when(f.reservations.reserve(any(),any())).thenReturn(intent);
        var persisted="{\"idempotency_key\":\"key\",\"note\":\"persisted-body\"}";
        when(f.claims.acquire(f.context(),intent)).thenReturn(new SquareSubmissionClaim.Claim(null,persisted));
        when(f.tokens.withToken(any(),any())).thenAnswer(call ->
            ((java.util.function.Function<String,?>)call.getArgument(1)).apply("token"));
        when(f.gateway.createCheckout(any(),any())).thenThrow(new IllegalStateException("unexpected"));
        when(f.responses.finish(f.context(),91L,false)).thenReturn(response);
        assertThat(f.creation.create(f.context(),f.request())).isSameAs(response);
        verify(f.intents).markGatewayStatus(eq(91L),argThat(s -> s.status()==SquareTerminalPaymentStatus.UNCERTAIN
            && "SQUARE_SUBMISSION_UNVERIFIED".equals(s.failureCode())));
        verify(f.gateway).createCheckout("token",persisted);
    }
    @Test void failedSearchForPriorLeaseNeverClosesAsNotSubmitted() {
        var f=new SquarePaymentCreationFixture(); var intent=f.intent(); var response=f.response("uncertain");
        when(f.reservations.reserve(any(),any())).thenReturn(intent);
        when(f.claims.acquire(f.context(),intent)).thenThrow(new SquarePriorSubmissionFailure(new IllegalStateException("search failed")));
        when(f.responses.finish(f.context(),91L,false)).thenReturn(response);
        assertThat(f.creation.create(f.context(),f.request())).isSameAs(response);
        verify(f.intents).markGatewayStatus(eq(91L),argThat(s -> s.status()==SquareTerminalPaymentStatus.UNCERTAIN
            && "SQUARE_SUBMISSION_UNVERIFIED".equals(s.failureCode())));
        verify(f.gateway,never()).createCheckout(any(),any());
    }
    @Test void storedRequestSurvivesPreClaimGuardFailureAsUncertain() {
        var f=new SquarePaymentCreationFixture(); var intent=f.storedIntent(java.time.Instant.now(),"{\"idempotency_key\":\"key\"}");
        when(f.reservations.reserve(any(),any())).thenReturn(intent); doThrow(new IllegalStateException("binding changed")).when(f.dispatch).require(any(),eq(intent));
        when(f.responses.finish(f.context(),91L,false)).thenReturn(f.response("uncertain"));
        f.creation.create(f.context(),f.request());
        verify(f.intents).markGatewayStatus(eq(91L),argThat(s -> s.status()==SquareTerminalPaymentStatus.UNCERTAIN));
        verify(f.claims,never()).acquire(any(),any());
    }
}
