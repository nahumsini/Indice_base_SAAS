package com.indice.erp.pos.cashclosing;

import java.time.LocalDate;

public record CashClosingQueryFilter(
        LocalDate dateFrom,
        LocalDate dateTo,
        Long cashRegisterId,
        Long warehouseId,
        Long shiftId,
        Long userId,
        int limit,
        int offset) {

    static final int DEFAULT_LIMIT = 50;
    static final int MAX_LIMIT = 200;

    public CashClosingQueryFilter sanitized() {
        var nextLimit = limit <= 0 ? DEFAULT_LIMIT : Math.min(limit, MAX_LIMIT);
        var nextOffset = Math.max(offset, 0);
        return new CashClosingQueryFilter(
            dateFrom, dateTo, cashRegisterId, warehouseId, shiftId, userId, nextLimit, nextOffset
        );
    }
}
