package com.indice.erp.finance.terminalrefunds;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

public record ResolveTerminalRefundAdjustmentRequest(
        @NotBlank @Size(min = 8, max = 500) String reason,
        @PositiveOrZero long version) {
}
