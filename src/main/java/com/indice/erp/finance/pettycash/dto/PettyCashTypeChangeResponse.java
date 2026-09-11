package com.indice.erp.finance.pettycash.dto;

import com.indice.erp.finance.pettycash.PettyCashFundType;
import java.time.Instant;
import java.time.LocalDate;

public record PettyCashTypeChangeResponse(Long id, PettyCashFundType previousType, PettyCashFundType nextType,
    LocalDate effectiveDate, String reason, String status, Long createdByUserId, Instant createdAt, Instant appliedAt,
    Long cancelledByUserId, Instant cancelledAt) {}
