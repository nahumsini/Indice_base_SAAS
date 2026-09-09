package com.indice.erp.finance.pettycash.dto;

public record PettyCashStatementCloseResponse(
    PettyCashFundResponse fund,
    PettyCashStatementResponse statement,
    PettyCashStatementResponse nextStatement,
    java.util.List<PettyCashStatementResponse> updatedStatements
) {
}
