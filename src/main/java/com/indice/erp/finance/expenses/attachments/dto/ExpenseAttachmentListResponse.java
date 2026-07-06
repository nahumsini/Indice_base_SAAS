package com.indice.erp.finance.expenses.attachments.dto;

import java.util.List;

public record ExpenseAttachmentListResponse(
        List<ExpenseAttachmentResponse> items,
        int count) {
}
