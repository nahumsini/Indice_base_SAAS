package com.indice.erp.pos.square;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import com.indice.erp.pos.PosApiException;
import org.junit.jupiter.api.Test;

class SquarePaymentCreationTest {
    @Test void activationRejectionCreatesNoIntent() {
        var f=new SquarePaymentCreationFixture();
        doThrow(PosApiException.conflict("disabled")).when(f.activation).require(7L);
        assertThatThrownBy(() -> f.creation.create(f.context(),f.request()))
            .isInstanceOf(PosApiException.class);
        verifyNoInteractions(f.reservations);
    }
    @Test void verificationFailureClosesIntentBeforePropagating() {
        var f=new SquarePaymentCreationFixture(); var intent=f.intent();
        when(f.reservations.reserve(any(),any())).thenReturn(intent);
        doThrow(PosApiException.conflict("offline")).when(f.dispatch).require(any(),eq(intent));
        assertThatThrownBy(() -> f.creation.create(f.context(),f.request()))
            .isInstanceOf(PosApiException.class);
        verify(f.intents).markGatewayStatus(eq(91L),argThat(s -> s.status()==SquareTerminalPaymentStatus.CANCELLED
            && "SQUARE_NOT_SUBMITTED".equals(s.failureCode())));
        verify(f.gateway,never()).createCheckout(any(),any());
    }
}
