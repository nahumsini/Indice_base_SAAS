package com.indice.erp.pos.cashclosing;

import com.indice.erp.pos.PosContext;
import com.indice.erp.pos.shift.ShiftRecord;
import java.sql.Statement;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;

class ClosingRecordInsert {
    private final JdbcTemplate jdbc;
    ClosingRecordInsert(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }
    long insert(PosContext context, ShiftRecord shift, CashClosingAmounts amounts, CashClosingCommand command) {
        var key = new GeneratedKeyHolder();
        var values = new Object[]{context.companyId(), shift.unitId(), shift.businessId(), shift.warehouseId(),
            shift.cashRegisterId(), shift.id(), amounts.openingCashAmount(), amounts.cashSalesAmount(), amounts.cashInAmount(),
            amounts.cashOutAmount(), amounts.safeDropAmount(), amounts.correctionAmount(), amounts.expectedCashAmount(),
            command.countedCashAmount(), command.overShortAmount(), amounts.totalSalesAmount(), amounts.totalRefundsAmount(),
            amounts.ticketsCount(), command.paymentsSummaryJson(), command.notes(), context.userId(), command.metadataJson()};
        jdbc.update(connection -> {
            var statement = connection.prepareStatement("""
                INSERT INTO pos_cash_closings
                (company_id, unit_id, business_id, warehouse_id, cash_register_id, shift_id, opening_cash_amount,
                 cash_sales_amount, cash_in_amount, cash_out_amount, safe_drop_amount, correction_amount,
                 expected_cash_amount, counted_cash_amount, over_short_amount, total_sales_amount, total_refunds_amount,
                 tickets_count, payments_summary_json, notes, closed_by_user_id, metadata_json)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, Statement.RETURN_GENERATED_KEYS);
            for (var i = 0; i < values.length; i++) statement.setObject(i + 1, values[i]);
            return statement;
        }, key);
        return key.getKey() == null ? 0L : key.getKey().longValue();
    }
}
