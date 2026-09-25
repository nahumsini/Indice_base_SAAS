package com.indice.erp.finance.terminalrefunds;

import com.indice.erp.finance.FinanceApiException;

final class TerminalRefundPostingFailure extends RuntimeException {
    private final FinanceApiException cause;
    TerminalRefundPostingFailure(FinanceApiException cause) {
        super(cause);
        this.cause = cause;
    }
    FinanceApiException cause() { return cause; }
}
