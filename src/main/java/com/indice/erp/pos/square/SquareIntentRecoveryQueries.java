package com.indice.erp.pos.square;

import com.indice.erp.pos.PosContext;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
class SquareIntentRecoveryQueries {
    private final JdbcTemplate jdbc;
    private final SquarePaymentIntentMapper mapper;
    SquareIntentRecoveryQueries(JdbcTemplate jdbc, SquarePaymentIntentMapper mapper) {
        this.jdbc = jdbc;
        this.mapper = mapper;
    }
    List<SquareRecords.PaymentIntent> list(PosContext context, Long register, Long shift, int limit) {
        var params = new ArrayList<Object>();
        params.add(context.companyId());
        var sql = new StringBuilder("SELECT * FROM pos_square_terminal_payment_intents WHERE company_id = ? "
            + "AND status IN ('WAITING', 'APPROVED', 'UNCERTAIN', 'PARTIALLY_REFUNDED') AND pos_ticket_id IS NULL");
        if (register != null) {
            sql.append(" AND cash_register_id = ?");
            params.add(register);
        }
        if (shift != null) {
            sql.append(" AND shift_id = ?");
            params.add(shift);
        }
        sql.append(" ORDER BY updated_at DESC, id DESC LIMIT ?");
        params.add(Math.max(1, Math.min(limit, 100)));
        return jdbc.query(sql.toString(), mapper::map, params.toArray());
    }
    List<SquareRecords.PaymentIntent> batch(Instant before, int limit) {
        return jdbc.query("""
            SELECT * FROM pos_square_terminal_payment_intents
            WHERE status IN ('WAITING', 'APPROVED', 'UNCERTAIN', 'PARTIALLY_REFUNDED') AND pos_ticket_id IS NULL
              AND (expires_at IS NULL OR expires_at <= ? OR updated_at <= ?)
            ORDER BY updated_at ASC, id ASC LIMIT ?
            """, mapper::map, Timestamp.from(before), Timestamp.from(before), Math.max(1, Math.min(limit, 100)));
    }
}
