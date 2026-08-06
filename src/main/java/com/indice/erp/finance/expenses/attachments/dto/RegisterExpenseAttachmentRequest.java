package com.indice.erp.finance.expenses.attachments.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.DecimalMin;
import java.math.BigDecimal;
import java.time.LocalDate;

public record RegisterExpenseAttachmentRequest(
        @NotBlank String objectKey,
        @NotBlank String originalFilename,
        @NotBlank String mimeType,
        @NotNull @Positive Long sizeBytes,
        @DecimalMin("0.01") BigDecimal paymentAmount,
        LocalDate paymentDate,
        @Positive Long paymentAccountId) {

    public RegisterExpenseAttachmentRequest(String objectKey, String originalFilename, String mimeType, Long sizeBytes) {
        this(objectKey, originalFilename, mimeType, sizeBytes, null, null, null);
    }
}
