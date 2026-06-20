package com.indice.erp.pos.shift;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.indice.erp.pos.PosApiException;
import com.indice.erp.pos.PosContext;
import com.indice.erp.pos.PosScope;
import com.indice.erp.pos.cashregister.CashRegisterRecord;
import com.indice.erp.pos.cashregister.CashRegisterValidator;
import com.indice.erp.pos.status.CashRegisterStatus;
import com.indice.erp.pos.status.ShiftStatus;
import java.math.BigDecimal;
import java.time.Instant;
import org.junit.jupiter.api.Test;

class ShiftValidatorTest {

    private final ShiftValidator validator = new ShiftValidator(new CashRegisterValidator());

    @Test
    void openingShiftRequiresActiveRegister() {
        assertThatThrownBy(() -> validator.validateOpen(register(CashRegisterStatus.INACTIVE, false), false, false))
            .isInstanceOf(PosApiException.class)
            .hasMessage("Cash register is inactive.");
    }

    @Test
    void openingShiftRejectsExistingOpenShiftForRegister() {
        assertThatThrownBy(() -> validator.validateOpen(register(CashRegisterStatus.ACTIVE, true), true, false))
            .isInstanceOf(PosApiException.class)
            .hasMessage("Cash register already has an open shift.");
    }

    @Test
    void openingShiftRejectsExistingOpenShiftForUser() {
        assertThatThrownBy(() -> validator.validateOpen(register(CashRegisterStatus.ACTIVE, true), false, true))
            .isInstanceOf(PosApiException.class)
            .hasMessage("User already has an open shift.");
    }

    @Test
    void closingShiftCalculatesOverShortAmount() {
        var mapper = new ShiftMapper();
        var command = mapper.toCloseCommand(context(), shift(BigDecimal.valueOf(100)), BigDecimal.valueOf(95), "counted");

        assertThat(command.overShortAmount()).isEqualByComparingTo(BigDecimal.valueOf(-5));
        assertThat(command.status()).isEqualTo(ShiftStatus.CLOSED);
    }

    private PosContext context() {
        return new PosContext(10L, 1L, "Cashier", "admin", true, PosScope.corporateOffice());
    }

    private CashRegisterRecord register(CashRegisterStatus status, boolean active) {
        return new CashRegisterRecord(
            20L, 1L, 5L, 6L, 30L, "Main Warehouse", "REG-1", "Register 1",
            status, active, null, 10L, null, Instant.now(), Instant.now(), null, 0L, null, null
        );
    }

    private ShiftRecord shift(BigDecimal expectedCash) {
        return new ShiftRecord(
            40L, 1L, 5L, 6L, 30L, 20L, "Register 1", 10L, null, ShiftStatus.OPEN,
            expectedCash, expectedCash, null, null, "MXN", Instant.now(), null, "open",
            null, 10L, null, Instant.now(), Instant.now(), 0L, null, null
        );
    }
}
