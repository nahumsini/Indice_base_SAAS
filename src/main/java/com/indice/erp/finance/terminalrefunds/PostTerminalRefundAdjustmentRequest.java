package com.indice.erp.finance.terminalrefunds;

import jakarta.validation.constraints.PositiveOrZero;

public record PostTerminalRefundAdjustmentRequest(@PositiveOrZero long version) {
}
