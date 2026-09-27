package com.indice.erp.pos.cashregister;

import com.indice.erp.pos.PosApiException;
import com.indice.erp.pos.PosContext;
import java.util.NoSuchElementException;
import org.springframework.stereotype.Component;

@Component
class CashRegisterOwnership {
    private final CashRegisterDependencies d;
    CashRegisterOwnership(CashRegisterDependencies dependencies) {
        this.d = dependencies;
    }
    CashRegisterRecord require(PosContext context, long id) {
        return d.repository().findById(context, id).orElseThrow(() -> new NoSuchElementException("Cash register not found."));
    }
    CashRegisterRecord operational(PosContext context, long id) {
        var register = require(context, id);
        d.validator().requireOperable(register);
        var warehouse = d.repository().findWarehouse(context, register.warehouseId()).orElseThrow(() -> PosApiException.conflict(
            "Cash register warehouse is inactive, unavailable, or missing its business assignment."));
        d.validator().requireWarehouseMatch(register, warehouse);
        return register;
    }
}
