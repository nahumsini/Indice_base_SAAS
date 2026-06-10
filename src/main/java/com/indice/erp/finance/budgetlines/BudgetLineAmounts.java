package com.indice.erp.finance.budgetlines;

import com.indice.erp.finance.status.BudgetHealthStatus;
import java.math.BigDecimal;

final class BudgetLineAmounts {

    private static final BigDecimal WARNING_THRESHOLD = new BigDecimal("0.20");

    private BudgetLineAmounts() {
    }

    static BigDecimal availableAmount(
            BigDecimal plannedAmount,
            BigDecimal committedAmount,
            BigDecimal actualExpenseAmount,
            BigDecimal pettyCashIssuedAmount,
            BigDecimal pettyCashSettledAmount) {
        return value(plannedAmount)
            .subtract(value(committedAmount))
            .subtract(value(actualExpenseAmount))
            .subtract(value(pettyCashIssuedAmount).subtract(value(pettyCashSettledAmount)));
    }

    static BudgetHealthStatus healthStatus(BigDecimal plannedAmount, BigDecimal availableAmount) {
        if (value(availableAmount).signum() < 0) {
            return BudgetHealthStatus.EXCEEDED;
        }
        var warningFloor = value(plannedAmount).multiply(WARNING_THRESHOLD);
        if (value(availableAmount).compareTo(warningFloor) > 0) {
            return BudgetHealthStatus.ON_TRACK;
        }
        return BudgetHealthStatus.WARNING;
    }

    static BigDecimal zero() {
        return BigDecimal.ZERO;
    }

    private static BigDecimal value(BigDecimal amount) {
        return amount == null ? BigDecimal.ZERO : amount;
    }
}
