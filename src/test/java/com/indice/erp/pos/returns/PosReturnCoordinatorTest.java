package com.indice.erp.pos.returns;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import com.indice.erp.pos.*;
import com.indice.erp.pos.square.*;
import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;

class PosReturnCoordinatorTest {
    final PosReturnService service = mock(PosReturnService.class);
    final PosReturnRepository repository = mock(PosReturnRepository.class);
    final SquareRefundService square = mock(SquareRefundService.class);
    final PosReturnCoordinator coordinator = new PosReturnCoordinator(service, repository, square);
    final PosContext context = new PosContext(1L, 2L, "Synthetic", "admin", true, PosScope.corporateOffice());
    final PosReturnService.SquareCommand command = new PosReturnService.SquareCommand("original", "stable-key", "refund", BigDecimal.TEN, "MXN");

    @Test void confirmedProviderEvidenceIsNotRequestedAgainWhenFinalizingInventory() {
        var current = response("COMPLETED");
        when(repository.get(context, 3L)).thenReturn(current);
        when(service.beginSquare(context, 3L)).thenReturn(command);
        when(service.completeConfirmedSquare(context, 3L)).thenReturn(current);
        assertThat(coordinator.confirm(context, 3L, new PosReturnDtos.ConfirmRequest(false, Map.of()))).isSameAs(current);
        verifyNoInteractions(square);
        verify(service, never()).acceptSquare(any(), anyLong(), any(), any());
    }

    @Test void providerConfirmationIsSavedBeforeLocalFinalizationCanFail() {
        when(repository.get(context, 3L)).thenReturn(response("PENDING"));
        when(service.beginSquare(context, 3L)).thenReturn(command);
        when(square.refundOrRecover(context, command)).thenReturn(new SquareTerminalGateway.Refund("refund", "original", "COMPLETED", BigDecimal.TEN, "MXN"));
        when(service.completeConfirmedSquare(context, 3L)).thenThrow(PosApiException.conflict("Inventory reconciliation required"));
        assertThatThrownBy(() -> coordinator.confirm(context, 3L, new PosReturnDtos.ConfirmRequest(false, Map.of())))
                .hasMessageContaining("Inventory reconciliation");
        var order = inOrder(service, square);
        order.verify(service).beginSquare(context, 3L);
        order.verify(square).refundOrRecover(context, command);
        order.verify(service).acceptSquare(context, 3L, "refund", "COMPLETED");
        order.verify(service).completeConfirmedSquare(context, 3L);
    }

    private PosReturnDtos.Response response(String paymentStatus) {
        return new PosReturnDtos.Response(3L, 4L, "TEST", 5L, "PROCESSING", "Full test return", BigDecimal.TEN, "MXN", null,
                List.of(new PosReturnDtos.Payment(6L, 7L, "CARD", BigDecimal.TEN, "MXN", paymentStatus, "refund", null)));
    }
}
