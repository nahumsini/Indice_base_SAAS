package com.indice.erp.pos.square;

import com.fasterxml.jackson.databind.*;
import java.util.function.Function;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class SquareRefundHistoricalReplayTest {
    @Test @SuppressWarnings("unchecked") void laterHttpRejectionCannotClearEarlierDeliveryUncertainty() {
        var tokens = mock(SquareConnectionTokenService.class); var payments = mock(SquarePaymentEvidenceGateway.class);
        var proof = mock(SquareRefundPaymentProof.class); var gateway = mock(SquareRefundGateway.class);
        var node = new ObjectMapper().createObjectNode(); when(gateway.request(anyString())).thenReturn(node);
        when(payments.payment("token", "payment-1")).thenReturn(node);
        when(tokens.withCompanyToken(eq(7L), any())).thenAnswer(call ->
            ((Function<String, JsonNode>) call.getArgument(1)).apply("token"));
        when(gateway.create("token", node)).thenThrow(
            new SquareGatewayException("rejected", false, 400, null));
        var outcome = new SquareRefundProviderSubmission(mock(),tokens,payments,proof,gateway,mock())
            .submit(SquareRefundFixtures.intent(), SquareRefundFixtures.refund("SUBMITTING", null, null));
        assertThat(outcome.status()).isEqualTo("RECONCILIATION_REQUIRED");
        verify(proof).requireReplay(any(),any(),same(node));
    }
}
