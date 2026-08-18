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
        if (!"active".equalsIgnoreCase(warehouse.status())) {
            throw PosApiException.conflict("Warehouse is inactive.");
        }
        if (warehouse.unitId() == null || warehouse.businessId() == null) {
            throw PosApiException.badRequest("Warehouse must be assigned to a business unit and business.");
        }
    }

    public void requireWarehouseMatch(CashRegisterRecord register, WarehouseSummary warehouse) {
        requireWarehouseScope(warehouse);
        if (!register.warehouseId().equals(warehouse.id())
                || !java.util.Objects.equals(register.unitId(), warehouse.unitId())
                || !java.util.Objects.equals(register.businessId(), warehouse.businessId())) {
            throw PosApiException.conflict(
                "Cash register scope does not match its warehouse. Update the cash register before operating it."
            );
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
