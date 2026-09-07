package com.indice.erp.pos.settlement;

import jakarta.validation.constraints.NotBlank;

public record SettlementRuleRequest(
    @NotBlank String paymentMethod,
    Long destinationPaymentAccountId,
    String settlementTiming,
    Boolean enabled
) {
}
