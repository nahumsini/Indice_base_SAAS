package com.indice.erp.pos.cashregister;

import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.indice.erp.pos.PosApiException;
import com.indice.erp.pos.context.dto.WarehouseSummary;
import com.indice.erp.pos.status.CashRegisterStatus;
import java.time.Instant;
import org.junit.jupiter.api.Test;

class CashRegisterValidatorTest {

    private final CashRegisterValidator validator = new CashRegisterValidator();

    @Test
    void warehouseRequiresUnitAndBusinessAssignment() {
        var warehouse = new WarehouseSummary(30L, "MAIN", "Main", null, null, null, null, "active");

        assertThatThrownBy(() -> validator.requireWarehouseScope(warehouse))
            .isInstanceOf(PosApiException.class)
            .hasMessage("Warehouse must be assigned to a business unit and business.");
    }

    @Test
    void registerScopeMustMatchWarehouseScope() {
        var warehouse = new WarehouseSummary(30L, "MAIN", "Main", 5L, "Unit", 6L, "Business", "active");
        var register = new CashRegisterRecord(
            20L, 1L, 5L, 7L, 30L, "Main", "REG-1", "Register 1",
            CashRegisterStatus.ACTIVE, true, null, 10L, null, Instant.now(), Instant.now(), null, 0L, null, null
        );

        assertThatThrownBy(() -> validator.requireWarehouseMatch(register, warehouse))
            .isInstanceOf(PosApiException.class)
            .hasMessage("Cash register scope does not match its warehouse. Update the cash register before operating it.");
    }
}
