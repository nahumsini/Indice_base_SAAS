package com.indice.erp.pos.cashregister;

import com.indice.erp.pos.PosContext;
import com.indice.erp.pos.PosSqlSupport;
import com.indice.erp.pos.context.dto.WarehouseSummary;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.stereotype.Repository;

@Repository
public class CashRegisterRepository {

    private final JdbcTemplate jdbcTemplate;
    private final CashRegisterMapper mapper;

    public CashRegisterRepository(JdbcTemplate jdbcTemplate, CashRegisterMapper mapper) {
        this.jdbcTemplate = jdbcTemplate;
        this.mapper = mapper;
    }

    public List<CashRegisterRecord> findAll(PosContext context) {
        var params = scopedParams(context);
        return jdbcTemplate.query(baseSelect() + """
            WHERE register.company_id = ? AND register.deleted_at IS NULL
              AND """ + PosSqlSupport.scopePredicate("register", context.scope()) + """
            ORDER BY register.name ASC, register.id ASC
            """,
            mapper::mapRow, params.toArray());
    }

    public Optional<CashRegisterRecord> findById(PosContext context, long registerId) {
        var params = scopedParams(context);
        params.add(1, registerId);
        return jdbcTemplate.query(baseSelect() + """
            WHERE register.company_id = ? AND register.id = ? AND register.deleted_at IS NULL
              AND """ + PosSqlSupport.scopePredicate("register", context.scope()),
            mapper::mapRow, params.toArray()).stream().findFirst();
    }

    public Optional<WarehouseSummary> findWarehouse(PosContext context, long warehouseId) {
        var params = scopedParams(context);
        params.add(1, warehouseId);
        return jdbcTemplate.query(warehouseSelect() + """
            WHERE warehouse.company_id = ? AND warehouse.id = ? AND warehouse.deleted_at IS NULL
              AND """ + warehouseScopePredicate(context),
            this::mapWarehouse, params.toArray()).stream().findFirst();
    }

    public List<WarehouseSummary> listWarehouses(PosContext context) {
        var params = scopedParams(context);
        return jdbcTemplate.query(warehouseSelect() + """
            WHERE warehouse.company_id = ? AND warehouse.deleted_at IS NULL
              AND LOWER(COALESCE(warehouse.status, 'active')) = 'active'
              AND """ + warehouseScopePredicate(context) + """
            ORDER BY warehouse.name ASC, warehouse.id ASC
            """, this::mapWarehouse, params.toArray());
    }

    public CashRegisterRecord insert(PosContext context, CashRegisterCommand command) {
        var keyHolder = new GeneratedKeyHolder();
        jdbcTemplate.update(connection -> {
            var statement = connection.prepareStatement("""
                INSERT INTO pos_cash_registers
                (company_id, unit_id, business_id, warehouse_id, code, name, status, is_active, notes,
                 created_by_user_id, custom_fields_json, metadata_json)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, Statement.RETURN_GENERATED_KEYS);
            bindMutation(statement, context, command, true, null);
            return statement;
        }, keyHolder);
        return findById(context, keyHolder.getKey().longValue()).orElseThrow();
    }

    public boolean update(PosContext context, long registerId, CashRegisterCommand command) {
        return jdbcTemplate.update(connection -> {
            var statement = connection.prepareStatement("""
                UPDATE pos_cash_registers
                SET unit_id = ?, business_id = ?, warehouse_id = ?, code = ?, name = ?, status = ?,
                    is_active = ?, notes = ?, updated_by_user_id = ?, custom_fields_json = ?,
                    metadata_json = ?, version = version + 1
                WHERE company_id = ? AND id = ? AND deleted_at IS NULL
                """);
            bindMutation(statement, context, command, false, registerId);
            return statement;
        }) > 0;
    }

    public boolean existsByCode(PosContext context, String code, Long excludedId) {
        var params = new ArrayList<Object>(List.of(context.companyId(), code));
        var sql = "SELECT COUNT(*) FROM pos_cash_registers WHERE company_id = ? AND deleted_at IS NULL AND code = ?";
        if (excludedId != null) {
            sql += " AND id <> ?";
            params.add(excludedId);
        }
        var count = jdbcTemplate.queryForObject(sql, Long.class, params.toArray());
        return count != null && count > 0;
    }

    public boolean softDelete(PosContext context, long registerId) {
        return jdbcTemplate.update("""
            UPDATE pos_cash_registers
            SET deleted_at = CURRENT_TIMESTAMP, updated_by_user_id = ?, version = version + 1
            WHERE company_id = ? AND id = ? AND deleted_at IS NULL
            """, context.userId(), context.companyId(), registerId) > 0;
    }

    private String baseSelect() {
        return """
            SELECT register.*, warehouse.name AS warehouse_name
            FROM pos_cash_registers register
            JOIN sales_inventory_warehouses warehouse ON warehouse.id = register.warehouse_id
            """;
    }

    private ArrayList<Object> scopedParams(PosContext context) {
        var params = new ArrayList<Object>();
        params.add(context.companyId());
        PosSqlSupport.appendScopeParams(params, context.scope());
        return params;
    }

    private String warehouseScopePredicate(PosContext context) {
        var predicate = switch (context.scope().type()) {
            case CORPORATE_OFFICE -> "1 = 1";
            case UNIT_HEADQUARTERS -> "(CAST(warehouse.business_unit_id AS UNSIGNED) = ? OR CAST(warehouse.business_id AS UNSIGNED) IN "
                + "(SELECT id FROM businesses WHERE unit_id = ?))";
            case BUSINESS_OFFICE -> "CAST(warehouse.business_id AS UNSIGNED) = ?";
        };
        return " " + predicate + " ";
    }

    private WarehouseSummary mapWarehouse(java.sql.ResultSet rs, int rowNum) throws java.sql.SQLException {
        return new WarehouseSummary(
            rs.getLong("id"), rs.getString("warehouse_code"), rs.getString("name"),
            parseLong(rs.getString("business_unit_id")), rs.getString("business_unit_name"),
            parseLong(rs.getString("business_id")), rs.getString("business_name"), rs.getString("status")
        );
    }

    private Long parseLong(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        try {
            return Long.parseLong(value.trim());
        } catch (NumberFormatException ex) {
            return null;
        }
    }

    private String warehouseSelect() {
        return """
            SELECT id, warehouse_code, name, business_unit_id, business_unit_name, business_id, business_name, status
            FROM sales_inventory_warehouses warehouse
            """;
    }

    private void bindMutation(
            java.sql.PreparedStatement statement,
            PosContext context,
            CashRegisterCommand command,
            boolean insert,
            Long registerId) throws java.sql.SQLException {
        var index = 1;
        if (insert) {
            statement.setLong(index++, context.companyId());
        }
        statement.setObject(index++, command.unitId());
        statement.setObject(index++, command.businessId());
        statement.setLong(index++, command.warehouseId());
        statement.setString(index++, command.code());
        statement.setString(index++, command.name());
        statement.setString(index++, command.status().name());
        statement.setBoolean(index++, command.active());
        statement.setString(index++, command.notes());
        statement.setLong(index++, insert ? command.createdByUserId() : command.updatedByUserId());
        statement.setString(index++, command.customFieldsJson());
        statement.setString(index++, command.metadataJson());
        if (!insert) {
            statement.setLong(index++, context.companyId());
            statement.setLong(index, registerId);
        }
    }
}
