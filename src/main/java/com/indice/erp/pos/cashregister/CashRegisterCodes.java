package com.indice.erp.pos.cashregister;

import com.indice.erp.pos.PosContext;
import com.indice.erp.pos.context.dto.WarehouseSummary;
import java.util.Locale;
import java.util.Map;
import java.util.NoSuchElementException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
class CashRegisterCodes {
    private final CashRegisterDependencies d;
    CashRegisterCodes(CashRegisterDependencies dependencies) {
        this.d = dependencies;
    }
    @Transactional(readOnly = true)
    public Map<String, Object> next(PosContext context, long warehouseId) {
        var warehouse = d.repository().findWarehouse(context, warehouseId).orElseThrow(() -> new NoSuchElementException("Warehouse not found."));
        d.validator().requireWarehouseScope(warehouse);
        return Map.of("code", available(context, warehouse));
    }
    String available(PosContext context, WarehouseSummary warehouse) {
        var base = ((warehouse.warehouseCode() == null || warehouse.warehouseCode().isBlank()) ? warehouse.name() : warehouse.warehouseCode())
            .replaceAll("[^A-Za-z0-9]", "").toUpperCase(Locale.ROOT);
        if (base.isBlank()) base = "POS";
        base = base.substring(0, Math.min(base.length(), 48));
        var sequence = 1;
        var code = base + "-" + String.format("%02d", sequence);
        while (d.repository().existsByCode(context, code, null)) {
            sequence++;
            code = base + "-" + String.format("%02d", sequence);
        }
        return code;
    }
}
