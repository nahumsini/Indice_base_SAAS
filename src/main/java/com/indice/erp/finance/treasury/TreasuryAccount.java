package com.indice.erp.finance.treasury;

import java.math.BigDecimal;

public record TreasuryAccount(
    long id,
    long companyId,
    Long unitId,
    Long businessId,
    String name,
    String type,
    String currencyCode,
    BigDecimal availableBalance,
    BigDecimal pendingBalance,
    String status,
    String systemKey,
    boolean systemManaged
) {
    public BigDecimal totalBalance() {
        return availableBalance.add(pendingBalance);
    }
}
