package com.indice.erp.pos.shift;

import com.indice.erp.pos.PosContext;
import com.indice.erp.pos.PosSqlSupport;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.stereotype.Repository;

@Repository
public class ShiftRepository {

    private final JdbcTemplate jdbcTemplate;
    private final ShiftMapper mapper;

    public ShiftRepository(JdbcTemplate jdbcTemplate, ShiftMapper mapper) {
        this.jdbcTemplate = jdbcTemplate;
        this.mapper = mapper;
    }

    public List<ShiftRecord> findAll(PosContext context) {
        var params = scopedParams(context);
        return jdbcTemplate.query(baseSelect() + """
            WHERE shift.company_id = ? AND shift.deleted_at IS NULL
              AND """ + PosSqlSupport.scopePredicate("shift", context.scope()) + """
            ORDER BY shift.opened_at DESC, shift.id DESC
            """, mapper::mapRow, params.toArray());
    }

    public Optional<ShiftRecord> findById(PosContext context, long shiftId) {
        var params = scopedParams(context);
        params.add(1, shiftId);
        return jdbcTemplate.query(baseSelect() + """
            WHERE shift.company_id = ? AND shift.id = ? AND shift.deleted_at IS NULL
              AND """ + PosSqlSupport.scopePredicate("shift", context.scope()),
            mapper::mapRow, params.toArray()).stream().findFirst();
    }

    public Optional<ShiftRecord> findCurrentOpenByUser(PosContext context) {
        var params = scopedParams(context);
        params.add(1, context.userId());
        return jdbcTemplate.query(baseSelect() + """
            WHERE shift.company_id = ? AND shift.opened_by_user_id = ? AND shift.deleted_at IS NULL
              AND shift.status IN ('OPEN', 'CLOSING')
              AND """ + PosSqlSupport.scopePredicate("shift", context.scope()) + """
            ORDER BY shift.opened_at DESC LIMIT 1
            """, mapper::mapRow, params.toArray()).stream().findFirst();
    }

    public Optional<ShiftRecord> findOpenByUserAndRegister(PosContext context, long registerId) {
        var params = scopedParams(context);
        params.add(1, context.userId());
        params.add(2, registerId);
        return jdbcTemplate.query(baseSelect() + """
            WHERE shift.company_id = ? AND shift.opened_by_user_id = ? AND shift.cash_register_id = ?
              AND shift.deleted_at IS NULL AND shift.status = 'OPEN'
              AND """ + PosSqlSupport.scopePredicate("shift", context.scope()) + """
            ORDER BY shift.opened_at DESC LIMIT 1
            """, mapper::mapRow, params.toArray()).stream().findFirst();
    }

    public boolean hasBlockingShiftForRegister(PosContext context, long registerId) {
        var count = jdbcTemplate.queryForObject("""
            SELECT COUNT(*) FROM pos_shifts
            WHERE company_id = ? AND cash_register_id = ? AND deleted_at IS NULL
              AND status IN ('OPEN', 'CLOSING')
            """, Long.class, context.companyId(), registerId);
        return count != null && count > 0;
    }

    public boolean hasBlockingShiftForUser(PosContext context, long userId) {
        var count = jdbcTemplate.queryForObject("""
            SELECT COUNT(*) FROM pos_shifts
            WHERE company_id = ? AND opened_by_user_id = ? AND deleted_at IS NULL
              AND status IN ('OPEN', 'CLOSING')
            """, Long.class, context.companyId(), userId);
        return count != null && count > 0;
    }

