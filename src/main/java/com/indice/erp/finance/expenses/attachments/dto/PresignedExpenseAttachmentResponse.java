package com.indice.erp.finance.expenses.attachments.dto;

import java.time.Instant;
import java.util.Map;

public record PresignedExpenseAttachmentResponse(
        String objectKey,
        String uploadUrl,
        Instant expiresAt,
        Map<String, String> uploadHeaders) {
}
