package com.indice.erp.pos.mercadopago;

import java.util.Optional;
import java.util.function.Function;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class MpRefundSubmissionTest {
    private final MpRefundWorkClaims claims = mock(MpRefundWorkClaims.class);
    private final MpRefundTransition transitions = mock(MpRefundTransition.class);
    private final MpRefundRequestStore requests = mock(MpRefundRequestStore.class);
    private final MpMerchantTokens tokens = mock(MpMerchantTokens.class);
    private final MpRefundEligibility eligibility = new MpRefundEligibility(tokens, MpTestFixtures.CLOCK);
    private final MpPointGateway gateway = mock(MpPointGateway.class);
    private final MpRefundProviderSubmission provider = new MpRefundProviderSubmission(eligibility, tokens, gateway);
    private final MpRefundSubmission service = new MpRefundSubmission(claims, transitions, requests,
        provider, new MpProperties(), MpTestFixtures.CLOCK);
    @BeforeEach void prepare() {
        when(claims.submission(any(), anyString(), any(), anyInt())).thenReturn(true);
        when(tokens.connection(42)).thenReturn(MpTestFixtures.connection());
        when(tokens.withCompanyToken(eq(42L), any())).thenAnswer(call ->
            ((Function<String, ?>) call.getArgument(1)).apply("token"));
    }
    @Test void deterministicProviderRejectionDoesNotBecomeUncertain() {
        var waiting = MpRefundTestFixtures.record("WAITING");
        var rejected = MpRefundTestFixtures.record("REJECTED");
        when(gateway.refundOrder(anyString(), anyString(), anyString(), anyString()))
            .thenThrow(new MpGatewayException(422, false));
        when(requests.byKey(42, "refund_key")).thenReturn(Optional.of(rejected));
        service.submit(MpPaymentTestFixtures.intent(), waiting, MpAuditActor.user(11));
        verify(transitions).complete(eq(waiting), anyString(), eq(MpAuditActor.user(11)),
            eq("REJECTED"), eq("HTTP_422"), any());
    }
    @Test void ambiguousProviderFailureRemainsUnresolved() {
        var waiting = MpRefundTestFixtures.record("WAITING");
        when(gateway.refundOrder(anyString(), anyString(), anyString(), anyString()))
            .thenThrow(new MpGatewayException(429, true));
        when(requests.byKey(42, "refund_key")).thenReturn(Optional.of(MpRefundTestFixtures.record("UNCERTAIN")));
        service.submit(MpPaymentTestFixtures.intent(), waiting, MpAuditActor.user(11));
        verify(transitions).complete(eq(waiting), anyString(), eq(MpAuditActor.user(11)),
            eq("UNCERTAIN"), eq("HTTP_429"), any());
    }
}
