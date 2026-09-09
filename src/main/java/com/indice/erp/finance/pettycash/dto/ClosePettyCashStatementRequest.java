package com.indice.erp.finance.pettycash.dto;

import com.indice.erp.finance.pettycash.PettyCashStatementCloseAction;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.LocalDate;

public record ClosePettyCashStatementRequest(
    @NotNull PettyCashStatementCloseAction action,
    @DecimalMin("0.00") BigDecimal shortageAmount,
    LocalDate closeDate,
    @Size(max = 180) String reference,
    BigDecimal expectedClosingBalance
) {
    public ClosePettyCashStatementRequest(PettyCashStatementCloseAction action, BigDecimal shortageAmount,
            LocalDate closeDate, String reference) {
        this(action, shortageAmount, closeDate, reference, null);
    }
}
