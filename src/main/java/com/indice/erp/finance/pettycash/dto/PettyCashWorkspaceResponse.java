package com.indice.erp.finance.pettycash.dto;

import java.util.List;

public record PettyCashWorkspaceResponse(
    List<PettyCashFundResponse> funds,
    List<PettyCashStatementResponse> statements,
    List<PettyCashMovementResponse> movements,
    List<PettyCashSettlementLineResponse> settlementLines,
    int count
) {
}
