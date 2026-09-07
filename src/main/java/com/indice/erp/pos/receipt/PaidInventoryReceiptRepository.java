package com.indice.erp.pos.receipt;

import com.indice.erp.pos.PosApiException;
import com.indice.erp.pos.PosContext;
import java.math.BigDecimal;
import java.sql.Statement;
import java.util.List;
import java.util.Map;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.stereotype.Repository;

@Repository
public class PaidInventoryReceiptRepository {
    private final JdbcTemplate jdbc;
    private final com.indice.erp.finance.shared.FinanceBusinessTimeZoneResolver timezones;

    public PaidInventoryReceiptRepository(JdbcTemplate jdbc, com.indice.erp.finance.shared.FinanceBusinessTimeZoneResolver timezones) { this.jdbc = jdbc; this.timezones = timezones; }

    public List<ProductRow> products(PosContext context, long warehouseId, String query) {
        var normalizedQuery = query == null ? "" : query.trim().toLowerCase();
        var pattern = "%" + normalizedQuery + "%";
        return jdbc.query("""
            SELECT product.id, product.name, product.sku, product.category, product.currency,
                   COALESCE(NULLIF(JSON_UNQUOTE(JSON_EXTRACT(product.metadata_json, '$.packaging.baseUnit')), ''), 'Piece') inventory_unit,
                   COALESCE(balance.unit_cost, product.cost, 0) unit_cost
            FROM sales_products product
            LEFT JOIN sales_inventory_balances balance
              ON balance.company_id = product.company_id
             AND balance.product_id = product.id
             AND balance.warehouse_id = ?
             AND balance.deleted_at IS NULL
            WHERE product.company_id = ?
              AND product.deleted_at IS NULL
              AND product.inventory_ready = 1
              AND product.status = 'ACTIVE'
              AND (? = '' OR LOWER(product.name) LIKE ? OR LOWER(COALESCE(product.sku, '')) LIKE ?
                   OR LOWER(COALESCE(product.category, '')) LIKE ?)
            ORDER BY product.name, product.id
            LIMIT 80
            """, (rs, row) -> new ProductRow(rs.getLong("id"), rs.getString("name"), rs.getString("sku"),
                rs.getString("category"), rs.getString("currency"), rs.getString("inventory_unit"),
                rs.getBigDecimal("unit_cost")), warehouseId, context.companyId(), normalizedQuery,
                pattern, pattern, pattern);
    }

    public ProductRow requireProduct(PosContext context, long productId) {
        return jdbc.query("""
            SELECT id, name, sku, category, currency, cost,
                   COALESCE(NULLIF(JSON_UNQUOTE(JSON_EXTRACT(metadata_json, '$.packaging.baseUnit')), ''), 'Piece') inventory_unit
            FROM sales_products
            WHERE company_id = ? AND id = ? AND deleted_at IS NULL AND inventory_ready = 1 AND status = 'ACTIVE' FOR UPDATE
            """, (rs, row) -> new ProductRow(rs.getLong("id"), rs.getString("name"), rs.getString("sku"),
                rs.getString("category"), rs.getString("currency"), rs.getString("inventory_unit"),
                rs.getBigDecimal("cost")), context.companyId(), productId)
            .stream().findFirst().orElseThrow(() -> PosApiException.badRequest(
                "The selected product is not enabled for inventory in this company."));
    }

    public ProductRow createProduct(PosContext context, PaidInventoryReceiptDtos.ProductInput input, String currency) {
        if (input.salePrice() != null && input.salePrice().signum() < 0)
            throw PosApiException.badRequest("New product sale price cannot be negative.");
        var key = new GeneratedKeyHolder();
        jdbc.update(connection -> {
            var statement = connection.prepareStatement("""
                INSERT INTO sales_products
                  (company_id, product_code, sku, name, category, type, price, cost, currency,
                   tax_category, status, visibility, inventory_ready, pos_ready, reservable,
                   metadata_json, custom_fields_json, created_by_user_id, updated_by_user_id)
                VALUES (?, CONCAT('PRD-', UUID_SHORT()), ?, ?, ?, 'PRODUCT', ?, ?, ?, 'STANDARD_VAT',
                        'ACTIVE', 'POS_READY', 1, 1, 0,
                        JSON_OBJECT('packaging', JSON_OBJECT('baseUnit', ?, 'saleUnit', 'Unit', 'unitsPerSaleUnit', 1)),
                        JSON_OBJECT('stockPrepared', TRUE, 'warehousePrepared', TRUE), ?, ?)
                """, Statement.RETURN_GENERATED_KEYS);
            statement.setLong(1, context.companyId());
            statement.setString(2, text(input.sku(), 120));
            statement.setString(3, required(input.name(), "New product name is required.", 220));
            statement.setString(4, text(input.category(), 120) == null ? "Other" : text(input.category(), 120));
            statement.setBigDecimal(5, input.salePrice() == null ? BigDecimal.ZERO : input.salePrice());
            statement.setBigDecimal(6, BigDecimal.ZERO);
            statement.setString(7, currency);
            statement.setString(8, normalizeUnit(input.inventoryUnit()));
            statement.setLong(9, context.userId());
            statement.setLong(10, context.userId());
            return statement;
        }, key);
        return requireProduct(context, key.getKey().longValue());
    }

