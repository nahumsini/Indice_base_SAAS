package com.indice.erp.finance.terminalrefunds;

final class TerminalRefundAdjustmentSql {
    private TerminalRefundAdjustmentSql() {}
    static final String SELECT = """
        SELECT adjustment.*,ticket.ticket_number,account.name payment_account_name,
          settlement.status settlement_state
        FROM pos_terminal_refund_adjustments adjustment
        JOIN pos_tickets ticket ON ticket.company_id=adjustment.company_id
          AND ticket.id=adjustment.pos_ticket_id AND ticket.deleted_at IS NULL
        LEFT JOIN finance_payment_accounts account ON account.company_id=adjustment.company_id
          AND account.id=adjustment.payment_account_id
        LEFT JOIN pos_cash_closing_settlements settlement ON settlement.company_id=adjustment.company_id
          AND settlement.id=adjustment.cash_closing_settlement_id
        """;
}