    public ShiftRecord insertOpen(PosContext context, ShiftCommand command) {
        var keyHolder = new GeneratedKeyHolder();
        jdbcTemplate.update(connection -> {
            var statement = connection.prepareStatement("""
                INSERT INTO pos_shifts
                (company_id, unit_id, business_id, warehouse_id, cash_register_id, opened_by_user_id,
                 status, opening_amount, expected_cash_amount, currency_code, opening_note,
                 created_by_user_id, custom_fields_json, metadata_json)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, Statement.RETURN_GENERATED_KEYS);
            bindOpen(statement, context, command);
            return statement;
        }, keyHolder);
        return findById(context, keyHolder.getKey().longValue()).orElseThrow();
    }

    public boolean close(PosContext context, long shiftId, ShiftCommand command) {
        return jdbcTemplate.update("""
            UPDATE pos_shifts
            SET status = ?, closed_by_user_id = ?, counted_cash_amount = ?, over_short_amount = ?,
                closing_note = ?, closed_at = CURRENT_TIMESTAMP, updated_by_user_id = ?,
                version = version + 1
            WHERE company_id = ? AND id = ? AND deleted_at IS NULL AND status IN ('OPEN', 'CLOSING')
            """, command.status().name(), command.closedByUserId(), command.countedCashAmount(),
            command.overShortAmount(), command.closingNote(), command.updatedByUserId(),
            context.companyId(), shiftId) > 0;
    }

    public boolean closeWithSummary(PosContext context, long shiftId, java.math.BigDecimal expectedCash,
            java.math.BigDecimal countedCash, java.math.BigDecimal overShort, String note) {
        return jdbcTemplate.update("""
            UPDATE pos_shifts
            SET status = 'CLOSED', closed_by_user_id = ?, expected_cash_amount = ?,
                counted_cash_amount = ?, over_short_amount = ?, closing_note = ?,
                closed_at = CURRENT_TIMESTAMP, updated_by_user_id = ?, version = version + 1
            WHERE company_id = ? AND id = ? AND deleted_at IS NULL AND status IN ('OPEN', 'CLOSING')
            """, context.userId(), expectedCash, countedCash, overShort, note, context.userId(),
            context.companyId(), shiftId) > 0;
    }

    public boolean cancel(PosContext context, long shiftId, ShiftCommand command) {
        return jdbcTemplate.update("""
            UPDATE pos_shifts
            SET status = ?, closed_by_user_id = ?, closing_note = ?, closed_at = CURRENT_TIMESTAMP,
                updated_by_user_id = ?, version = version + 1
            WHERE company_id = ? AND id = ? AND deleted_at IS NULL AND status = 'OPEN'
            """, command.status().name(), command.closedByUserId(), command.closingNote(),
            command.updatedByUserId(), context.companyId(), shiftId) > 0;
    }

    public boolean increaseExpectedCash(PosContext context, long shiftId, java.math.BigDecimal cashAmount) {
        return adjustExpectedCash(context, shiftId, cashAmount);
    }

    public boolean adjustExpectedCash(PosContext context, long shiftId, java.math.BigDecimal delta) {
        return jdbcTemplate.update("""
            UPDATE pos_shifts
            SET expected_cash_amount = expected_cash_amount + ?, updated_by_user_id = ?, version = version + 1
            WHERE company_id = ? AND id = ? AND deleted_at IS NULL AND status = 'OPEN'
              AND expected_cash_amount + ? >= 0
            """, delta, context.userId(), context.companyId(), shiftId, delta) > 0;
    }

    private String baseSelect() {
        return """
            SELECT shift.*, register.name AS cash_register_name
            FROM pos_shifts shift
            JOIN pos_cash_registers register ON register.id = shift.cash_register_id
            """;
    }

    private ArrayList<Object> scopedParams(PosContext context) {
        var params = new ArrayList<Object>();
        params.add(context.companyId());
        PosSqlSupport.appendScopeParams(params, context.scope());
        return params;
    }

    private void bindOpen(java.sql.PreparedStatement statement, PosContext context, ShiftCommand command)
            throws java.sql.SQLException {
        var index = 1;
        statement.setLong(index++, context.companyId());
        statement.setObject(index++, command.unitId());
        statement.setObject(index++, command.businessId());
        statement.setLong(index++, command.warehouseId());
        statement.setLong(index++, command.cashRegisterId());
        statement.setLong(index++, command.openedByUserId());
        statement.setString(index++, command.status().name());
        statement.setBigDecimal(index++, command.openingAmount());
        statement.setBigDecimal(index++, command.expectedCashAmount());
        statement.setString(index++, command.currencyCode());
        statement.setString(index++, command.openingNote());
        statement.setLong(index++, command.createdByUserId());
        statement.setString(index++, command.customFieldsJson());
        statement.setString(index, command.metadataJson());
    }
}
