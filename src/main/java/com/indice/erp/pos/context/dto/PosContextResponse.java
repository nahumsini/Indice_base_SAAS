package com.indice.erp.pos.context.dto;

import com.indice.erp.pos.cashregister.dto.CashRegisterResponse;
import com.indice.erp.pos.shift.dto.ShiftResponse;
import java.util.List;

public record PosContextResponse(
        List<WarehouseSummary> warehouses,
        List<CashRegisterResponse> cashRegisters,
        ShiftResponse currentOpenShift,
        PosScopeResponse scope,
        boolean canManageCashRegisters) {
}
