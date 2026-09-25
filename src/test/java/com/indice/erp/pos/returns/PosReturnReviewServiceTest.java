package com.indice.erp.pos.returns;

import com.indice.erp.pos.PosApiException;
import com.indice.erp.pos.PosContext;
import com.indice.erp.pos.PosScope;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class PosReturnReviewServiceTest {
    private final PosContext context = new PosContext(11L, 42L, "Owner", "admin", true, PosScope.corporateOffice());
    private PosReturnRecord sale(long version) {
        var refund = new PosReturnRefundState(7L, "key", new BigDecimal("20"), "UNCERTAIN", "reason", Instant.now(), version);
        return new PosReturnRecord(8L, "POS-TEST", "COMPLETED", Instant.now(), new BigDecimal("70"),
            "MXN", "MERCADO_PAGO", 19L, "PARTIALLY_REFUNDED", new BigDecimal("70"), BigDecimal.ZERO, refund);
    }
    @Test void recheckUsesTheLatestServerResolvedRefundAndNeverSubmitsAnotherRefund() {
        var repository = mock(PosReturnRepository.class); var gateway = mock(PosReturnPaymentGateway.class);
        when(repository.find(context, "POS-TEST")).thenReturn(Optional.of(sale(4L)));
        var reviews = new PosReturnReviewService(new PosReturnService(repository, gateway), gateway);
        reviews.recheck(context, "POS-TEST", new PosReturnReviewRequest(" provider evidence ", 4L));
        var request = ArgumentCaptor.forClass(PosReturnReviewRequest.class);
        verify(gateway).recheck(eq(context), eq("MERCADO_PAGO"), eq(19L), eq(7L), request.capture());
        assertEquals("provider evidence", request.getValue().reason());
        verify(gateway, never()).refund(any(), anyString(), anyLong(), any());
    }
    @Test void staleVersionFailsBeforeAnyProviderCall() {
        var repository = mock(PosReturnRepository.class); var gateway = mock(PosReturnPaymentGateway.class);
        when(repository.find(context, "POS-TEST")).thenReturn(Optional.of(sale(5L)));
        var reviews = new PosReturnReviewService(new PosReturnService(repository, gateway), gateway);
        assertThrows(PosApiException.class, () -> reviews.recheck(context, "POS-TEST",
            new PosReturnReviewRequest("provider evidence", 4L)));
        verifyNoInteractions(gateway);
    }
}
