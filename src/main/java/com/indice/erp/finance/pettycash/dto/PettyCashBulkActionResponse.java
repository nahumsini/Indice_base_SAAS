package com.indice.erp.finance.pettycash.dto;

import java.util.List;

public record PettyCashBulkActionResponse(PettyCashFundResponse fund, PettyCashStatementResponse statement,
    List<PettyCashSettlementLineResponse> settlementLines, List<PettyCashStatementResponse> updatedStatements) {}
