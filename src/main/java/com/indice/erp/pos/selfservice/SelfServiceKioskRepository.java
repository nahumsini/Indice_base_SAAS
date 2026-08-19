package com.indice.erp.pos.selfservice;

import com.indice.erp.pos.PosContext;
import com.indice.erp.pos.PosSqlSupport;
import com.indice.erp.pos.cashregister.CashRegisterRecord;
import com.indice.erp.pos.selfservice.SelfServiceKioskDtos.CatalogItem;
import com.indice.erp.pos.selfservice.SelfServiceKioskDtos.PreticketItemResponse;
import com.indice.erp.pos.selfservice.SelfServiceKioskDtos.PreticketResponse;
import java.math.BigDecimal;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.List;
import java.util.Optional;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.stereotype.Repository;

@Repository
public class SelfServiceKioskRepository {

    private final JdbcTemplate jdbcTemplate;

    public SelfServiceKioskRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public List<KioskRecord> list(PosContext context) {
        var params = new ArrayList<Object>();
        params.add(context.companyId());
        PosSqlSupport.appendScopeParams(params, context.scope());
        return jdbcTemplate.query(kioskSelect() + """
            WHERE kiosk.company_id = ? AND kiosk.deleted_at IS NULL
              AND """ + PosSqlSupport.scopePredicate("kiosk", context.scope()) + """
            ORDER BY kiosk.name, kiosk.id
            """, this::mapKiosk, params.toArray());
    }

    public Optional<KioskRecord> find(PosContext context, long kioskId) {
        var params = new ArrayList<Object>();
        params.add(context.companyId());
        params.add(kioskId);
        PosSqlSupport.appendScopeParams(params, context.scope());
        return jdbcTemplate.query(kioskSelect() + """
            WHERE kiosk.company_id = ? AND kiosk.id = ? AND kiosk.deleted_at IS NULL
              AND """ + PosSqlSupport.scopePredicate("kiosk", context.scope()),
            this::mapKiosk, params.toArray()).stream().findFirst();
    }

    public Optional<KioskRecord> findById(long kioskId) {
        return jdbcTemplate.query(kioskSelect() + """
            WHERE kiosk.id = ? AND kiosk.deleted_at IS NULL
            """, this::mapKiosk, kioskId).stream().findFirst();
    }

    public boolean hasOperationalRegisterAssignment(
            long companyId,
            long cashRegisterId,
            Long unitId,
            Long businessId,
            long warehouseId) {
        if (unitId == null || businessId == null) {
            return false;
        }
        var count = jdbcTemplate.queryForObject("""
            SELECT COUNT(*)
            FROM pos_cash_registers register
            JOIN sales_inventory_warehouses warehouse
              ON warehouse.id = register.warehouse_id
             AND warehouse.company_id = register.company_id
             AND warehouse.deleted_at IS NULL
            JOIN units unit
              ON unit.id = register.unit_id
             AND (unit.company_id = register.company_id OR unit.company_id IS NULL)
             AND LOWER(COALESCE(unit.status, 'active')) = 'active'
            JOIN businesses business
              ON business.id = register.business_id
             AND business.unit_id = unit.id
             AND (business.company_id = register.company_id OR business.company_id IS NULL)
             AND LOWER(COALESCE(business.status, 'active')) = 'active'
            WHERE register.company_id = ? AND register.id = ?
              AND register.deleted_at IS NULL
              AND register.is_active = 1
              AND UPPER(register.status) = 'ACTIVE'
              AND register.unit_id = ? AND register.business_id = ?
              AND register.warehouse_id = ?
              AND LOWER(COALESCE(warehouse.status, 'active')) = 'active'
              AND TRIM(warehouse.business_unit_id) = CAST(? AS CHAR)
              AND TRIM(warehouse.business_id) = CAST(? AS CHAR)
            """, Long.class, companyId, cashRegisterId, unitId, businessId,
            warehouseId, unitId, businessId);
        return count != null && count > 0;
    }

