package com.indice.erp.finance.pettycash;

public enum PettyCashStatementStatus {
    OPEN,
    CUT_PENDING,
    PARTIALLY_SETTLED,
    SETTLED,
    SHORTAGE,
    FORGIVEN_SHORTAGE,
    CHARGED_TO_EMPLOYEE,
    TRANSFERRED_TO_NEXT_CUT,
    CLOSED
}
