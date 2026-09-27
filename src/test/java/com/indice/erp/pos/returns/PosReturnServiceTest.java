package com.indice.erp.pos.returns;

import com.indice.erp.pos.PosContext;
import com.indice.erp.pos.PosApiException;
import com.indice.erp.pos.PosScope;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class PosReturnServiceTest {
    private final PosContext context = new PosContext(11L, 42L, "Owner", "admin", true, PosScope.corporateOffice());
    private final PosReturnRecord sale = new PosReturnRecord(8, "POS-TEST", "COMPLETED", Instant.now(),
        new BigDecimal("70.00"), "MXN", "MERCADO_PAGO", 19L, "APPROVED",
        new BigDecimal("70.00"), BigDecimal.ZERO, null);

    @Test void refundUsesTheServerResolvedIntentAndPreservesTheClientRequestKey() {
        var repository = mock(PosReturnRepository.class); var payments = mock(PosReturnPaymentGateway.class);
        when(repository.find(context, "POS-TEST")).thenReturn(Optional.of(sale));
        var service = new PosReturnService(repository, payments);
        service.refund(context, " pos-test ", new PosReturnRefundRequest("original_key", new BigDecimal("20.00"), " customer request "));
        var request = ArgumentCaptor.forClass(PosReturnRefundRequest.class);
        verify(payments).refund(eq(context), eq("MERCADO_PAGO"), eq(19L), request.capture());
        assertEquals("original_key", request.getValue().idempotencyKey());
        assertEquals("customer request", request.getValue().reason());
    }

    @Test void refreshRecoversOnlyTheIntentLinkedToTheScopedTicket() {
        var repository = mock(PosReturnRepository.class); var payments = mock(PosReturnPaymentGateway.class);
        when(repository.find(context, "POS-TEST")).thenReturn(Optional.of(sale));
        var service = new PosReturnService(repository, payments);
        service.refresh(context, "POS-TEST");
        verify(payments).refresh(context, "MERCADO_PAGO", 19L);
    }

    @Test void whitespaceCannotPadAnUnauditableReason() {
        var repository = mock(PosReturnRepository.class); var payments = mock(PosReturnPaymentGateway.class);
        var service = new PosReturnService(repository, payments);
        assertThrows(PosApiException.class, () -> service.refund(context, "POS-TEST",
            new PosReturnRefundRequest("original_key", null, " a ")));
        verifyNoInteractions(repository, payments);
    }
}
