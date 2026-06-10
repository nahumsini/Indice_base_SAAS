package com.indice.erp.finance.shared;

public record FinanceContext(
    Long userId,
    Long companyId,
    String userName,
    String role,
    boolean moduleAccess,
    FinanceScope scope
) {
}
