package com.indice.erp.pos.cashregister;

import com.indice.erp.pos.PosContext;
import com.indice.erp.pos.context.dto.WarehouseSummary;
import java.util.Objects;
import java.util.NoSuchElementException;
import org.springframework.stereotype.Component;

@Component
class CashRegisterWarehouseScope {
    private final CashRegisterDependencies d;
    CashRegisterWarehouseScope(CashRegisterDependencies dependencies) {
        this.d = dependencies;
    }
    CashRegisterRecord reconcile(PosContext context, CashRegisterRecord register, WarehouseSummary warehouse) {
        if (Objects.equals(register.unitId(), warehouse.unitId()) && Objects.equals(register.businessId(), warehouse.businessId())) return register;
        d.terminalPayments().lockRegister(context, register.id());
        d.terminalPayments().assertNoPending(context, register.id());
        if (!d.repository().synchronizeScopeFromWarehouse(context, register.id(), warehouse))
            throw new NoSuchElementException("Cash register not found.");
        return d.repository().findFirstActiveByWarehouse(context, warehouse.id())
            .orElseThrow(() -> new NoSuchElementException("Cash register not found."));
    }
}