    public long insertReceipt(PosContext context, String idempotencyKey, String requestFingerprint, String number,
            Long unitId, Long businessId,
            long warehouseId, long registerId, long shiftId,
            long providerId, String providerName, String method, Long accountId,
            BigDecimal subtotal, BigDecimal tax, BigDecimal total, String currency,
            String reference, String metadataJson) {
        var key = new GeneratedKeyHolder();
        jdbc.update(connection -> {
            var statement = connection.prepareStatement("""
                INSERT INTO pos_inventory_receipts
                  (company_id, receipt_number, idempotency_key, request_fingerprint, unit_id, business_id,
                   warehouse_id, cash_register_id, shift_id, provider_id, counterparty_name, payment_method,
                   payment_account_id, subtotal_amount, tax_amount, total_amount, currency_code,
                   payment_reference, created_by_user_id, metadata_json)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, Statement.RETURN_GENERATED_KEYS);
            statement.setLong(1, context.companyId()); statement.setString(2, number);
            statement.setString(3, idempotencyKey); statement.setString(4, requestFingerprint);
            statement.setObject(5, unitId); statement.setObject(6, businessId);
            statement.setLong(7, warehouseId); statement.setLong(8, registerId); statement.setLong(9, shiftId);
            statement.setLong(10, providerId); statement.setString(11, providerName);
            statement.setString(12, method); statement.setObject(13, accountId);
            statement.setBigDecimal(14, subtotal); statement.setBigDecimal(15, tax); statement.setBigDecimal(16, total);
            statement.setString(17, currency); statement.setString(18, reference);
            statement.setLong(19, context.userId()); statement.setString(20, metadataJson);
            return statement;
        }, key);
        return key.getKey().longValue();
    }

    public long addItemAndInventory(PosContext context, long receiptId, String number, Long unitId, Long businessId,
            long warehouseId,
            String warehouseName, ProductRow product, BigDecimal quantity, BigDecimal enteredUnitCost,
            BigDecimal inventoryUnitCost, BigDecimal taxRate, boolean taxIncluded, String taxProfileId,
            String taxName, BigDecimal subtotal, BigDecimal tax, BigDecimal lineTotal) {
        var itemKey = new GeneratedKeyHolder();
        jdbc.update(connection -> {
            var statement = connection.prepareStatement("""
                INSERT INTO pos_inventory_receipt_items
                  (company_id, receipt_id, product_id, product_name_snapshot, product_sku_snapshot,
                   inventory_unit, quantity, entered_unit_cost, unit_cost, inventory_unit_cost, tax_rate,
                   tax_included, tax_profile_id, tax_name, subtotal_amount, tax_amount, line_total)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, Statement.RETURN_GENERATED_KEYS);
            statement.setLong(1, context.companyId()); statement.setLong(2, receiptId);
            statement.setLong(3, product.id()); statement.setString(4, product.name()); statement.setString(5, product.sku());
            statement.setString(6, product.inventoryUnit()); statement.setBigDecimal(7, quantity);
            statement.setBigDecimal(8, enteredUnitCost); statement.setBigDecimal(9, inventoryUnitCost);
            statement.setBigDecimal(10, inventoryUnitCost); statement.setBigDecimal(11, taxRate);
            statement.setBoolean(12, taxIncluded); statement.setString(13, taxProfileId);
            statement.setString(14, taxName); statement.setBigDecimal(15, subtotal);
            statement.setBigDecimal(16, tax); statement.setBigDecimal(17, lineTotal);
            return statement;
        }, itemKey);
        jdbc.update("""
            INSERT INTO sales_inventory_balances
              (company_id, balance_code, product_id, warehouse_id, warehouse_name, available_quantity,
               reserved_quantity, minimum_quantity, unit_cost, uses_inventory, business_unit_id, business_id,
               last_movement_at, created_by_user_id, updated_by_user_id)
            VALUES (?, CONCAT('BAL-', UUID_SHORT()), ?, ?, ?, ?, 0, 0, ?, 1, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
              unit_cost = ((available_quantity * unit_cost) + (VALUES(available_quantity) * VALUES(unit_cost))) /
                          NULLIF(available_quantity + VALUES(available_quantity), 0),
              available_quantity = available_quantity + VALUES(available_quantity), uses_inventory = 1,
              last_movement_at = VALUES(last_movement_at), updated_by_user_id = VALUES(updated_by_user_id), updated_at = CURRENT_TIMESTAMP
            """, context.companyId(), product.id(), warehouseId, warehouseName, quantity, inventoryUnitCost,
            unitId == null ? null : String.valueOf(unitId),
            businessId == null ? null : String.valueOf(businessId),
            java.time.LocalDate.now(timezones.resolve(context.companyId())), context.userId(), context.userId());
        var movementKey = new GeneratedKeyHolder();
        jdbc.update(connection -> {
            var statement = connection.prepareStatement("""
                INSERT INTO sales_inventory_movements
                  (company_id, movement_number, group_id, product_id, product_name, product_sku, movement_type,
                   quantity, unit_cost, to_warehouse_id, to_warehouse_name, business_unit_id, business_id,
                   reason, reference, responsible_name, movement_date, status, metadata_json, created_by_user_id)
                VALUES (?, CONCAT('POSR-', ?), ?, ?, ?, ?, 'POS_PAID_RECEIPT_IN', ?, ?, ?, ?, ?, ?,
                        'Paid merchandise receipt from POS', ?, ?, ?, 'posted',
                        JSON_OBJECT('source', 'POS_PAID_RECEIPT', 'receiptId', ?), ?)
                """, Statement.RETURN_GENERATED_KEYS);
            statement.setLong(1, context.companyId()); statement.setLong(2, itemKey.getKey().longValue());
            statement.setString(3, number); statement.setLong(4, product.id()); statement.setString(5, product.name());
            statement.setString(6, product.sku()); statement.setBigDecimal(7, quantity);
            statement.setBigDecimal(8, inventoryUnitCost);
            statement.setLong(9, warehouseId); statement.setString(10, warehouseName);
            statement.setObject(11, unitId == null ? null : String.valueOf(unitId));
            statement.setObject(12, businessId == null ? null : String.valueOf(businessId));
            statement.setString(13, number); statement.setString(14, context.userName());
            statement.setObject(15, java.time.LocalDate.now(timezones.resolve(context.companyId()))); statement.setLong(16, receiptId);
            statement.setLong(17, context.userId()); return statement;
        }, movementKey);
        jdbc.update("UPDATE pos_inventory_receipt_items SET inventory_movement_id = ? WHERE company_id = ? AND id = ?",
            movementKey.getKey().longValue(), context.companyId(), itemKey.getKey().longValue());
        return itemKey.getKey().longValue();
    }

