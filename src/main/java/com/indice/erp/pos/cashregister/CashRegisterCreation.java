package com.indice.erp.pos.cashregister;

import com.indice.erp.pos.PosContext;
import com.indice.erp.pos.cashregister.dto.CashRegisterCreateRequest;
import com.indice.erp.pos.cashregister.dto.CashRegisterResponse;
import java.util.NoSuchElementException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
class CashRegisterCreation {
    private final CashRegisterDependencies d;
    private final CashRegisterCodes codes;
    private final CashRegisterSettlementAccess settlements;
    CashRegisterCreation(CashRegisterDependencies dependencies, CashRegisterCodes codes, CashRegisterSettlementAccess settlements) {
        this.d = dependencies;
        this.codes = codes;
        this.settlements = settlements;
    }
    @Transactional
    public CashRegisterResponse create(PosContext context, CashRegisterCreateRequest request) {
        var warehouse = d.repository().findWarehouseForMutation(context, request.warehouseId())
            .orElseThrow(() -> new NoSuchElementException("Warehouse not found."));
        d.validator().requireWarehouseScope(warehouse);
        var code = request.code() == null ? "" : request.code().trim();
        if (code.isBlank()) {
            d.repository().lockCodeAllocation(context.companyId());
            code = codes.available(context, warehouse);
        }
        var effective = new CashRegisterCreateRequest(request.warehouseId(), code, request.name(), request.status(), request.active(),
            request.notes(), request.retainedCashAmount(), request.settlementCurrencyCode(), request.settlementRules(),
            request.customFields(), request.metadata());
        var command = d.mapper().toCreateCommand(context, effective, warehouse);
        d.validator().requireCodeAvailable(d.repository(), context, command.code(), null);
        var created = d.repository().insert(context, command);
        settlements.save(context, created, request.settlementCurrencyCode(), request.settlementRules());
        return d.mapper().toResponse(created, d.settlements().list(context, created.id()));
    }
}
