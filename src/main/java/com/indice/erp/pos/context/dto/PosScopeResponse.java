package com.indice.erp.pos.context.dto;

import com.indice.erp.pos.PosScope;

public record PosScopeResponse(
        PosScope.Type type,
        Long unitId,
        Long businessId) {
}
