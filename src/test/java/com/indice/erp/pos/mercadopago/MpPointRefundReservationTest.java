package com.indice.erp.pos.mercadopago;

import com.indice.erp.pos.PosApiException;
import com.indice.erp.pos.settlement.TerminalRefundAdjustmentAdmission;
import com.indice.erp.pos.settlement.TerminalRefundStore;
import java.math.BigDecimal;
import java.util.Optional;
import java.util.function.Supplier;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class MpPointRefundReservationTest {
    private final MpFinancialEvidenceLock locks = mock(MpFinancialEvidenceLock.class);
    private final MpIntentStore intents = mock(MpIntentStore.class);
    private final MpRefundRequestStore requests = mock(MpRefundRequestStore.class);
    private final JdbcTemplate jdbc = mock(JdbcTemplate.class);
    private final MpRefundReservation service = new MpRefundReservation(locks, intents,
        new TerminalRefundStore(jdbc, mock(TerminalRefundAdjustmentAdmission.class)), requests, MpPaymentTestFixtures.JSON,
        new MpRefundAmounts(), new MpRefundOutstanding(jdbc));
    private final MpIntent approved = MpPaymentTestFixtures.change(MpPaymentTestFixtures.intent(), "status", "APPROVED");
    @BeforeEach void prepare() {
        when(locks.apply(any(), any())).thenAnswer(call -> ((Supplier<?>) call.getArgument(1)).get());
        when(intents.lock(42, 17)).thenReturn(approved);
        when(requests.byKey(anyLong(), anyString())).thenReturn(Optional.empty());
        when(jdbc.queryForObject(anyString(), eq(BigDecimal.class), eq(42L),
            eq("MERCADO_PAGO"), eq(17L))).thenReturn(new BigDecimal("20.00"));
    }
    @Test void partialRefundUsesConfirmedRemainingBalanceAndPinnedPaymentIdentity() {
        var request = new MpRefundRequest("refund_key", new BigDecimal("20.00"), "synthetic reason");
        service.reserve(approved.context(), approved, request);
        verify(requests).create(eq(approved.context()), eq(approved), eq(request), eq(new BigDecimal("20.00")), eq(new BigDecimal("20.00")),
            contains("PAYtest"), anyString());
    }
    @Test void amountCannotExceedConfirmedRemainingBalance() {
        assertThrows(PosApiException.class, () -> service.reserve(approved.context(), approved,
            new MpRefundRequest("refund_key", new BigDecimal("50.01"), "synthetic reason")));
        verify(requests, never()).create(any(), any(), any(), any(), any(), anyString(), anyString());
    }
    @Test void reusedKeyForAnotherIntentFailsClosed() {
        var existing = MpRefundTestFixtures.record(18, "PENDING");
        when(requests.byKey(42, "refund_key")).thenReturn(Optional.of(existing));
        assertThrows(PosApiException.class, () -> service.reserve(approved.context(), approved,
            new MpRefundRequest("refund_key", BigDecimal.TEN, "synthetic reason")));
    }
}
