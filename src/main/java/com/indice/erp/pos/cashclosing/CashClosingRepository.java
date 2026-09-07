package com.indice.erp.pos.cashclosing;

import com.indice.erp.pos.PosContext;
import com.indice.erp.pos.PosJsonSupport;
import com.indice.erp.pos.PosSqlSupport;
import com.indice.erp.pos.cashclosing.dto.PaymentMethodSummary;
import com.indice.erp.pos.cashmovement.CashMovementType;
import com.indice.erp.pos.shift.ShiftRecord;
import com.indice.erp.pos.status.PaymentMethod;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowCallbackHandler;
import org.springframework.stereotype.Repository;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import java.sql.Statement;

@Repository
public class CashClosingRepository {

    private final JdbcTemplate jdbcTemplate;

    public CashClosingRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public boolean existsClosing(PosContext context, long shiftId) {
        var count = jdbcTemplate.queryForObject("""
            SELECT COUNT(*)
            FROM pos_cash_closings
            WHERE company_id = ? AND shift_id = ? AND deleted_at IS NULL
            """, Long.class, context.companyId(), shiftId);
        return count != null && count > 0;
    }

    public CashClosingAmounts calculateAmounts(PosContext context, ShiftRecord shift) {
        var movementTotals = movementTotals(context, shift.id());
        return new CashClosingAmounts(
            zeroIfNull(shift.openingAmount()),
            cashSales(context, shift.id()),
            movementTotals.getOrDefault(CashMovementType.CASH_IN, BigDecimal.ZERO),
            movementTotals.getOrDefault(CashMovementType.CASH_OUT, BigDecimal.ZERO),
            movementTotals.getOrDefault(CashMovementType.SAFE_DROP, BigDecimal.ZERO),
            movementTotals.getOrDefault(CashMovementType.CORRECTION, BigDecimal.ZERO),
            totalSales(context, shift.id()),
            BigDecimal.ZERO,
            ticketsCount(context, shift.id()),
            paymentSummary(context, shift.id())
        );
    }