    public ReceiptRow lockReceipt(PosContext context, long receiptId) {
        return jdbc.query("""
            SELECT receipt.*, warehouse.name warehouse_name
            FROM pos_inventory_receipts receipt JOIN sales_inventory_warehouses warehouse ON warehouse.id = receipt.warehouse_id
            WHERE receipt.company_id = ? AND receipt.id = ? FOR UPDATE
            """, (rs, row) -> new ReceiptRow(rs.getLong("id"), rs.getString("receipt_number"),
                rs.getLong("warehouse_id"), rs.getString("warehouse_name"), rs.getLong("cash_register_id"),
                rs.getLong("shift_id"), rs.getObject("provider_id", Long.class), rs.getString("counterparty_name"),
                rs.getString("payment_method"), rs.getObject("payment_account_id", Long.class),
                rs.getBigDecimal("subtotal_amount"), rs.getBigDecimal("tax_amount"), rs.getBigDecimal("total_amount"),
                rs.getString("currency_code"), rs.getString("payment_reference"), rs.getString("status"),
                rs.getString("reversal_reason"), rs.getString("request_fingerprint")), context.companyId(), receiptId).stream().findFirst()
            .orElseThrow(() -> PosApiException.notFound("Inventory receipt not found."));
    }

    public ReceiptRow findByIdempotencyKey(PosContext context, String idempotencyKey) {
        return receiptQuery("WHERE receipt.company_id = ? AND receipt.idempotency_key = ?", context.companyId(), idempotencyKey)
            .stream().findFirst().orElse(null);
    }

