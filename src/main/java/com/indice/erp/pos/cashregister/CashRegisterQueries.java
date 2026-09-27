package com.indice.erp.pos.cashregister;

import com.indice.erp.pos.PosContext;
import com.indice.erp.pos.cashregister.dto.CashRegisterResponse;
import com.indice.erp.pos.status.CashRegisterStatus;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
class CashRegisterQueries {
    private final CashRegisterDependencies d;
    private final CashRegisterOwnership ownership;
    CashRegisterQueries(CashRegisterDependencies dependencies, CashRegisterOwnership ownership) {
        this.d = dependencies;
        this.ownership = ownership;
    }
    public Map<String, Object> list(PosContext context) {
        var items = d.repository().findAll(context).stream().map(row -> response(context, row)).toList();
        return Map.of("items", items, "count", items.size());
    }
    public CashRegisterResponse get(PosContext context, long id) {
        return response(context, ownership.require(context, id));
    }
    public List<CashRegisterResponse> active(PosContext context) {
        return d.repository().findAll(context).stream()
            .filter(row -> row.active() && row.status() == CashRegisterStatus.ACTIVE)
            .filter(row -> d.repository().findWarehouse(context, row.warehouseId()).filter(warehouse ->
                row.warehouseId().equals(warehouse.id()) && Objects.equals(row.unitId(), warehouse.unitId())
                    && Objects.equals(row.businessId(), warehouse.businessId())).isPresent())
            .map(row -> response(context, row)).toList();
    }
    CashRegisterResponse response(PosContext context, CashRegisterRecord row) {
        return d.mapper().toResponse(row, d.settlements().list(context, row.id()));
    }
}