    public long insert(
            PosContext context,
            long warehouseId,
            long cashRegisterId,
            Long unitId,
            Long businessId,
            String code,
            String name,
            Instant expiresAt,
            String tokenHint,
            boolean showStock,
            boolean customerNameRequired,
            int maxItems,
            int ttlMinutes) {
        var keys = new GeneratedKeyHolder();
        jdbcTemplate.update(connection -> {
            var statement = connection.prepareStatement("""
                INSERT INTO pos_self_service_kiosks (
                    company_id, unit_id, business_id, warehouse_id, cash_register_id,
                    code, name, status, expires_at, public_token_hint, show_stock,
                    customer_name_required, max_items_per_ticket, preticket_ttl_minutes,
                    created_by_user_id, updated_by_user_id
                ) VALUES (?, ?, ?, ?, ?, ?, ?, 'ACTIVE', ?, ?, ?, ?, ?, ?, ?, ?)
                """, Statement.RETURN_GENERATED_KEYS);
            statement.setLong(1, context.companyId());
            statement.setObject(2, unitId);
            statement.setObject(3, businessId);
            statement.setLong(4, warehouseId);
            statement.setLong(5, cashRegisterId);
            statement.setString(6, code);
            statement.setString(7, name);
            statement.setTimestamp(8, timestamp(expiresAt));
            statement.setString(9, tokenHint);
            statement.setBoolean(10, showStock);
            statement.setBoolean(11, customerNameRequired);
            statement.setInt(12, maxItems);
            statement.setInt(13, ttlMinutes);
            statement.setLong(14, context.userId());
            statement.setLong(15, context.userId());
            return statement;
        }, keys);
        return keys.getKey().longValue();
    }

    public boolean update(
            PosContext context,
            long kioskId,
            String name,
            Instant expiresAt,
            boolean showStock,
            boolean customerNameRequired,
            int maxItems,
            int ttlMinutes,
            long version) {
        return jdbcTemplate.update("""
            UPDATE pos_self_service_kiosks
            SET name = ?, expires_at = ?, show_stock = ?, customer_name_required = ?,
                max_items_per_ticket = ?, preticket_ttl_minutes = ?, updated_by_user_id = ?,
                version = version + 1
            WHERE company_id = ? AND id = ? AND version = ? AND deleted_at IS NULL
              AND status <> 'REVOKED'
            """, name, timestamp(expiresAt), showStock, customerNameRequired,
            maxItems, ttlMinutes, context.userId(), context.companyId(), kioskId, version) > 0;
    }

    public boolean updateStatus(PosContext context, long kioskId, String status) {
        return jdbcTemplate.update("""
            UPDATE pos_self_service_kiosks
            SET status = ?, updated_by_user_id = ?, version = version + 1
            WHERE company_id = ? AND id = ? AND deleted_at IS NULL
            """, status, context.userId(), context.companyId(), kioskId) > 0;
    }

    public boolean updateTokenHint(PosContext context, long kioskId, String hint) {
        return jdbcTemplate.update("""
            UPDATE pos_self_service_kiosks
            SET public_token_hint = ?, updated_by_user_id = ?, version = version + 1
            WHERE company_id = ? AND id = ? AND deleted_at IS NULL AND status <> 'REVOKED'
            """, hint, context.userId(), context.companyId(), kioskId) > 0;
    }

    public boolean delete(PosContext context, long kioskId) {
        return jdbcTemplate.update("""
            DELETE FROM pos_self_service_kiosks
            WHERE company_id = ? AND id = ?
            """, context.companyId(), kioskId) > 0;
    }

    public boolean codeExists(long companyId, String code) {
        var count = jdbcTemplate.queryForObject("""
            SELECT COUNT(*) FROM pos_self_service_kiosks
            WHERE company_id = ? AND code = ? AND deleted_at IS NULL
            """, Long.class, companyId, code);
        return count != null && count > 0;
    }

