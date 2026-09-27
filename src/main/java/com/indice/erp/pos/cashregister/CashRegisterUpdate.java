package com.indice.erp.pos.cashregister;

import com.indice.erp.pos.PosApiException;
import com.indice.erp.pos.PosContext;
import com.indice.erp.pos.cashregister.dto.CashRegisterUpdateRequest;
import com.indice.erp.pos.cashregister.dto.CashRegisterResponse;
import java.util.NoSuchElementException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
class CashRegisterUpdate {
    private final CashRegisterDependencies d;
    private final CashRegisterOwnership ownership;
    private final CashRegisterSettlementAccess settlements;
    CashRegisterUpdate(CashRegisterDependencies dependencies, CashRegisterOwnership ownership, CashRegisterSettlementAccess settlements) {
        this.d = dependencies;
        this.ownership = ownership;
        this.settlements = settlements;
    }
    @Transactional
    public CashRegisterResponse update(PosContext context, long id, CashRegisterUpdateRequest request) {
        d.terminalPayments().lockRegister(context, id);
        d.terminalPayments().assertNoPending(context, id);
        var existing = ownership.require(context, id);
        var retained = request.retainedCashAmount() == null ? existing.retainedCashAmount() : request.retainedCashAmount();
        var policyChanged = request.settlementRules() != null || (request.settlementCurrencyCode() != null
            && !request.settlementCurrencyCode().isBlank()) || retained.compareTo(existing.retainedCashAmount()) != 0;
        if (policyChanged && d.shifts().hasBlockingShiftForRegister(context, id)) throw PosApiException.conflict(
            "Cash register settlement settings cannot change while a shift is open. Close the shift first.");
        var warehouse = d.repository().findWarehouseForMutation(context, request.warehouseId())
            .orElseThrow(() -> new NoSuchElementException("Warehouse not found."));
        d.validator().requireWarehouseScope(warehouse);
        var effective = new CashRegisterUpdateRequest(request.warehouseId(), request.code(), request.name(), request.status(), request.active(),
            request.notes(), retained, request.settlementCurrencyCode(), request.settlementRules(), request.customFields(), request.metadata());
        var command = d.mapper().toUpdateCommand(context, effective, warehouse);
        d.validator().requireCodeAvailable(d.repository(), context, command.code(), id);
        if (!d.repository().update(context, id, command)) throw new NoSuchElementException("Cash register not found.");
        var saved = ownership.require(context, id);
        settlements.save(context, saved, request.settlementCurrencyCode(), request.settlementRules());
        return d.mapper().toResponse(saved, d.settlements().list(context, id));
    }
}
