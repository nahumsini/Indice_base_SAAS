package com.indice.erp.finance.paymentaccounts;

import java.math.BigDecimal;
import java.time.Instant;

record PaymentAccountRecord(
    Long id,
    Long companyId,
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
    Instant createdAt,
    Instant updatedAt,
    Instant deletedAt,
    Long version,
    String customFieldsJson,
    String metadataJson
) {
}
