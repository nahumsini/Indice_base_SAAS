package com.indice.erp.pos.cashregister;

import com.indice.erp.pos.PosContext;
import com.indice.erp.pos.cashregister.dto.CashRegisterCreateRequest;
import com.indice.erp.pos.cashregister.dto.CashRegisterResponse;
import com.indice.erp.pos.status.CashRegisterStatus;
import java.math.BigDecimal;
import java.util.NoSuchElementException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
class CashRegisterProvisioning {
    private final CashRegisterDependencies d;
    private final CashRegisterCodes codes;
    private final CashRegisterWarehouseScope scope;
    CashRegisterProvisioning(CashRegisterDependencies dependencies, CashRegisterCodes codes, CashRegisterWarehouseScope scope) {
        this.d = dependencies;
        this.codes = codes;
        this.scope = scope;
    }
    @Transactional
    public CashRegisterResponse ensure(PosContext context, long warehouseId) {
        var warehouse = d.repository().findWarehouseForMutation(context, warehouseId)
            .orElseThrow(() -> new NoSuchElementException("Warehouse not found."));
        d.validator().requireWarehouseScope(warehouse);
        d.repository().lockCodeAllocation(context.companyId());
        var existing = d.repository().findFirstActiveByWarehouse(context, warehouseId);
        if (existing.isPresent()) return d.mapper().toResponse(scope.reconcile(context, existing.get(), warehouse));
        var request = new CashRegisterCreateRequest(warehouseId, codes.available(context, warehouse),
            "Caja " + warehouse.name(), CashRegisterStatus.ACTIVE, true,
            "Caja aprovisionada automáticamente desde el almacén.", BigDecimal.ZERO, null, null, null, null);
        return d.mapper().toResponse(d.repository().insert(context, d.mapper().toCreateCommand(context, request, warehouse)));
    }
}
