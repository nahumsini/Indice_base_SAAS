package com.indice.erp.finance.pettycash.dto;

public record PettyCashSettlementLineMutationResponse(
    PettyCashFundResponse fund,
    PettyCashStatementResponse statement,
    PettyCashSettlementLineResponse settlementLine
) {
}
