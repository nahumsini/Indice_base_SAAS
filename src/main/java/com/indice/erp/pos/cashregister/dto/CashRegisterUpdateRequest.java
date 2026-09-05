package com.indice.erp.pos.cashregister.dto;

import com.fasterxml.jackson.databind.JsonNode;
import com.indice.erp.pos.status.CashRegisterStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.util.List;
import com.indice.erp.pos.settlement.SettlementRuleRequest;

public record CashRegisterUpdateRequest(
        @NotNull Long warehouseId,
        @NotBlank @Size(max = 64) String code,
        @NotBlank @Size(max = 160) String name,
        CashRegisterStatus status,
        Boolean active,
        String notes,
        BigDecimal retainedCashAmount,
        String settlementCurrencyCode,
        List<SettlementRuleRequest> settlementRules,
        JsonNode customFields,
        JsonNode metadata) {
}
