package com.indice.erp.finance.terminalrefunds;

import java.util.List;

public record TerminalRefundAdjustmentPageResponse(
        List<TerminalRefundAdjustmentResponse> items, Long nextCursor, long totalCount) {
}
