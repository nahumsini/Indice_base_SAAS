package com.indice.erp.pos.square;

import com.fasterxml.jackson.databind.*;
import java.util.function.Function;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class SquareRefundPreflightMismatchTest {
    @Test @SuppressWarnings("unchecked") void firstAttemptMismatchProvesRefundWasNotSubmitted() {
        var merchants = mock(SquareRefundMerchantGuard.class); var tokens = mock(SquareConnectionTokenService.class);
        var payments = mock(SquarePaymentEvidenceGateway.class); var proof = mock(SquareRefundPaymentProof.class);
        var gateway = mock(SquareRefundGateway.class); var node = new ObjectMapper().createObjectNode();
        when(gateway.request(anyString())).thenReturn(node); when(payments.payment("token", "payment-1")).thenReturn(node);
        when(tokens.withCompanyToken(eq(7L), any())).thenAnswer(call ->
            ((Function<String, JsonNode>) call.getArgument(1)).apply("token"));
        doThrow(new SquareRefundEvidenceException("mismatch")).when(proof)
            .require(any(), any(), any());
        var outcome = new SquareRefundProviderSubmission(merchants,tokens,payments,proof,gateway,mock())
            .submit(SquareRefundFixtures.intent(), SquareRefundFixtures.refund("WAITING", null, null));
        assertThat(outcome.status()).isEqualTo("NOT_SUBMITTED");
        verify(gateway, never()).create(anyString(), any());
    }
}