    public ReceiptRow requireReceipt(PosContext context, long receiptId) {
        return receiptQuery("WHERE receipt.company_id = ? AND receipt.id = ?", context.companyId(), receiptId)
            .stream().findFirst().orElseThrow(() -> PosApiException.notFound("Inventory receipt not found."));
    }

    public List<ReceiptRow> recentForShift(PosContext context, long shiftId) {
        return receiptQuery("WHERE receipt.company_id = ? AND receipt.shift_id = ? ORDER BY receipt.created_at DESC LIMIT 25",
            context.companyId(), shiftId);
    }

    private List<ReceiptRow> receiptQuery(String where, Object... args) {
        return jdbc.query("""
            SELECT receipt.*, warehouse.name warehouse_name
            FROM pos_inventory_receipts receipt JOIN sales_inventory_warehouses warehouse ON warehouse.id = receipt.warehouse_id
            """ + where, (rs, row) -> new ReceiptRow(rs.getLong("id"), rs.getString("receipt_number"),
                rs.getLong("warehouse_id"), rs.getString("warehouse_name"), rs.getLong("cash_register_id"),
                rs.getLong("shift_id"), rs.getObject("provider_id", Long.class), rs.getString("counterparty_name"),
                rs.getString("payment_method"), rs.getObject("payment_account_id", Long.class),
                rs.getBigDecimal("subtotal_amount"), rs.getBigDecimal("tax_amount"), rs.getBigDecimal("total_amount"),
                rs.getString("currency_code"), rs.getString("payment_reference"), rs.getString("status"),
                rs.getString("reversal_reason"), rs.getString("request_fingerprint")), args);
    }

    public long insertAttachment(PosContext context, long receiptId, String objectKey, String fileName,
            String contentType, long sizeBytes) {
        var key = new GeneratedKeyHolder();
        jdbc.update(connection -> {
            var statement = connection.prepareStatement("""
                INSERT INTO pos_inventory_receipt_attachments
                  (company_id, receipt_id, object_key, file_name, content_type, size_bytes, created_by_user_id)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """, Statement.RETURN_GENERATED_KEYS);
            statement.setLong(1, context.companyId()); statement.setLong(2, receiptId);
            statement.setString(3, objectKey); statement.setString(4, fileName); statement.setString(5, contentType);
            statement.setLong(6, sizeBytes); statement.setLong(7, context.userId());
            return statement;
        }, key);
        return key.getKey().longValue();
    }

    public List<ItemRow> items(PosContext context, long receiptId) {
        return jdbc.query("""
            SELECT id, product_id, product_name_snapshot, product_sku_snapshot, inventory_unit, quantity,
                   entered_unit_cost, inventory_unit_cost, tax_rate, tax_included, tax_profile_id, tax_name,
                   subtotal_amount, tax_amount, line_total
            FROM pos_inventory_receipt_items WHERE company_id = ? AND receipt_id = ? ORDER BY id
            """, (rs, row) -> new ItemRow(rs.getLong("id"), rs.getLong("product_id"), rs.getString("product_name_snapshot"),
                rs.getString("product_sku_snapshot"), rs.getString("inventory_unit"), rs.getBigDecimal("quantity"),
                rs.getBigDecimal("entered_unit_cost"), rs.getBigDecimal("inventory_unit_cost"),
                rs.getBigDecimal("tax_rate"), rs.getBoolean("tax_included"), rs.getString("tax_profile_id"),
                rs.getString("tax_name"), rs.getBigDecimal("subtotal_amount"), rs.getBigDecimal("tax_amount"),
                rs.getBigDecimal("line_total")), context.companyId(), receiptId);
    }

