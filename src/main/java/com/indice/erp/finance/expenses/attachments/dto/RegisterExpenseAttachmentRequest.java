package com.indice.erp.finance.expenses.attachments.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

public record RegisterExpenseAttachmentRequest(
        @NotBlank String objectKey,
        @NotBlank String originalFilename,
        @NotBlank String mimeType,
        @NotNull @Positive Long sizeBytes) {
}
