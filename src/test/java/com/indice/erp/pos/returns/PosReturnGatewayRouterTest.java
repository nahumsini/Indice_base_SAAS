package com.indice.erp.pos.returns;

import com.indice.erp.pos.*;
import java.math.BigDecimal;
import java.util.List;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

class PosReturnGatewayRouterTest {
    private final PosContext context = new PosContext(11L, 7L, "Owner", "admin", true,
        PosScope.corporateOffice());
    @Test void dispatchesOnlyToTheProviderResolvedFromTheTicket() {
        var mp = mock(PosReturnProviderGateway.class); var square = mock(PosReturnProviderGateway.class);
        when(mp.providerCode()).thenReturn("MERCADO_PAGO");
        when(square.providerCode()).thenReturn("SQUARE");
        var request = new PosReturnRefundRequest("key", new BigDecimal("2.50"), "Return");
        new PosReturnGatewayRouter(List.of(mp, square)).refund(context, "SQUARE", 91L, request);
        verify(square).refund(context, 91L, request);
        verify(mp, never()).refund(any(), anyLong(), any());
    }
    @Test void rejectsAnUnknownProviderWithoutCallingAnyGateway() {
        var square = mock(PosReturnProviderGateway.class);
        when(square.providerCode()).thenReturn("SQUARE");
        var router = new PosReturnGatewayRouter(List.of(square));
        assertThatThrownBy(() -> router.refresh(context, "OTHER", 91L))
            .isInstanceOf(PosApiException.class);
        verify(square, never()).refresh(any(), anyLong());
    }
}
