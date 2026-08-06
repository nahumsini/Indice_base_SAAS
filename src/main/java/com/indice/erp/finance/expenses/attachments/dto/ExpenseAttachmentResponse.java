package com.indice.erp.finance.expenses.attachments.dto;

public record ExpenseAttachmentResponse(
        Long id,
        String originalFilename,
        String mimeType,
        Long sizeBytes,
        String objectKey,
        Long uploadedByUserId,
        String uploadedByName,
        java.math.BigDecimal paymentAmount,
        java.time.LocalDate paymentDate,
        Long paymentAccountId,
        String downloadUrl,
        String createdAt) {
}