    public List<CatalogItem> catalog(KioskRecord kiosk) {
        return jdbcTemplate.query("""
            SELECT product.id AS product_id,
                   COALESCE(NULLIF(product.sku, ''), product.product_code) AS sku,
                   product.name, product.description, product.category,
                   product.price AS unit_price, UPPER(TRIM(product.currency)) AS currency,
                   COALESCE(balance.available_quantity, 0) AS available_quantity,
                   product.inventory_ready AS stock_tracked
            FROM sales_products product
            LEFT JOIN sales_inventory_balances balance
              ON balance.company_id = product.company_id
             AND balance.product_id = product.id
             AND balance.warehouse_id = ?
             AND balance.deleted_at IS NULL
            WHERE product.company_id = ? AND product.deleted_at IS NULL
              AND LOWER(product.status) = 'active' AND product.pos_ready = 1
              AND product.price IS NOT NULL AND product.price >= 0
              AND TRIM(product.currency) REGEXP '^[A-Za-z]{3}$'
            ORDER BY product.category, product.name, product.id
            """, (rs, rowNum) -> {
                var tracked = rs.getBoolean("stock_tracked");
                var available = rs.getBigDecimal("available_quantity");
                return new CatalogItem(
                    rs.getLong("product_id"), rs.getString("sku"), rs.getString("name"),
                    rs.getString("description"), rs.getString("category"),
                    rs.getBigDecimal("unit_price"), rs.getString("currency"), available,
                    tracked, !tracked || available.compareTo(BigDecimal.ZERO) > 0);
            }, kiosk.warehouseId(), kiosk.companyId());
    }

