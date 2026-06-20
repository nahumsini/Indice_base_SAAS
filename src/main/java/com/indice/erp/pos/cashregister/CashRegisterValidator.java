package com.indice.erp.pos.cashregister;

import com.indice.erp.pos.PosApiException;
import com.indice.erp.pos.PosContext;
import com.indice.erp.pos.context.dto.WarehouseSummary;
import com.indice.erp.pos.status.CashRegisterStatus;
import org.springframework.stereotype.Component;

@Component
public class CashRegisterValidator {

    public void requireCodeAvailable(
            CashRegisterRepository repository,
            PosContext context,
            String code,
            Long excludedRegisterId) {
        if (repository.existsByCode(context, code, excludedRegisterId)) {
            throw PosApiException.conflict("Cash register code already exists.");
        }
    }

    public void requireWarehouseScope(WarehouseSummary warehouse) {
        if (warehouse == null) {
            throw PosApiException.badRequest("warehouseId is required.");
        }
    }

    public void requireDeletable(boolean hasOpenShift) {
        if (hasOpenShift) {
            throw PosApiException.conflict("Cash register has an open shift and cannot be deleted.");
        }
    }

    public void requireOperable(CashRegisterRecord register) {
        if (register.status() != CashRegisterStatus.ACTIVE || !register.active()) {
            throw PosApiException.conflict("Cash register is inactive.");
        }
    }
}
