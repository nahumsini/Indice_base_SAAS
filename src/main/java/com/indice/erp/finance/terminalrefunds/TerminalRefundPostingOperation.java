package com.indice.erp.finance.terminalrefunds;

import com.indice.erp.finance.shared.FinanceContext;

interface TerminalRefundPostingOperation {
    TerminalRefundAdjustment post(FinanceContext context, long id, long version);
}
