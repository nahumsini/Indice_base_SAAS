package com.indice.erp.pos.checkout;

import com.indice.erp.pos.PosContext;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class InventoryDeductionRepository {

    private final JdbcTemplate jdbcTemplate;
    private final com.indice.erp.finance.shared.FinanceBusinessTimeZoneResolver timezones;

    public InventoryDeductionRepository(JdbcTemplate jdbcTemplate, com.indice.erp.finance.shared.FinanceBusinessTimeZoneResolver timezones) {
        this.jdbcTemplate = jdbcTemplate;
        this.timezones = timezones;
    }

    public java.util.Map<String, Object> costSnapshot(PosContext context, long warehouseId, long productId) {
        return jdbcTemplate.query("""
            SELECT product.currency, balance.unit_cost
            FROM sales_products product
            JOIN sales_inventory_balances balance
              ON balance.company_id = product.company_id AND balance.product_id = product.id
            WHERE product.company_id = ? AND product.id = ? AND product.deleted_at IS NULL
              AND balance.warehouse_id = ? AND balance.deleted_at IS NULL AND balance.uses_inventory = 1
            FOR UPDATE
            """, (rs, row) -> {
                var snapshot = new java.util.LinkedHashMap<String, Object>();
                snapshot.put("unitCost", rs.getBigDecimal("unit_cost"));
                snapshot.put("costCurrency", rs.getString("currency"));
                snapshot.put("costSource", "INVENTORY_BALANCE");
                return (java.util.Map<String, Object>) snapshot;
            }, context.companyId(), productId, warehouseId).stream().findFirst()
            .orElseThrow(() -> com.indice.erp.pos.PosApiException.badRequest("No inventory cost exists for this product and warehouse."));
    }

    public boolean deductAvailable(PosContext context, long warehouseId, long productId, java.math.BigDecimal quantity) {
        var updated = jdbcTemplate.update("""
            UPDATE sales_inventory_balances
            SET available_quantity = available_quantity - ?,
                last_movement_at = ?,
                updated_by_user_id = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE company_id = ?
              AND product_id = ?
              AND warehouse_id = ?
              AND deleted_at IS NULL
              AND uses_inventory = 1
              AND available_quantity >= ?
            """, quantity, java.time.LocalDate.now(timezones.resolve(context.companyId())), context.userId(), context.companyId(), productId, warehouseId, quantity);
        return updated > 0;
    }

    public boolean hasAvailable(PosContext context, long warehouseId, long productId, java.math.BigDecimal quantity) {
        var count = jdbcTemplate.queryForObject("""
            SELECT COUNT(*) FROM sales_inventory_balances
            WHERE company_id = ?
              AND product_id = ?
              AND warehouse_id = ?
              AND deleted_at IS NULL
              AND uses_inventory = 1
              AND available_quantity >= ?
            """, Long.class, context.companyId(), productId, warehouseId, quantity);
        return count != null && count > 0;
    }

    public String warehouseName(PosContext context, long warehouseId) {
        return jdbcTemplate.query("""
            SELECT name
            FROM sales_inventory_warehouses
            WHERE company_id = ? AND id = ? AND deleted_at IS NULL
            """, (rs, rowNum) -> rs.getString("name"), context.companyId(), warehouseId)
            .stream()
            .findFirst()
            .orElse("POS warehouse");
    }

    public void insertMovement(PosContext context, InventoryMovementCommand command) {
        jdbcTemplate.update("""
            INSERT INTO sales_inventory_movements
            (company_id, movement_number, group_id, product_id, product_name, product_sku, movement_type,
             quantity, from_warehouse_id, from_warehouse_name, business_unit_id, business_id, reason,
             reference, responsible_name, movement_date, status, metadata_json, created_by_user_id)
            VALUES (?, ?, ?, ?, ?, ?, 'POS_SALE_OUT', ?, ?, ?, ?, ?, ?, ?, ?, ?, 'posted', ?, ?)
            """,
            context.companyId(),
            command.movementNumber(),
            command.groupId(),
            command.productId(),
            command.productName(),
            command.productSku(),
            command.quantity(),
            command.fromWarehouseId(),
            command.fromWarehouseName(),
            command.unitId() == null ? null : String.valueOf(command.unitId()),
            command.businessId() == null ? null : String.valueOf(command.businessId()),
            "POS checkout inventory deduction",
            command.reference(),
            command.responsibleName(),
            java.time.LocalDate.now(timezones.resolve(context.companyId())),
            command.metadataJson(),
            context.userId());
    }
}