    public long insertClosing(PosContext context, ShiftRecord shift, CashClosingAmounts amounts,
            CashClosingCommand command) {
        var keyHolder = new GeneratedKeyHolder();
        jdbcTemplate.update(connection -> {
            var statement = connection.prepareStatement("""
                INSERT INTO pos_cash_closings
                (company_id, unit_id, business_id, warehouse_id, cash_register_id, shift_id,
                 opening_cash_amount, cash_sales_amount, cash_in_amount, cash_out_amount,
                 safe_drop_amount, correction_amount, expected_cash_amount, counted_cash_amount,
                 over_short_amount, total_sales_amount, total_refunds_amount, tickets_count,
                 payments_summary_json, notes, closed_by_user_id, metadata_json)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, Statement.RETURN_GENERATED_KEYS);
            var index = 1;
            statement.setLong(index++, context.companyId());
            statement.setObject(index++, shift.unitId());
            statement.setObject(index++, shift.businessId());
            statement.setLong(index++, shift.warehouseId());
            statement.setLong(index++, shift.cashRegisterId());
            statement.setLong(index++, shift.id());
            statement.setBigDecimal(index++, amounts.openingCashAmount());
            statement.setBigDecimal(index++, amounts.cashSalesAmount());
            statement.setBigDecimal(index++, amounts.cashInAmount());
            statement.setBigDecimal(index++, amounts.cashOutAmount());
            statement.setBigDecimal(index++, amounts.safeDropAmount());
            statement.setBigDecimal(index++, amounts.correctionAmount());
            statement.setBigDecimal(index++, amounts.expectedCashAmount());
            statement.setBigDecimal(index++, command.countedCashAmount());
            statement.setBigDecimal(index++, command.overShortAmount());
            statement.setBigDecimal(index++, amounts.totalSalesAmount());
            statement.setBigDecimal(index++, amounts.totalRefundsAmount());
            statement.setInt(index++, amounts.ticketsCount());
            statement.setString(index++, command.paymentsSummaryJson());
            statement.setString(index++, command.notes());
            statement.setLong(index++, context.userId());
            statement.setString(index, command.metadataJson());
            return statement;
        }, keyHolder);
        return keyHolder.getKey() == null ? 0L : keyHolder.getKey().longValue();
    }

    String paymentsSummaryJson(CashClosingAmounts amounts) {
        return PosJsonSupport.toJson(amounts.paymentsSummary());
    }

    private BigDecimal cashSales(PosContext context, long shiftId) {
        var params = ticketScopedParams(context, shiftId);
        return zeroIfNull(jdbcTemplate.queryForObject("""
            SELECT COALESCE(SUM(payment.amount), 0)
            FROM pos_payments payment
            JOIN pos_tickets ticket ON ticket.id = payment.ticket_id
            WHERE payment.company_id = ? AND payment.shift_id = ? AND payment.status = 'CAPTURED'
              AND payment.payment_method = 'CASH' AND ticket.status = 'COMPLETED'
              AND ticket.deleted_at IS NULL
              AND """ + PosSqlSupport.scopePredicate("ticket", context.scope()),
            BigDecimal.class, params.toArray()));
    }

    private BigDecimal totalSales(PosContext context, long shiftId) {
        var params = ticketScopedParams(context, shiftId);
        return zeroIfNull(jdbcTemplate.queryForObject("""
            SELECT COALESCE(SUM(ticket.total_amount), 0)
            FROM pos_tickets ticket
            WHERE ticket.company_id = ? AND ticket.shift_id = ? AND ticket.status = 'COMPLETED'
              AND ticket.deleted_at IS NULL
              AND """ + PosSqlSupport.scopePredicate("ticket", context.scope()),
            BigDecimal.class, params.toArray()));
    }

    private int ticketsCount(PosContext context, long shiftId) {
        var params = ticketScopedParams(context, shiftId);
        var count = jdbcTemplate.queryForObject("""
            SELECT COUNT(*)
            FROM pos_tickets ticket
            WHERE ticket.company_id = ? AND ticket.shift_id = ? AND ticket.status = 'COMPLETED'
              AND ticket.deleted_at IS NULL
              AND """ + PosSqlSupport.scopePredicate("ticket", context.scope()),
            Integer.class, params.toArray());
        return count == null ? 0 : count;
    }

    private List<PaymentMethodSummary> paymentSummary(PosContext context, long shiftId) {
        var params = ticketScopedParams(context, shiftId);
        return jdbcTemplate.query("""
            SELECT payment.payment_method, COALESCE(SUM(payment.amount), 0) AS amount, COUNT(*) AS count
            FROM pos_payments payment
            JOIN pos_tickets ticket ON ticket.id = payment.ticket_id
            WHERE payment.company_id = ? AND payment.shift_id = ? AND payment.status = 'CAPTURED'
              AND ticket.status = 'COMPLETED' AND ticket.deleted_at IS NULL
              AND """ + PosSqlSupport.scopePredicate("ticket", context.scope()) + """
            GROUP BY payment.payment_method
            ORDER BY payment.payment_method ASC
            """, (rs, rowNum) -> new PaymentMethodSummary(
                PaymentMethod.valueOf(rs.getString("payment_method")),
                zeroIfNull(rs.getBigDecimal("amount")),
                rs.getLong("count")
            ), params.toArray());
    }

    private Map<CashMovementType, BigDecimal> movementTotals(PosContext context, long shiftId) {
        var totals = new EnumMap<CashMovementType, BigDecimal>(CashMovementType.class);
        jdbcTemplate.query("""
            SELECT movement_type, COALESCE(SUM(amount), 0) AS amount
            FROM pos_cash_movements
            WHERE company_id = ? AND shift_id = ? AND deleted_at IS NULL
            GROUP BY movement_type
            """, (RowCallbackHandler) rs -> totals.put(CashMovementType.valueOf(rs.getString("movement_type")),
                zeroIfNull(rs.getBigDecimal("amount"))), context.companyId(), shiftId);
        return totals;
    }

    private ArrayList<Object> ticketScopedParams(PosContext context, long shiftId) {
        var params = new ArrayList<Object>();
        params.add(context.companyId());
        params.add(shiftId);
        PosSqlSupport.appendScopeParams(params, context.scope());
        return params;
    }

    private BigDecimal zeroIfNull(BigDecimal value) {
        return value == null ? BigDecimal.ZERO : value;
    }
}