    public long insertPreticket(
            KioskRecord kiosk,
            String number,
            String claimCode,
            String currency,
            String customerName,
            String customerEmail,
            String customerPhone,
            int itemCount,
            BigDecimal subtotal,
            BigDecimal discount,
            Long discountRuleId,
            BigDecimal total,
            Instant expiresAt) {
        var keys = new GeneratedKeyHolder();
        jdbcTemplate.update(connection -> {
            var statement = connection.prepareStatement("""
                INSERT INTO pos_self_service_pretickets (
                    company_id, unit_id, business_id, kiosk_id, cash_register_id, warehouse_id, preticket_number,
                    claim_code, status, currency_code, customer_name, customer_email,
                    customer_phone, item_count, subtotal_amount, discount_amount, discount_rule_id,
                    total_amount, expires_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, Statement.RETURN_GENERATED_KEYS);
            statement.setLong(1, kiosk.companyId());
            statement.setLong(2, kiosk.unitId());
            statement.setLong(3, kiosk.businessId());
            statement.setLong(4, kiosk.id());
            statement.setLong(5, kiosk.cashRegisterId());
            statement.setLong(6, kiosk.warehouseId());
            statement.setString(7, number);
            statement.setString(8, claimCode);
            statement.setString(9, currency);
            statement.setString(10, customerName);
            statement.setString(11, customerEmail);
            statement.setString(12, customerPhone);
            statement.setInt(13, itemCount);
            statement.setBigDecimal(14, subtotal);
            statement.setBigDecimal(15, discount);
            statement.setObject(16, discountRuleId);
            statement.setBigDecimal(17, total);
            statement.setTimestamp(18, Timestamp.from(expiresAt));
            return statement;
        }, keys);
        return keys.getKey().longValue();
    }

    public long insertPreticket(
            KioskRecord kiosk,
            String number,
            String claimCode,
            String currency,
            String customerName,
            String customerEmail,
            String customerPhone,
            int itemCount,
            BigDecimal total,
            Instant expiresAt) {
        return insertPreticket(kiosk, number, claimCode, currency, customerName, customerEmail,
            customerPhone, itemCount, total, BigDecimal.ZERO, null, total, expiresAt);
    }

    public void lockClaimCodeAllocation(long companyId, long cashRegisterId) {
        jdbcTemplate.queryForObject("""
            SELECT id FROM pos_cash_registers
            WHERE company_id = ? AND id = ?
            FOR UPDATE
            """, Long.class, companyId, cashRegisterId);
    }

    public boolean activeClaimCodeExists(long companyId, long cashRegisterId, String claimCode) {
        var count = jdbcTemplate.queryForObject("""
            SELECT COUNT(*) FROM pos_self_service_pretickets
            WHERE company_id = ? AND cash_register_id = ? AND claim_code = ?
              AND status IN ('PENDING', 'CLAIMED')
              AND expires_at > CURRENT_TIMESTAMP
            """, Long.class, companyId, cashRegisterId, claimCode);
        return count != null && count > 0;
    }

    public void insertPreticketItem(
            long companyId,
            long preticketId,
            PreticketItemResponse item,
            int sortOrder) {
        jdbcTemplate.update("""
            INSERT INTO pos_self_service_preticket_items (
                company_id, preticket_id, product_id, sku, product_name,
                quantity, unit_price, discount_amount, discount_rule_id, line_total, sort_order
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, companyId, preticketId, item.productId(), item.sku(), item.productName(),
            item.quantity(), item.unitPrice(), item.discountAmount(), item.discountRuleId(), item.lineTotal(), sortOrder);
    }

    public Optional<PreticketResponse> findPreticket(long companyId, long preticketId) {
        var rows = jdbcTemplate.query(preticketSelect() + """
            WHERE preticket.company_id = ? AND preticket.id = ?
            """, this::mapPreticketWithoutItems, companyId, preticketId);
        return rows.stream().findFirst().map(this::withItems);
    }

    public List<PreticketResponse> listPending(
            PosContext context,
            CashRegisterRecord cashRegister) {
        var params = new ArrayList<Object>();
        params.add(context.companyId());
        params.add(cashRegister.id());
        params.add(cashRegister.unitId());
        params.add(cashRegister.businessId());
        params.add(cashRegister.warehouseId());
        PosSqlSupport.appendScopeParams(params, context.scope());
        return jdbcTemplate.query(preticketSelect() + """
            WHERE preticket.company_id = ? AND preticket.status = 'PENDING'
              AND preticket.expires_at > CURRENT_TIMESTAMP
              AND preticket.cash_register_id = ?
              AND preticket.unit_id = ? AND preticket.business_id = ?
              AND preticket.warehouse_id = ?
              AND """ + PosSqlSupport.scopePredicate("preticket", context.scope())
            + " ORDER BY preticket.created_at", this::mapPreticketWithoutItems,
            params.toArray()).stream().map(this::withItems).toList();
    }

    public boolean claim(
            PosContext context,
            long preticketId,
            CashRegisterRecord cashRegister) {
        var params = new ArrayList<Object>();
        params.add(context.userId());
        params.add(context.companyId());
        params.add(preticketId);
        params.add(cashRegister.id());
        params.add(cashRegister.unitId());
        params.add(cashRegister.businessId());
        params.add(cashRegister.warehouseId());
        PosSqlSupport.appendScopeParams(params, context.scope());
        return jdbcTemplate.update("""
            UPDATE pos_self_service_pretickets preticket
            JOIN pos_cash_registers register
              ON register.company_id = preticket.company_id
             AND register.id = preticket.cash_register_id
             AND register.deleted_at IS NULL
            JOIN sales_inventory_warehouses warehouse
              ON warehouse.company_id = register.company_id
             AND warehouse.id = register.warehouse_id
             AND warehouse.deleted_at IS NULL
            SET preticket.status = 'CLAIMED', preticket.claimed_by_user_id = ?,
                preticket.claimed_at = CURRENT_TIMESTAMP
            WHERE preticket.company_id = ? AND preticket.id = ? AND preticket.status = 'PENDING'
              AND preticket.cash_register_id = ?
              AND preticket.unit_id = ? AND preticket.business_id = ?
              AND preticket.warehouse_id = ?
              AND register.is_active = 1 AND UPPER(register.status) = 'ACTIVE'
              AND register.unit_id = preticket.unit_id
              AND register.business_id = preticket.business_id
              AND register.warehouse_id = preticket.warehouse_id
              AND LOWER(COALESCE(warehouse.status, 'active')) = 'active'
              AND TRIM(warehouse.business_unit_id) = CAST(preticket.unit_id AS CHAR)
              AND TRIM(warehouse.business_id) = CAST(preticket.business_id AS CHAR)
              AND preticket.expires_at > CURRENT_TIMESTAMP
              AND """ + PosSqlSupport.scopePredicate("preticket", context.scope()), params.toArray()) > 0;
    }

    public boolean releaseClaim(
            PosContext context,
            long preticketId,
            CashRegisterRecord cashRegister) {
        var params = new ArrayList<Object>();
        params.add(context.companyId());
        params.add(preticketId);
        params.add(cashRegister.id());
        params.add(context.userId());
        params.add(cashRegister.unitId());
        params.add(cashRegister.businessId());
        params.add(cashRegister.warehouseId());
        PosSqlSupport.appendScopeParams(params, context.scope());
        return jdbcTemplate.update("""
            UPDATE pos_self_service_pretickets preticket
            JOIN pos_cash_registers register
              ON register.company_id = preticket.company_id
             AND register.id = preticket.cash_register_id
             AND register.deleted_at IS NULL
            JOIN sales_inventory_warehouses warehouse
              ON warehouse.company_id = register.company_id
             AND warehouse.id = register.warehouse_id
             AND warehouse.deleted_at IS NULL
            SET preticket.status = 'PENDING', preticket.claimed_by_user_id = NULL,
                preticket.claimed_at = NULL
            WHERE preticket.company_id = ? AND preticket.id = ? AND preticket.status = 'CLAIMED'
              AND preticket.cash_register_id = ?
              AND preticket.claimed_by_user_id = ?
              AND preticket.unit_id = ? AND preticket.business_id = ?
              AND preticket.warehouse_id = ?
              AND register.is_active = 1 AND UPPER(register.status) = 'ACTIVE'
              AND register.unit_id = preticket.unit_id
              AND register.business_id = preticket.business_id
              AND register.warehouse_id = preticket.warehouse_id
              AND LOWER(COALESCE(warehouse.status, 'active')) = 'active'
              AND TRIM(warehouse.business_unit_id) = CAST(preticket.unit_id AS CHAR)
              AND TRIM(warehouse.business_id) = CAST(preticket.business_id AS CHAR)
              AND preticket.expires_at > CURRENT_TIMESTAMP
              AND """ + PosSqlSupport.scopePredicate("preticket", context.scope()), params.toArray()) > 0;
    }

    public Optional<PreticketResponse> lockClaimedForCheckout(
            PosContext context,
            long preticketId,
            CashRegisterRecord cashRegister) {
        var params = new ArrayList<Object>();
        params.add(context.companyId());
        params.add(preticketId);
        params.add(cashRegister.id());
        params.add(context.userId());
        params.add(cashRegister.unitId());
        params.add(cashRegister.businessId());
        params.add(cashRegister.warehouseId());
        PosSqlSupport.appendScopeParams(params, context.scope());
        var rows = jdbcTemplate.query(preticketSelect() + """
            WHERE preticket.company_id = ? AND preticket.id = ?
              AND preticket.cash_register_id = ?
              AND preticket.claimed_by_user_id = ?
              AND preticket.unit_id = ? AND preticket.business_id = ?
              AND preticket.warehouse_id = ?
              AND preticket.status = 'CLAIMED'
              AND preticket.expires_at > CURRENT_TIMESTAMP
              AND """ + PosSqlSupport.scopePredicate("preticket", context.scope())
            + " FOR UPDATE", this::mapPreticketWithoutItems, params.toArray());
        return rows.stream().findFirst().map(this::withItems);
    }

    public boolean completeClaim(
            PosContext context,
            long preticketId,
            CashRegisterRecord cashRegister,
            long ticketId) {
        var params = new ArrayList<Object>();
        params.add(ticketId);
        params.add(context.companyId());
        params.add(preticketId);
        params.add(cashRegister.id());
        params.add(context.userId());
        params.add(cashRegister.unitId());
        params.add(cashRegister.businessId());
        params.add(cashRegister.warehouseId());
        PosSqlSupport.appendScopeParams(params, context.scope());
        return jdbcTemplate.update("""
            UPDATE pos_self_service_pretickets preticket
            SET preticket.status = 'COMPLETED', preticket.pos_ticket_id = ?,
                preticket.completed_at = CURRENT_TIMESTAMP
            WHERE preticket.company_id = ? AND preticket.id = ?
              AND preticket.cash_register_id = ?
              AND preticket.claimed_by_user_id = ?
              AND preticket.unit_id = ? AND preticket.business_id = ?
              AND preticket.warehouse_id = ?
              AND preticket.status = 'CLAIMED'
              AND """ + PosSqlSupport.scopePredicate("preticket", context.scope()), params.toArray()) > 0;
    }

    public int expirePending() {
        return jdbcTemplate.update("""
            UPDATE pos_self_service_pretickets SET status = 'EXPIRED'
            WHERE status IN ('PENDING', 'CLAIMED') AND expires_at <= CURRENT_TIMESTAMP
            """);
    }

    public int purgeRetainedPersonalData() {
        return jdbcTemplate.update("""
            UPDATE pos_self_service_pretickets
            SET customer_name = NULL, customer_email = NULL, customer_phone = NULL,
                personal_data_purged_at = CURRENT_TIMESTAMP
            WHERE personal_data_purged_at IS NULL
              AND created_at < CURRENT_TIMESTAMP - INTERVAL 90 DAY
            """);
    }

    public void audit(
            long companyId,
            long kioskId,
            Long preticketId,
            String eventType,
            String outcome,
            String requestId,
            String actionId,
            Long actorId,
            String snapshotJson) {
        jdbcTemplate.update("""
            INSERT INTO pos_self_service_audit_events (
                event_id, company_id, kiosk_id, preticket_id, event_type, outcome,
                request_id, action_id, actor_user_id, snapshot_json, retain_until
            ) VALUES (UUID(), ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP + INTERVAL 1 YEAR)
            """, companyId, kioskId, preticketId, eventType, outcome,
            requestId, actionId, actorId, snapshotJson);
    }

    public List<Map<String, Object>> listAudit(long companyId, long kioskId) {
        return jdbcTemplate.query("""
            SELECT event_id, event_type, outcome, request_id, action_id,
                   actor_user_id, snapshot_json, created_at
            FROM pos_self_service_audit_events
            WHERE company_id = ? AND kiosk_id = ?
            ORDER BY created_at DESC, id DESC
            LIMIT 200
            """, (rs, rowNum) -> {
                var event = new LinkedHashMap<String, Object>();
                event.put("event_id", rs.getString("event_id"));
                event.put("event_type", rs.getString("event_type"));
                event.put("outcome", rs.getString("outcome"));
                if (rs.getString("request_id") != null) {
                    event.put("request_id", rs.getString("request_id"));
                }
                if (rs.getString("action_id") != null) {
                    event.put("action_id", rs.getString("action_id"));
                }
                var actor = rs.getObject("actor_user_id", Long.class);
                if (actor != null) event.put("actor_id", actor);
                if (rs.getString("snapshot_json") != null) {
                    event.put("snapshot_json", rs.getString("snapshot_json"));
                }
                event.put("created_at", rs.getTimestamp("created_at").toInstant().toString());
                return java.util.Collections.unmodifiableMap(event);
            }, companyId, kioskId);
    }

    private PreticketResponse withItems(PreticketResponse row) {
        var items = jdbcTemplate.query("""
            SELECT product_id, sku, product_name, quantity, unit_price, discount_amount, discount_rule_id, line_total
            FROM pos_self_service_preticket_items
            WHERE preticket_id = ? ORDER BY sort_order, id
            """, (rs, rowNum) -> new PreticketItemResponse(
                rs.getLong("product_id"), rs.getString("sku"), rs.getString("product_name"),
                rs.getBigDecimal("quantity"), rs.getBigDecimal("unit_price"),
                rs.getBigDecimal("discount_amount"), rs.getObject("discount_rule_id", Long.class),
                rs.getBigDecimal("line_total")), row.id());
        return new PreticketResponse(
            row.id(), row.kioskId(), row.cashRegisterId(), row.cashRegisterName(),
            row.preticketNumber(), row.claimCode(), row.status(), row.currencyCode(),
            row.customerName(), row.itemCount(), row.subtotalAmount(), row.discountAmount(), row.discountRuleId(), row.totalAmount(),
            row.expiresAt(), row.createdAt(), items);
    }

    private String kioskSelect() {
        return """
            SELECT kiosk.*, company.name AS company_name,
                   unit.name AS unit_name, business.name AS business_name,
                   warehouse.name AS warehouse_name,
                   register.code AS cash_register_code, register.name AS cash_register_name
            FROM pos_self_service_kiosks kiosk
            JOIN companies company ON company.id = kiosk.company_id
            LEFT JOIN units unit ON unit.id = kiosk.unit_id
              AND (unit.company_id = kiosk.company_id OR unit.company_id IS NULL)
            LEFT JOIN businesses business ON business.id = kiosk.business_id
              AND business.unit_id = kiosk.unit_id
              AND (business.company_id = kiosk.company_id OR business.company_id IS NULL)
            JOIN sales_inventory_warehouses warehouse ON warehouse.id = kiosk.warehouse_id
            JOIN pos_cash_registers register ON register.id = kiosk.cash_register_id
            """;
    }

    private String preticketSelect() {
        return """
            SELECT preticket.*, register.name AS cash_register_name
            FROM pos_self_service_pretickets preticket
            JOIN pos_cash_registers register ON register.id = preticket.cash_register_id
            """;
    }

    private KioskRecord mapKiosk(ResultSet rs, int rowNum) throws SQLException {
        return new KioskRecord(
            rs.getLong("id"), rs.getLong("company_id"), rs.getString("company_name"),
            rs.getObject("unit_id", Long.class), rs.getString("unit_name"),
            rs.getObject("business_id", Long.class), rs.getString("business_name"),
            rs.getLong("warehouse_id"), rs.getString("warehouse_name"),
            rs.getLong("cash_register_id"), rs.getString("cash_register_code"),
            rs.getString("cash_register_name"), rs.getString("code"), rs.getString("name"),
            rs.getString("status"), instant(rs, "expires_at"), rs.getString("public_token_hint"),
            rs.getBoolean("show_stock"), rs.getBoolean("customer_name_required"),
            rs.getInt("max_items_per_ticket"), rs.getInt("preticket_ttl_minutes"),
            rs.getLong("version"), instant(rs, "created_at"), instant(rs, "updated_at"));
    }

    private PreticketResponse mapPreticketWithoutItems(ResultSet rs, int rowNum) throws SQLException {
        return new PreticketResponse(
            rs.getLong("id"), rs.getLong("kiosk_id"), rs.getLong("cash_register_id"),
            rs.getString("cash_register_name"), rs.getString("preticket_number"),
            rs.getString("claim_code"), rs.getString("status"), rs.getString("currency_code"),
            rs.getString("customer_name"), rs.getInt("item_count"),
            rs.getBigDecimal("subtotal_amount"), rs.getBigDecimal("discount_amount"),
            rs.getObject("discount_rule_id", Long.class), rs.getBigDecimal("total_amount"),
            instant(rs, "expires_at"), instant(rs, "created_at"), List.of());
    }

    private Instant instant(ResultSet rs, String column) throws SQLException {
        var value = rs.getTimestamp(column);
        return value == null ? null : value.toInstant();
    }

    private Timestamp timestamp(Instant value) {
        return value == null ? null : Timestamp.from(value);
    }

    public record KioskRecord(
        long id,
        long companyId,
        String companyName,
        Long unitId,
        String unitName,
        Long businessId,
        String businessName,
        long warehouseId,
        String warehouseName,
        long cashRegisterId,
        String cashRegisterCode,
        String cashRegisterName,
        String code,
        String name,
        String status,
        Instant expiresAt,
        String tokenHint,
        boolean showStock,
        boolean customerNameRequired,
        int maxItems,
        int ttlMinutes,
        long version,
        Instant createdAt,
        Instant updatedAt
    ) {
    }
}
