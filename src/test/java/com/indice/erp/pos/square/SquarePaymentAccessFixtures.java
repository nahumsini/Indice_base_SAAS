package com.indice.erp.pos.square;

import com.indice.erp.pos.shift.ShiftRecord;
import com.indice.erp.pos.shift.ShiftRepository;
import com.indice.erp.pos.status.ShiftStatus;
import java.math.BigDecimal;
import java.util.Optional;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

final class SquarePaymentAccessFixtures {
    private SquarePaymentAccessFixtures() {}
    static SquarePaymentAccess access() {
        var shifts = mock(ShiftRepository.class);
        lenient().when(shifts.findById(any(), anyLong())).thenReturn(Optional.of(shift()));
        return new SquarePaymentAccess(shifts);
    }
    static ShiftRecord shift() {
        return new ShiftRecord(41L, 7L, 5L, 6L, 21L, 31L, "Register", 11L, null, ShiftStatus.CLOSED,
            BigDecimal.ZERO, BigDecimal.ZERO, null, null, "CAD", null, null, null, null,
            11L, null, null, null, 0L, null, null);
    }
    static SquareRecords.PaymentIntent completed() {
        return new SquareRecords.PaymentIntent(91L, 7L, 31L, 41L, 51L, "loc-1", "device-1", "key-1", "co-1", "pay-1",
            SquareTerminalPaymentStatus.APPROVED, new BigDecimal("10.50"), "CAD", "hash", "{}", null, 100L,
            11L, "admin", "CORPORATE_OFFICE", null, null, null, null, null);
    }
}
