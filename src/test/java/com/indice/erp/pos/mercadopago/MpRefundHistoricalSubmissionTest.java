package com.indice.erp.pos.mercadopago;

import java.util.function.Function;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class MpRefundHistoricalSubmissionTest {
    @Test void deterministicReplayFailureCannotEraseAnUnknownEarlierDelivery() {
        var tokens=mock(MpMerchantTokens.class); var gateway=mock(MpPointGateway.class);
        when(tokens.connection(42)).thenReturn(MpTestFixtures.connection());
        when(tokens.withCompanyToken(eq(42L),any())).thenAnswer(call ->
            ((Function<String,?>)call.getArgument(1)).apply("token"));
        when(gateway.refundOrder(anyString(),anyString(),anyString(),anyString()))
            .thenThrow(new MpGatewayException(422,false));
        var provider=new MpRefundProviderSubmission(
            new MpRefundEligibility(tokens,MpTestFixtures.CLOCK),tokens,gateway);
        assertThat(provider.submit(MpPaymentTestFixtures.intent(),
            MpRefundTestFixtures.record("SUBMITTING")).status()).isEqualTo("RECONCILIATION_REQUIRED");
    }
}
