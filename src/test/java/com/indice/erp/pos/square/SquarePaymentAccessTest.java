package com.indice.erp.pos.square;

import com.indice.erp.pos.PosApiException;
import com.indice.erp.pos.PosContext;
import com.indice.erp.pos.PosScope;
import com.indice.erp.pos.shift.ShiftRepository;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

class SquarePaymentAccessTest {
    private final ShiftRepository shifts = mock(ShiftRepository.class);
    private final SquarePaymentAccess access = new SquarePaymentAccess(shifts);
    @Test
    void movedRegisterDoesNotGrantNewBusinessAccessToOriginalCompletedSale() {
        var newScope = new PosContext(11L, 7L, "Admin", "admin", true, PosScope.businessOffice(5L, 7L));
        var completed = SquarePaymentAccessFixtures.completed();
        when(shifts.findById(newScope, completed.shiftId())).thenReturn(Optional.empty());
        assertThatThrownBy(() -> access.require(newScope, completed)).isInstanceOf(PosApiException.class);
        assertThat(access.allowed(newScope, completed)).isFalse();
        verify(shifts, times(2)).findById(newScope, completed.shiftId());
    }
    @Test
    void originalBusinessRetainsReceiptAccessAfterRegisterMoves() {
        var original = new PosContext(11L, 7L, "Admin", "admin", true, PosScope.businessOffice(5L, 6L));
        when(shifts.findById(original, 41L)).thenReturn(Optional.of(SquarePaymentAccessFixtures.shift()));
        assertThatCode(() -> access.require(original, SquarePaymentAccessFixtures.completed())).doesNotThrowAnyException();
    }
    @Test
    void corporateAuthorizedActorMayReadOriginalCompletedShift() {
        var corporate = new PosContext(11L, 7L, "Admin", "admin", true, PosScope.corporateOffice());
        when(shifts.findById(corporate, 41L)).thenReturn(Optional.of(SquarePaymentAccessFixtures.shift()));
        assertThatCode(() -> access.require(corporate, SquarePaymentAccessFixtures.completed())).doesNotThrowAnyException();
    }
    @Test
    void originalShiftAccessStillCannotBypassCashierActorRestriction() {
        var anotherCashier = new PosContext(12L, 7L, "Cashier", "cashier", false, PosScope.corporateOffice());
        when(shifts.findById(anotherCashier, 41L)).thenReturn(Optional.of(SquarePaymentAccessFixtures.shift()));
        assertThatThrownBy(() -> access.require(anotherCashier, SquarePaymentAccessFixtures.completed())).isInstanceOf(PosApiException.class);
    }
}
