package com.indice.erp.pos.cashclosing;

import com.indice.erp.pos.PosContext;
import com.indice.erp.pos.cashmovement.CashMovementType;
import java.math.BigDecimal;
import java.util.EnumMap;
import java.util.Map;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowCallbackHandler;

class ClosingMovementTotals {
    private final JdbcTemplate jdbc;
    ClosingMovementTotals(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }
    Map<CashMovementType, BigDecimal> find(PosContext context, long shiftId) {
        var totals = new EnumMap<CashMovementType, BigDecimal>(CashMovementType.class);
        jdbc.query("""
            SELECT movement_type, COALESCE(SUM(amount), 0) amount FROM pos_cash_movements
            WHERE company_id = ? AND shift_id = ? AND deleted_at IS NULL GROUP BY movement_type
            """, (RowCallbackHandler) rs -> totals.put(CashMovementType.valueOf(rs.getString("movement_type")),
                rs.getBigDecimal("amount")), context.companyId(), shiftId);
        return totals;
    }
}
