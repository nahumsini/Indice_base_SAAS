package com.indice.erp.finance.pettycash.dto;

public record PettyCashMovementMutationResponse(
    PettyCashFundResponse fund,
    PettyCashStatementResponse statement,
    PettyCashMovementResponse movement
) {
}
