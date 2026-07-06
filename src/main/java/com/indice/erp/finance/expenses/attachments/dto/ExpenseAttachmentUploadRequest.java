package com.indice.erp.finance.expenses.attachments.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

public record ExpenseAttachmentUploadRequest(
        @NotBlank String fileName,
        @NotBlank String contentType,
        @NotNull @Positive Long sizeBytes) {
}
