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
        String createdAt) {
    ExpenseAttachmentResponse toResponse(String downloadUrl) {
        return new ExpenseAttachmentResponse(
                id,
                originalFilename,
                mimeType,
                sizeBytes,
                objectKey,
                uploadedByUserId,
                uploadedByName,
                downloadUrl,
                createdAt);
    }
}
