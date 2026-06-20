package com.indice.erp.pos.cashclosing;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.indice.erp.pos.PosApiException;
import com.indice.erp.pos.PosContext;
import com.indice.erp.pos.PosJsonSupport;
import com.indice.erp.pos.PosSqlSupport;
import com.indice.erp.pos.cashclosing.dto.CashClosingDetailResponse;
import com.indice.erp.pos.cashclosing.dto.CashClosingSummaryRow;
import com.indice.erp.pos.cashclosing.dto.PaymentMethodSummary;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class CashClosingHistoryRepository {

    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();
    private static final TypeReference<List<PaymentMethodSummary>> PAYMENT_SUMMARY_TYPE = new TypeReference<>() {
    };

    private final JdbcTemplate jdbcTemplate;

    public CashClosingHistoryRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public List<CashClosingSummaryRow> findAll(PosContext context, CashClosingQueryFilter filter) {
        var params = new ArrayList<Object>();
        var where = historyWhere(context, filter, params);
        params.add(filter.limit());
        params.add(filter.offset());
        return jdbcTemplate.query("""
            SELECT closing.id, closing.shift_id, closing.cash_register_id, closing.warehouse_id,
                   closing.opening_cash_amount, closing.cash_sales_amount, closing.expected_cash_amount,
                   closing.counted_cash_amount, closing.over_short_amount, closing.total_sales_amount,
                   closing.tickets_count, closing.closed_by_user_id, closing.closed_at
            FROM pos_cash_closings closing
            """ + where + """
            ORDER BY closing.closed_at DESC, closing.id DESC
            LIMIT ? OFFSET ?
            """, this::mapSummaryRow, params.toArray());
    }

    public Optional<CashClosingDetailResponse> findById(PosContext context, long closingId) {
        var params = new ArrayList<Object>();
        params.add(context.companyId());
        params.add(closingId);
        PosSqlSupport.appendScopeParams(params, context.scope());
        return jdbcTemplate.query("""
            SELECT closing.*, shift.status AS shift_status, shift.currency_code AS shift_currency_code,
                   shift.opened_by_user_id AS shift_opened_by_user_id, shift.opened_at AS shift_opened_at,
                   shift.closed_at AS shift_closed_at, register.code AS cash_register_code,
                   register.name AS cash_register_name
            FROM pos_cash_closings closing
            JOIN pos_shifts shift ON shift.id = closing.shift_id
            JOIN pos_cash_registers register ON register.id = closing.cash_register_id
            WHERE closing.company_id = ? AND closing.id = ? AND closing.deleted_at IS NULL
              AND """ + PosSqlSupport.scopePredicate("closing", context.scope()),
            this::mapDetail, params.toArray()).stream().findFirst();
    }

    private String historyWhere(PosContext context, CashClosingQueryFilter filter, List<Object> params) {
        var where = new StringBuilder("""
            WHERE closing.company_id = ? AND closing.deleted_at IS NULL
              AND """);
        params.add(context.companyId());
        where.append(PosSqlSupport.scopePredicate("closing", context.scope()));
        PosSqlSupport.appendScopeParams(params, context.scope());
        addDateFilter(where, params, "dateFrom", filter.dateFrom());
        addDateFilter(where, params, "dateTo", filter.dateTo());
        addLongFilter(where, params, "cash_register_id", filter.cashRegisterId());
        addLongFilter(where, params, "warehouse_id", filter.warehouseId());
        addLongFilter(where, params, "shift_id", filter.shiftId());
        addLongFilter(where, params, "closed_by_user_id", filter.userId());
        return where.toString();
    }

    private void addDateFilter(StringBuilder where, List<Object> params, String type, LocalDate value) {
        if (value == null) {
            return;
        }
        if ("dateFrom".equals(type)) {
            where.append("\n  AND closing.closed_at >= ?");
            params.add(Timestamp.valueOf(value.atStartOfDay()));
            return;
        }
        where.append("\n  AND closing.closed_at < ?");
        params.add(Timestamp.valueOf(value.plusDays(1).atStartOfDay()));
    }

    private void addLongFilter(StringBuilder where, List<Object> params, String column, Long value) {
        if (value == null) {
            return;
        }
        where.append("\n  AND closing.").append(column).append(" = ?");
        params.add(value);
    }

    private CashClosingSummaryRow mapSummaryRow(ResultSet rs, int rowNum) throws SQLException {
        return new CashClosingSummaryRow(
            rs.getLong("id"), rs.getLong("shift_id"), rs.getLong("cash_register_id"),
            rs.getLong("warehouse_id"), rs.getBigDecimal("opening_cash_amount"),
            rs.getBigDecimal("cash_sales_amount"), rs.getBigDecimal("expected_cash_amount"),
            rs.getBigDecimal("counted_cash_amount"), rs.getBigDecimal("over_short_amount"),
            rs.getBigDecimal("total_sales_amount"), rs.getInt("tickets_count"),
            rs.getLong("closed_by_user_id"), PosSqlSupport.instant(rs, "closed_at")
        );
    }

    private CashClosingDetailResponse mapDetail(ResultSet rs, int rowNum) throws SQLException {
        return new CashClosingDetailResponse(
            rs.getLong("id"), rs.getLong("company_id"), PosSqlSupport.nullableLong(rs, "unit_id"),
            PosSqlSupport.nullableLong(rs, "business_id"), rs.getLong("warehouse_id"),
            rs.getLong("cash_register_id"), rs.getLong("shift_id"), rs.getBigDecimal("opening_cash_amount"),
            rs.getBigDecimal("cash_sales_amount"), rs.getBigDecimal("cash_in_amount"),
            rs.getBigDecimal("cash_out_amount"), rs.getBigDecimal("safe_drop_amount"),
            rs.getBigDecimal("correction_amount"), rs.getBigDecimal("expected_cash_amount"),
            rs.getBigDecimal("counted_cash_amount"), rs.getBigDecimal("over_short_amount"),
            rs.getBigDecimal("total_sales_amount"), rs.getBigDecimal("total_refunds_amount"),
            rs.getInt("tickets_count"), paymentSummary(rs.getString("payments_summary_json")),
            rs.getString("notes"), rs.getLong("closed_by_user_id"), PosSqlSupport.instant(rs, "closed_at"),
            new CashClosingDetailResponse.ShiftBasicInfo(
                rs.getLong("shift_id"), rs.getString("shift_status"), rs.getString("shift_currency_code"),
                rs.getLong("shift_opened_by_user_id"), PosSqlSupport.instant(rs, "shift_opened_at"),
                PosSqlSupport.instant(rs, "shift_closed_at")
            ),
            new CashClosingDetailResponse.CashRegisterBasicInfo(
                rs.getLong("cash_register_id"), rs.getString("cash_register_code"),
                rs.getString("cash_register_name"), rs.getLong("warehouse_id")
            ),
            PosJsonSupport.toJsonNode(rs.getString("metadata_json"))
        );
    }

    private List<PaymentMethodSummary> paymentSummary(String json) {
        if (json == null || json.isBlank()) {
            return List.of();
        }
        try {
            return OBJECT_MAPPER.readValue(json, PAYMENT_SUMMARY_TYPE);
        } catch (Exception ex) {
            throw PosApiException.badRequest("Invalid POS closing payment summary.");
        }
    }
}
