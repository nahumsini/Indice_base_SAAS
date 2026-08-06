package com.indice.erp.finance.expenses.attachments;

import com.indice.erp.finance.expenses.attachments.dto.ExpenseAttachmentResponse;

record ExpenseAttachmentRow(
        long id,
        String originalFilename,
        String mimeType,
        long sizeBytes,
        String objectKey,
        Long uploadedByUserId,
        String uploadedByName,
        java.math.BigDecimal paymentAmount,
        java.time.LocalDate paymentDate,
        Long paymentAccountId,
        String createdAt) {
    ExpenseAttachmentRow(long id, String originalFilename, String mimeType, long sizeBytes, String objectKey,
            Long uploadedByUserId, String uploadedByName, String createdAt) {
        this(id, originalFilename, mimeType, sizeBytes, objectKey, uploadedByUserId, uploadedByName,
                null, null, null, createdAt);
    }

    ExpenseAttachmentResponse toResponse(String downloadUrl) {
        return new ExpenseAttachmentResponse(
                id,
                originalFilename,
                mimeType,
                sizeBytes,
                objectKey,
                uploadedByUserId,
                uploadedByName,
                paymentAmount,
                paymentDate,
                paymentAccountId,
                downloadUrl,
                createdAt);
    }
}
