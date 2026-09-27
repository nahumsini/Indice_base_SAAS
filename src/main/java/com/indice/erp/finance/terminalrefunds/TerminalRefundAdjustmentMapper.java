package com.indice.erp.finance.terminalrefunds;

import com.indice.erp.pos.PosSqlSupport;
import java.sql.ResultSet;
import java.sql.SQLException;
import org.springframework.stereotype.Component;

@Component
public class TerminalRefundAdjustmentMapper {
    TerminalRefundAdjustment map(ResultSet rs, int row) throws SQLException {
        var intentId = PosSqlSupport.nullableLong(rs, "intent_id");
        if (intentId == null) intentId = PosSqlSupport.nullableLong(rs, "square_intent_id");
        return new TerminalRefundAdjustment(rs.getLong("id"), rs.getLong("company_id"),
            rs.getLong("reversal_id"), rs.getString("provider_code"), intentId,
            rs.getString("provider_payment_id"), rs.getString("provider_refund_id"),
            rs.getLong("pos_ticket_id"), rs.getString("ticket_number"),
            PosSqlSupport.nullableLong(rs, "pos_payment_id"), rs.getLong("shift_id"),
            rs.getLong("cash_closing_id"), PosSqlSupport.nullableLong(rs, "cash_closing_settlement_id"),
            rs.getString("settlement_state"), PosSqlSupport.nullableLong(rs, "payment_account_id"),
            rs.getString("payment_account_name"), PosSqlSupport.nullableLong(rs, "unit_id"),
            PosSqlSupport.nullableLong(rs, "business_id"), rs.getBigDecimal("amount"),
            rs.getString("currency_code"), rs.getString("state"), rs.getString("approval_reason"),
            rs.getString("posting_balance"), PosSqlSupport.nullableLong(rs, "treasury_movement_id"),
            rs.getString("failure_code"), rs.getString("failure_message"),
            PosSqlSupport.instant(rs, "created_at"), PosSqlSupport.instant(rs, "approved_at"),
            PosSqlSupport.instant(rs, "posted_at"), rs.getLong("version"));
    }
}
