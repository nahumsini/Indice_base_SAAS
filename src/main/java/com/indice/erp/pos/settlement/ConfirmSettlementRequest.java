package com.indice.erp.pos.settlement;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;

public record ConfirmSettlementRequest(
    @NotNull @DecimalMin("0.0") BigDecimal receivedAmount,
    @Size(max = 500) String note
) {
}
