package com.indice.erp.finance.paymentaccounts;

import java.math.BigDecimal;

record PaymentAccountCommand(
    Long unitId,
    Long businessId,
    String name,
    PaymentAccountType type,
    String currencyCode,
    BigDecimal openingBalance,
    BigDecimal currentBalance,
    PaymentAccountStatus status,
    String description,
    Long createdByUserId,
    Long updatedByUserId,
    String customFieldsJson,
    String metadataJson
) {
}