    public void reverseInventory(PosContext context, ReceiptRow receipt, ItemRow item, String reason) {
        var updated = jdbc.update("""
            UPDATE sales_inventory_balances
            SET unit_cost = CASE WHEN available_quantity = ? THEN 0
                  ELSE ((available_quantity * unit_cost) - (? * ?)) / (available_quantity - ?) END,
                available_quantity = available_quantity - ?, updated_by_user_id = ?, updated_at = CURRENT_TIMESTAMP
            WHERE company_id = ? AND product_id = ? AND warehouse_id = ? AND available_quantity >= ?
              AND available_quantity * unit_cost >= ? * ? AND deleted_at IS NULL
            """, item.quantity(), item.quantity(), item.inventoryUnitCost(), item.quantity(), item.quantity(), context.userId(),
            context.companyId(), item.productId(), receipt.warehouseId(), item.quantity(), item.quantity(), item.inventoryUnitCost());
        if (updated != 1) throw PosApiException.conflict("The receipt cannot be reversed because its inventory quantity or remaining cost no longer supports this return.");
        jdbc.update("""
            INSERT INTO sales_inventory_movements
              (company_id, movement_number, group_id, product_id, product_name, product_sku, movement_type,
               quantity, unit_cost, from_warehouse_id, from_warehouse_name, reason, reference, responsible_name,
               movement_date, status, metadata_json, created_by_user_id)
            VALUES (?, CONCAT('POSRR-', UUID_SHORT()), ?, ?, ?, ?, 'POS_PAID_RECEIPT_REVERSAL', ?, ?, ?, ?, ?, ?, ?,
                    ?, 'posted', JSON_OBJECT('source', 'POS_PAID_RECEIPT_REVERSAL', 'receiptId', ?), ?)
            """, context.companyId(), receipt.receiptNumber(), item.productId(), item.productName(), item.sku(), item.quantity(),
            item.inventoryUnitCost(), receipt.warehouseId(), receipt.warehouseName(), reason, receipt.receiptNumber(),
            context.userName(), java.time.LocalDate.now(timezones.resolve(context.companyId())), receipt.id(), context.userId());
    }

    public void markReversed(PosContext context, long receiptId, String reason) {
        jdbc.update("""
            UPDATE pos_inventory_receipts SET status = 'REVERSED', reversal_reason = ?, reversed_at = CURRENT_TIMESTAMP,
                reversed_by_user_id = ? WHERE company_id = ? AND id = ? AND status = 'POSTED'
            """, reason, context.userId(), context.companyId(), receiptId);
    }

    static String normalizeUnit(String value) {
        var unit = value == null ? "" : value.trim();
        if (!List.of("Piece", "Kilogram", "Gram", "Liter", "Meter").contains(unit))
            throw PosApiException.badRequest("Inventory unit must be Piece, Kilogram, Gram, Liter, or Meter.");
        return unit;
    }
    private static String required(String value, String message, int max) {
        var text = text(value, max); if (text == null) throw PosApiException.badRequest(message); return text;
    }
    private static String text(String value, int max) {
        var text = value == null ? null : value.trim(); return text == null || text.isBlank() ? null : text.substring(0, Math.min(max, text.length()));
    }

    public void linkPayout(PosContext context, long receiptId, Long cashMovementId, Long treasuryMovementId) {
        var updated = jdbc.update("""
            UPDATE pos_inventory_receipts
            SET cash_movement_id = ?, treasury_movement_id = ?
            WHERE company_id = ? AND id = ?
            """, cashMovementId, treasuryMovementId, context.companyId(), receiptId);
        if (updated != 1) throw PosApiException.conflict("Inventory receipt payout could not be linked.");
    }

    public record ProductRow(long id, String name, String sku, String category, String currency,
                             String inventoryUnit, BigDecimal unitCost) {}
    public record ItemRow(long id, long productId, String productName, String sku, String inventoryUnit,
                          BigDecimal quantity, BigDecimal enteredUnitCost, BigDecimal inventoryUnitCost,
                          BigDecimal taxRate, boolean taxIncluded, String taxProfileId, String taxName,
                          BigDecimal subtotalAmount, BigDecimal taxAmount, BigDecimal lineTotal) {}
    public record ReceiptRow(long id, String receiptNumber, long warehouseId, String warehouseName,
                             long cashRegisterId, long shiftId, Long providerId, String providerName,
                             String paymentMethod, Long paymentAccountId, BigDecimal subtotalAmount,
                             BigDecimal taxAmount, BigDecimal totalAmount, String currencyCode,
                             String paymentReference, String status, String reversalReason,
                             String requestFingerprint) {}
}
