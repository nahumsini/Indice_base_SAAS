package com.indice.erp.pos.square;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.*;
import com.indice.erp.pos.PosApiException;
import org.junit.jupiter.api.Test;

class SquarePaymentCancellationTest {
    @Test void missingProviderIdCannotBeLocallyCancelled() {
        var f=new SquarePaymentCreationFixture(); var responses=mock(SquarePaymentResponses.class);
        var intent=f.intent(); when(responses.require(f.context(),91)).thenReturn(intent);
        var cancellation=new SquarePaymentCancellation(f.dependencies,responses);
        assertThatThrownBy(() -> cancellation.cancel(f.context(),91)).isInstanceOf(PosApiException.class)
            .hasMessageContaining("outcome is unknown");
        verify(f.intents,never()).markGatewayStatus(anyLong(),any());
        verify(f.gateway,never()).cancelCheckout(anyString(),anyString());
    }
}
