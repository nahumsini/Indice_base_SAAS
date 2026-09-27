package com.indice.erp.pos.square;

import com.indice.erp.pos.*;
import java.time.*;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.*;

class SquareRefundReservationLockOrderTest {
    @Test void connectionThenIntentThenRefundOrderIsStable() {
        var intents=mock(SquarePaymentIntentRepository.class); var access=mock(SquarePaymentAccess.class);
        var queries=mock(SquareRefundQueries.class); var outstanding=mock(SquareRefundOutstanding.class);
        var merchantLocks=mock(SquareRefundConnectionLock.class); var intent=SquareRefundFixtures.intent();
        var context=new PosContext(11L,7L,"Owner","admin",true,PosScope.corporateOffice());
        var stop=new IllegalStateException("stop after refund lock");
        when(merchantLocks.lock(context)).thenReturn(new SquareRefundMerchant("sandbox","merchant-1"));
        when(intents.lockById(7L,91L)).thenReturn(java.util.Optional.of(intent));
        doThrow(stop).when(outstanding).requireNone(intent);
        var service=new SquareRefundReservation(intents,access,queries,outstanding,null,null,null,
            new SquareRefundEligibility(Clock.fixed(Instant.parse("2026-09-22T00:00:00Z"),ZoneOffset.UTC)),
            null,null,merchantLocks,null);
        assertThatThrownBy(()->service.reserve(context,91L,
            new SquareRefundRequest("refund-key",null,"Return item"))).isSameAs(stop);
        var order=inOrder(merchantLocks,intents,outstanding);
        order.verify(merchantLocks).lock(context); order.verify(intents).lockById(7L,91L);
        order.verify(outstanding).requireNone(intent);
    }
}
