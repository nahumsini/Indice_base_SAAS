package com.indice.erp.finance.treasury;

import java.math.BigDecimal;
import java.time.Instant;

public record TreasuryMovementCommand(
    long companyId,
    long paymentAccountId,
    Long unitId,
    Long businessId,
    String currencyCode,
    String sourceModule,
    String sourceType,
    String sourceId,
    String eventKey,
    BigDecimal availableDelta,
    BigDecimal pendingDelta,
    String description,
    Instant occurredAt,
    Long actorUserId,
    Long reversalOfMovementId,
    String metadataJson
) {
}
