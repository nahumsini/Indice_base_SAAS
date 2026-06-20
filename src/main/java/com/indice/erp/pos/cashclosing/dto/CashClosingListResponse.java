package com.indice.erp.pos.cashclosing.dto;

import java.util.List;

public record CashClosingListResponse(
        List<CashClosingSummaryRow> items,
        int count,
        int limit,
        int offset) {
}
