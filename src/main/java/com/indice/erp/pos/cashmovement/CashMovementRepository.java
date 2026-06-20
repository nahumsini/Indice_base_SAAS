package com.indice.erp.pos.cashmovement;

import com.indice.erp.pos.PosContext;
import com.indice.erp.pos.PosSqlSupport;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.List;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.stereotype.Repository;

@Repository
public class CashMovementRepository {

    private final JdbcTemplate jdbcTemplate;
    private final CashMovementMapper mapper;

    public CashMovementRepository(JdbcTemplate jdbcTemplate, CashMovementMapper mapper) {
        this.jdbcTemplate = jdbcTemplate;
        this.mapper = mapper;
    }

    public List<CashMovementRecord> findByShift(PosContext context, long shiftId) {
        var params = scopedParams(context);
        params.add(1, shiftId);
        return jdbcTemplate.query("""
            SELECT movement.*
            FROM pos_cash_movements movement
            WHERE movement.company_id = ? AND movement.shift_id = ? AND movement.deleted_at IS NULL
              AND """ + PosSqlSupport.scopePredicate("movement", context.scope()) + """
            ORDER BY movement.created_at DESC, movement.id DESC
            """, mapper::mapRow, params.toArray());
    }

    public CashMovementRecord insert(PosContext context, CashMovementCommand command) {
        var keyHolder = new GeneratedKeyHolder();
        jdbcTemplate.update(connection -> {
            var statement = connection.prepareStatement("""
                INSERT INTO pos_cash_movements
                (company_id, unit_id, business_id, warehouse_id, cash_register_id, shift_id, movement_type,
                 amount, currency_code, reason, reference, created_by_user_id, metadata_json)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, Statement.RETURN_GENERATED_KEYS);
            statement.setLong(1, context.companyId());
            statement.setObject(2, command.unitId());
            statement.setObject(3, command.businessId());
            statement.setLong(4, command.warehouseId());
            statement.setLong(5, command.cashRegisterId());
            statement.setLong(6, command.shiftId());
            statement.setString(7, command.movementType().name());
            statement.setBigDecimal(8, command.amount());
            statement.setString(9, command.currencyCode());
            statement.setString(10, command.reason());
            statement.setString(11, command.reference());
            statement.setLong(12, command.createdByUserId());
            statement.setString(13, command.metadataJson());
            return statement;
        }, keyHolder);
        return findById(context, keyHolder.getKey().longValue());
    }

    private CashMovementRecord findById(PosContext context, long movementId) {
        var params = scopedParams(context);
        params.add(1, movementId);
        return jdbcTemplate.query("""
            SELECT movement.*
            FROM pos_cash_movements movement
            WHERE movement.company_id = ? AND movement.id = ? AND movement.deleted_at IS NULL
              AND """ + PosSqlSupport.scopePredicate("movement", context.scope()),
            mapper::mapRow, params.toArray()).stream().findFirst().orElseThrow();
    }

    private ArrayList<Object> scopedParams(PosContext context) {
        var params = new ArrayList<Object>();
        params.add(context.companyId());
        PosSqlSupport.appendScopeParams(params, context.scope());
        return params;
    }
}
