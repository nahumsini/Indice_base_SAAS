package com.indice.erp.pos.square;

import com.fasterxml.jackson.databind.*;
import java.util.function.Function;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class SquareRefundProviderSubmissionTest {
    private final SquareRefundMerchantGuard merchants = mock(SquareRefundMerchantGuard.class);
    private final SquareConnectionTokenService tokens = mock(SquareConnectionTokenService.class);
    private final SquarePaymentEvidenceGateway payments = mock(SquarePaymentEvidenceGateway.class);
    private final SquareRefundPaymentProof proof = mock(SquareRefundPaymentProof.class);
    private final SquareRefundGateway gateway = mock(SquareRefundGateway.class);
    private final SquareRefundProviderSubmission subject =
        new SquareRefundProviderSubmission(merchants,tokens,payments,proof,gateway,mock());

    @Test void failureBeforeProviderDeliveryIsDefinitelyNotSubmitted() throws Exception {
        when(gateway.request(anyString())).thenReturn(new ObjectMapper().createObjectNode());
        when(tokens.withCompanyToken(eq(7L), any())).thenThrow(
            new SquareGatewayException("token unavailable", true, null));
        var outcome = subject.submit(SquareRefundFixtures.intent(),
            SquareRefundFixtures.refund("WAITING", null, null));
        assertThat(outcome.status()).isEqualTo("NOT_SUBMITTED");
        verify(gateway, never()).create(anyString(), any());
    }

    @Test @SuppressWarnings("unchecked") void lostPostResponseIsUncertainAndKeepsTheSameRequest() throws Exception {
        var request = new ObjectMapper().createObjectNode(); var payment = mock(JsonNode.class);
        when(gateway.request(anyString())).thenReturn(request);
        when(tokens.withCompanyToken(eq(7L), any())).thenAnswer(call ->
            ((Function<String, JsonNode>) call.getArgument(1)).apply("token"));
        when(payments.payment("token", "payment-1")).thenReturn(payment);
        when(gateway.create("token", request)).thenThrow(
            new SquareGatewayException("response lost", true, 503, null));
        var outcome = subject.submit(SquareRefundFixtures.intent(),
            SquareRefundFixtures.refund("WAITING", null, null));
        assertThat(outcome.status()).isEqualTo("UNCERTAIN");
        verify(gateway).create("token", request);
    }
}
