package com.indice.erp.pos.square;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import com.indice.erp.pos.PosApiException;
import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.Test;

class SquarePaymentReservationTest {
    @Test void idempotencyReuseWithDifferentPayloadFailsClosed() {
        var f=new SquarePaymentReservationFixture(); var mismatch=f.intent("other");
        when(f.intents.listRecoverable(f.context,31L,null,10)).thenReturn(List.of());
        when(f.intents.createOrFind(eq(f.context),eq(31L),anyLong(),eq(f.terminal),eq("key"),any(),eq("CAD"),eq("hash"),eq("{}"),any(Instant.class)))
            .thenReturn(mismatch);
        assertThatThrownBy(() -> f.reservation.reserve(f.context,f.request())).isInstanceOf(PosApiException.class)
            .hasMessageContaining("idempotency key was reused");
    }
    @Test void differentPendingDraftBlocksAnotherCharge() {
        var f=new SquarePaymentReservationFixture();
        when(f.intents.listRecoverable(f.context,31L,null,10)).thenReturn(List.of(f.intent("other")));
        assertThatThrownBy(() -> f.reservation.reserve(f.context,f.request())).isInstanceOf(PosApiException.class)
            .hasMessageContaining("Recover or cancel");
        verify(f.intents,never()).createOrFind(any(),anyLong(),anyLong(),any(),any(),any(),any(),any(),any(),any());
    }
}
