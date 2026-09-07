package com.indice.erp.finance.treasury;

import java.math.BigDecimal;

public record TreasuryMovementResult(
    long movementId,
    long paymentAccountId,
    BigDecimal availableBalance,
    BigDecimal pendingBalance,
    boolean alreadyApplied
) {
}
