package com.indice.erp.finance.expenses.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import java.math.BigDecimal;
import java.time.LocalDate;

public record UpdateExpenseStatusRequest(
    @NotBlank String status,
    @DecimalMin("0.00") BigDecimal paidAmount,
    LocalDate paymentDate
) {
}
