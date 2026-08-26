package com.indice.erp.pos.restaurant;

import com.indice.erp.pos.PosApiException;
import com.indice.erp.pos.restaurant.RestaurantOrderDtos.RestaurantCheckoutLine;
import com.indice.erp.pos.restaurant.RestaurantOrderDtos.RestaurantCheckoutOrder;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.sql.Statement;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.Optional;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.stereotype.Repository;

@Repository
public class RestaurantOrderRepository {

    private final JdbcTemplate jdbcTemplate;

    public RestaurantOrderRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public long insertEcosystem(
            long companyId, long unitId, long businessId, long warehouseId, long registerId,
            String code, String name, String currency, long userId) {
        return insertKey("""
            INSERT INTO pos_restaurant_ecosystems (
                company_id, unit_id, business_id, warehouse_id, settlement_cash_register_id,
                code, name, currency_code, created_by_user_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, companyId, unitId, businessId, warehouseId, registerId, code, name, currency, userId);
    }

    public long insertArea(long companyId, long ecosystemId, String code, String name) {
        return insertKey("""
            INSERT INTO pos_restaurant_areas (company_id, ecosystem_id, code, name)
            VALUES (?, ?, ?, ?)
            """, companyId, ecosystemId, code, name);
    }

    public void insertTables(long companyId, long ecosystemId, long areaId, int count) {
        for (var number = 1; number <= count; number++) {
            var code = "TABLE-" + String.format("%02d", number);
            jdbcTemplate.update("""
                INSERT INTO pos_restaurant_tables (
                    company_id, ecosystem_id, area_id, code, name, capacity, sort_order,
                    layout_shape, layout_x, layout_y, layout_width, layout_height, layout_rotation
                ) VALUES (?, ?, ?, ?, ?, 4, ?, 'ROUND', ?, ?, 3, 3, 0)
                """, companyId, ecosystemId, areaId, code, "Mesa " + String.format("%02d", number), number,
                ((number - 1) % 3) * 4, ((number - 1) / 3) * 4);
        }
    }

    public long insertKiosk(
            long companyId, long ecosystemId, String kioskType, String code, String name,
            Long areaId, String stationCode, String tokenHint, Instant expiresAt, long userId) {
        return insertKey("""
            INSERT INTO pos_restaurant_kiosks (
                company_id, ecosystem_id, kiosk_type, code, name, area_id,
                kitchen_station_code, public_token_hint, expires_at, created_by_user_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, companyId, ecosystemId, kioskType, code, name, areaId, stationCode,
            tokenHint, expiresAt == null ? null : java.sql.Timestamp.from(expiresAt), userId);
    }

    public List<Map<String, Object>> listEcosystems(long companyId) {
        return jdbcTemplate.query("""
            SELECT ecosystem.id, ecosystem.code, ecosystem.name, ecosystem.unit_id,
                   ecosystem.business_id, ecosystem.warehouse_id,
                   ecosystem.settlement_cash_register_id AS cash_register_id,
                   register.name AS cash_register_name, register.code AS cash_register_code,
                   warehouse.name AS warehouse_name, ecosystem.currency_code,
                   (SELECT COUNT(*) FROM pos_restaurant_tables restaurant_table
                    WHERE restaurant_table.company_id = ecosystem.company_id
                      AND restaurant_table.ecosystem_id = ecosystem.id) AS table_count,
                   (SELECT COUNT(*) FROM pos_restaurant_kiosks kiosk
                    WHERE kiosk.company_id = ecosystem.company_id
                      AND kiosk.ecosystem_id = ecosystem.id AND kiosk.deleted_at IS NULL) AS kiosk_count
            FROM pos_restaurant_ecosystems ecosystem
            JOIN pos_cash_registers register
              ON register.id = ecosystem.settlement_cash_register_id
             AND register.company_id = ecosystem.company_id
            JOIN sales_inventory_warehouses warehouse
              ON warehouse.id = ecosystem.warehouse_id
             AND warehouse.company_id = ecosystem.company_id
            WHERE ecosystem.company_id = ? AND ecosystem.deleted_at IS NULL
            ORDER BY ecosystem.name, ecosystem.id
            """, (rs, rowNum) -> map(
                "id", rs.getLong("id"), "code", rs.getString("code"), "name", rs.getString("name"),
                "unitId", rs.getLong("unit_id"), "businessId", rs.getLong("business_id"),
                "warehouseId", rs.getLong("warehouse_id"), "warehouseName", rs.getString("warehouse_name"),
                "cashRegisterId", rs.getLong("cash_register_id"),
                "cashRegisterName", rs.getString("cash_register_name"),
                "cashRegisterCode", rs.getString("cash_register_code"),
                "currencyCode", rs.getString("currency_code"),
                "tableCount", rs.getInt("table_count"), "kioskCount", rs.getInt("kiosk_count")), companyId);
    }

    public Optional<Map<String, Object>> ecosystem(long companyId, long ecosystemId) {
        return listEcosystems(companyId).stream()
            .filter(item -> ((Number) item.get("id")).longValue() == ecosystemId)
            .findFirst();
    }

    public List<Map<String, Object>> listAdmin(long companyId) {
        return jdbcTemplate.query("""
            SELECT kiosk.id AS legacy_id, definition.id, kiosk.kiosk_type, kiosk.name, kiosk.code,
                   UPPER(kiosk.status) AS status, kiosk.ecosystem_id, ecosystem.name AS ecosystem_name,
                   ecosystem.unit_id, ecosystem.business_id, ecosystem.warehouse_id,
                   warehouse.name AS warehouse_name,
                   ecosystem.settlement_cash_register_id AS cash_register_id,
                   register.code AS cash_register_code, register.name AS cash_register_name,
                   area.id AS area_id, area.name AS area_name, kiosk.kitchen_station_code,
                   kiosk.expires_at, kiosk.public_token_hint, kiosk.version,
                   definition.last_seen_at,
                   (SELECT MAX(session.last_activity_at)
                      FROM kiosk_sessions session
                     WHERE session.kiosk_definition_id = definition.id) AS session_activity_at,
                   (SELECT MAX(COALESCE(action.completed_at, action.requested_at))
                      FROM kiosk_actions action
                     WHERE action.kiosk_definition_id = definition.id) AS action_activity_at,
                   (definition.protected_public_token IS NOT NULL
                    AND definition.protected_public_token <> '') AS access_recoverable,
                   EXISTS (
                     SELECT 1 FROM pos_shifts shift
                     WHERE shift.company_id = kiosk.company_id
                       AND shift.cash_register_id = ecosystem.settlement_cash_register_id
                       AND shift.deleted_at IS NULL AND shift.status IN ('OPEN', 'CLOSING')
                   ) AS source_register_open
            FROM pos_restaurant_kiosks kiosk
            JOIN pos_restaurant_ecosystems ecosystem
              ON ecosystem.id = kiosk.ecosystem_id AND ecosystem.company_id = kiosk.company_id
            JOIN pos_cash_registers register
              ON register.id = ecosystem.settlement_cash_register_id
             AND register.company_id = ecosystem.company_id
            JOIN sales_inventory_warehouses warehouse
              ON warehouse.id = ecosystem.warehouse_id
             AND warehouse.company_id = ecosystem.company_id
            LEFT JOIN pos_restaurant_areas area
              ON area.id = kiosk.area_id AND area.company_id = kiosk.company_id
            JOIN kiosk_definitions definition
              ON definition.company_id = kiosk.company_id
             AND definition.owner_module = 'POINT_OF_SALE'
             AND definition.kiosk_type = kiosk.kiosk_type
             AND definition.legacy_reference_id = kiosk.id
            WHERE kiosk.company_id = ? AND kiosk.deleted_at IS NULL
            ORDER BY kiosk.name, kiosk.id
            """, (rs, rowNum) -> {
                var assignment = map(
                    "kind", "AREA", "primaryLabel", rs.getString("ecosystem_name"),
                    "secondaryLabel", first(rs.getString("area_name"), rs.getString("kitchen_station_code"), rs.getString("cash_register_name")),
                    "unitId", rs.getLong("unit_id"), "businessId", rs.getLong("business_id"),
                    "warehouseId", rs.getLong("warehouse_id"), "warehouseName", rs.getString("warehouse_name"),
                    "cashRegisterId", rs.getLong("cash_register_id"),
                    "cashRegisterCode", rs.getString("cash_register_code"),
                    "cashRegisterName", rs.getString("cash_register_name"),
                    "ecosystemId", rs.getLong("ecosystem_id"), "ecosystemName", rs.getString("ecosystem_name"));
                var status = rs.getString("status");
                var recoverable = rs.getBoolean("access_recoverable");
                var sourceRegisterOpen = rs.getBoolean("source_register_open");
                return map(
                    "id", rs.getLong("id"), "legacyReferenceId", rs.getLong("legacy_id"),
                    "kioskType", rs.getString("kiosk_type"), "name", rs.getString("name"),
                    "code", rs.getString("code"), "status", status,
                    "configurationStatus", "CONFIGURED", "assignment", assignment,
                    "connectionStatus", connectionStatus(rs.getTimestamp("last_seen_at")),
                    "lastActivityAt", instant(latest(
                        rs.getTimestamp("last_seen_at"),
                        rs.getTimestamp("session_activity_at"),
                        rs.getTimestamp("action_activity_at"))),
                    "expiresAt", instant(rs.getTimestamp("expires_at")),
                    "publicTokenHint", rs.getString("public_token_hint"),
                    "accessRecoverable", recoverable, "version", rs.getLong("version"),
                    "sourceRegisterOpen", sourceRegisterOpen,
                    "operationalStatus", sourceRegisterOpen ? "READY" : "SOURCE_REGISTER_CLOSED",
                    "actions", actions(status, recoverable));
            }, companyId);
    }

    public Optional<Map<String, Object>> kiosk(long companyId, long legacyId) {
        return jdbcTemplate.query("""
            SELECT kiosk.*, ecosystem.name AS ecosystem_name, ecosystem.currency_code,
                   ecosystem.warehouse_id, ecosystem.unit_id, ecosystem.business_id,
                   ecosystem.settlement_cash_register_id,
                   COALESCE(area.name, '') AS area_name
            FROM pos_restaurant_kiosks kiosk
            JOIN pos_restaurant_ecosystems ecosystem
              ON ecosystem.id = kiosk.ecosystem_id AND ecosystem.company_id = kiosk.company_id
            LEFT JOIN pos_restaurant_areas area
              ON area.id = kiosk.area_id AND area.company_id = kiosk.company_id
            WHERE kiosk.company_id = ? AND kiosk.id = ? AND kiosk.deleted_at IS NULL
            """, (rs, rowNum) -> map(
                "id", rs.getLong("id"), "companyId", rs.getLong("company_id"),
                "ecosystemId", rs.getLong("ecosystem_id"), "ecosystemName", rs.getString("ecosystem_name"),
                "kioskType", rs.getString("kiosk_type"), "name", rs.getString("name"),
                "code", rs.getString("code"), "status", rs.getString("status"),
                "areaId", nullableLong(rs, "area_id"), "areaName", rs.getString("area_name"),
                "kitchenStationCode", rs.getString("kitchen_station_code"),
                "currencyCode", rs.getString("currency_code"), "warehouseId", rs.getLong("warehouse_id"),
                "unitId", rs.getLong("unit_id"), "businessId", rs.getLong("business_id"),
                "cashRegisterId", rs.getLong("settlement_cash_register_id"),
                "expiresAt", instant(rs.getTimestamp("expires_at")), "version", rs.getLong("version")),
            companyId, legacyId).stream().findFirst();
    }

    public boolean updateKiosk(long companyId, long legacyId, String name, Instant expiresAt, Long version, long userId) {
        var sql = """
            UPDATE pos_restaurant_kiosks SET name = ?, expires_at = ?, updated_by_user_id = ?, version = version + 1
            WHERE company_id = ? AND id = ? AND deleted_at IS NULL AND status <> 'REVOKED'
            """ + (version == null ? "" : " AND version = ?");
        return jdbcTemplate.update(sql, version == null
            ? new Object[] {name, expiresAt == null ? null : java.sql.Timestamp.from(expiresAt), userId, companyId, legacyId}
            : new Object[] {name, expiresAt == null ? null : java.sql.Timestamp.from(expiresAt), userId, companyId, legacyId, version}) > 0;
    }

    public boolean transitionKiosk(long companyId, long legacyId, String status, long userId) {
        return jdbcTemplate.update("""
            UPDATE pos_restaurant_kiosks SET status = ?, updated_by_user_id = ?, version = version + 1
            WHERE company_id = ? AND id = ? AND deleted_at IS NULL
            """, status, userId, companyId, legacyId) > 0;
    }

    public boolean updateTokenHint(long companyId, long legacyId, String hint, long userId) {
        return jdbcTemplate.update("""
            UPDATE pos_restaurant_kiosks SET public_token_hint = ?, updated_by_user_id = ?, version = version + 1
            WHERE company_id = ? AND id = ? AND deleted_at IS NULL AND status <> 'REVOKED'
            """, hint, userId, companyId, legacyId) > 0;
    }

    public List<Map<String, Object>> tables(long companyId, long ecosystemId, Long areaId, Long shiftId) {
        var params = areaId == null
            ? new Object[] {shiftId, shiftId, companyId, ecosystemId}
            : new Object[] {shiftId, shiftId, companyId, ecosystemId, areaId};
        return jdbcTemplate.query("""
            SELECT restaurant_table.id, restaurant_table.code, restaurant_table.name,
                   restaurant_table.capacity,
                   CASE
                     WHEN restaurant_order.id IS NULL
                      AND restaurant_table.operational_status IN ('OCCUPIED', 'CHECK_REQUESTED', 'CHECKOUT')
                     THEN 'AVAILABLE'
                     ELSE restaurant_table.operational_status
                   END AS operational_status,
                   restaurant_table.version,
                   restaurant_table.layout_shape, restaurant_table.layout_x, restaurant_table.layout_y,
                   restaurant_table.layout_width, restaurant_table.layout_height,
                   restaurant_table.layout_rotation,
                   area.id AS area_id, area.name AS area_name,
                   restaurant_order.id AS order_id, restaurant_order.order_number,
                   restaurant_order.status AS order_status, restaurant_order.guest_count,
                   restaurant_order.total_amount, restaurant_order.responsible_user_company_id,
                   NULLIF(TRIM(CONCAT_WS(' ', COALESCE(responsible_waiter.first_name, ''),
                       COALESCE(responsible_waiter.last_name, ''))), '') AS responsible_waiter_name,
                   NULLIF(responsible_waiter.user_code, '') AS responsible_waiter_code,
                   restaurant_order.updated_at
            FROM pos_restaurant_tables restaurant_table
            JOIN pos_restaurant_areas area
              ON area.id = restaurant_table.area_id AND area.company_id = restaurant_table.company_id
            LEFT JOIN pos_restaurant_orders restaurant_order
             ON restaurant_order.company_id = restaurant_table.company_id
             AND restaurant_order.table_id = restaurant_table.id
             AND ? IS NOT NULL AND restaurant_order.settlement_shift_id = ?
             AND restaurant_order.status NOT IN ('PAID', 'CLOSED', 'CANCELLED')
            LEFT JOIN hr_users responsible_waiter
              ON responsible_waiter.id = restaurant_order.responsible_user_company_id
             AND responsible_waiter.company_id = restaurant_order.company_id
            WHERE restaurant_table.company_id = ? AND restaurant_table.ecosystem_id = ?
            """ + (areaId == null ? "" : " AND restaurant_table.area_id = ?\n") + """
            ORDER BY area.sort_order, restaurant_table.sort_order, restaurant_table.id
            """, (rs, rowNum) -> map(
                "id", rs.getLong("id"), "code", rs.getString("code"), "name", rs.getString("name"),
                "capacity", rs.getInt("capacity"), "status", rs.getString("operational_status"),
                "version", rs.getLong("version"), "layoutShape", rs.getString("layout_shape"),
                "layoutX", rs.getInt("layout_x"), "layoutY", rs.getInt("layout_y"),
                "layoutWidth", rs.getInt("layout_width"), "layoutHeight", rs.getInt("layout_height"),
                "layoutRotation", rs.getInt("layout_rotation"),
                "areaId", rs.getLong("area_id"), "areaName", rs.getString("area_name"),
                "orderId", nullableLong(rs, "order_id"), "orderNumber", rs.getString("order_number"),
                "orderStatus", rs.getString("order_status"), "guestCount", rs.getInt("guest_count"),
                "totalAmount", rs.getBigDecimal("total_amount"),
                "responsibleUserCompanyId", nullableLong(rs, "responsible_user_company_id"),
                "responsibleWaiterName", rs.getString("responsible_waiter_name"),
                "responsibleWaiterCode", rs.getString("responsible_waiter_code"),
                "updatedAt", instant(rs.getTimestamp("updated_at"))), params);
    }

    public boolean updateTableLayout(
            long companyId, long ecosystemId, long tableId, String name, int capacity,
            String shape, int x, int y, int width, int height, int rotation, long version) {
        return jdbcTemplate.update("""
            UPDATE pos_restaurant_tables
            SET name = ?, capacity = ?, layout_shape = ?, layout_x = ?, layout_y = ?,
                layout_width = ?, layout_height = ?, layout_rotation = ?,
                sort_order = ?, version = version + 1
            WHERE company_id = ? AND ecosystem_id = ? AND id = ? AND version = ?
            """, name, capacity, shape, x, y, width, height, rotation, y * 12 + x,
            companyId, ecosystemId, tableId, version) == 1;
    }

    public List<Map<String, Object>> catalog(long companyId, long warehouseId, long shiftId, String currency) {
        return jdbcTemplate.query("""
            SELECT product.id, COALESCE(NULLIF(product.sku, ''), product.product_code) AS sku,
                   product.name, product.description, product.category, product.price,
                   UPPER(product.currency) AS currency,
                   GREATEST(
                     COALESCE(balance.available_quantity, 0) - COALESCE(reservation.reserved_quantity, 0),
                     0
                   ) AS available_quantity,
                   product.inventory_ready
            FROM sales_products product
            LEFT JOIN sales_inventory_balances balance
              ON balance.company_id = product.company_id AND balance.product_id = product.id
             AND balance.warehouse_id = ? AND balance.deleted_at IS NULL
            LEFT JOIN (
                SELECT item.company_id, item.product_id, ecosystem.warehouse_id,
                       SUM(item.quantity) AS reserved_quantity
                FROM pos_restaurant_order_items item
                JOIN pos_restaurant_orders restaurant_order
                  ON restaurant_order.id = item.order_id
                 AND restaurant_order.company_id = item.company_id
                JOIN pos_restaurant_ecosystems ecosystem
                  ON ecosystem.id = restaurant_order.ecosystem_id
                 AND ecosystem.company_id = restaurant_order.company_id
                WHERE item.company_id = ? AND ecosystem.warehouse_id = ?
                  AND restaurant_order.settlement_shift_id = ?
                  AND restaurant_order.status NOT IN ('PAID', 'CLOSED', 'CANCELLED')
                  AND item.status NOT IN ('CANCELLED', 'VOIDED')
                GROUP BY item.company_id, item.product_id, ecosystem.warehouse_id
            ) reservation
              ON reservation.company_id = product.company_id
             AND reservation.product_id = product.id
            WHERE product.company_id = ? AND product.deleted_at IS NULL
              AND LOWER(product.status) = 'active' AND product.pos_ready = 1
              AND UPPER(product.currency) = UPPER(?)
              AND product.price IS NOT NULL AND product.price >= 0
              AND (
                COALESCE(product.inventory_ready, 0) = 0
                OR COALESCE(balance.available_quantity, 0) > COALESCE(reservation.reserved_quantity, 0)
              )
            ORDER BY product.category, product.name, product.id
            """, (rs, rowNum) -> map(
                "id", rs.getLong("id"), "sku", rs.getString("sku"), "name", rs.getString("name"),
                "description", rs.getString("description"), "category", rs.getString("category"),
                "price", rs.getBigDecimal("price"), "currency", rs.getString("currency"),
                "availableQuantity", rs.getBigDecimal("available_quantity"),
                "stockTracked", rs.getBoolean("inventory_ready")), warehouseId, companyId, warehouseId,
            shiftId, companyId, currency);
    }

    public List<Map<String, Object>> pinCandidates(long companyId) {
        return jdbcTemplate.query("""
            SELECT method.secret_hash, profile.user_company_id, membership.user_id,
                   LOWER(COALESCE(membership.role, '')) AS membership_role,
                   TRIM(CONCAT_WS(' ', COALESCE(employee.first_name, ''), COALESCE(employee.last_name, ''))) AS full_name,
                   COALESCE(employee.user_code, '') AS user_code,
                   work_profile.unit_id, work_profile.business_id
            FROM user_access_methods method
            JOIN user_access_profiles profile
              ON profile.id = method.access_profile_id AND profile.company_id = method.company_id
            JOIN hr_users employee
              ON employee.id = profile.user_company_id AND employee.company_id = method.company_id
            JOIN user_companies membership
              ON membership.id = profile.user_company_id AND membership.company_id = method.company_id
            LEFT JOIN user_work_profiles work_profile
              ON work_profile.user_company_id = profile.user_company_id
             AND work_profile.company_id = method.company_id
            WHERE method.company_id = ? AND method.method_type = 'pin'
              AND LOWER(COALESCE(method.status, 'active')) = 'active'
              AND LOWER(COALESCE(profile.status, 'active')) = 'active'
              AND LOWER(COALESCE(membership.status, 'active')) IN ('active', 'activo')
              AND LOWER(COALESCE(employee.status, 'active')) <> 'terminated'
            ORDER BY profile.user_company_id, method.priority, method.id
            LIMIT 500
            """, (rs, rowNum) -> map(
                "secretHash", rs.getString("secret_hash"),
                "userCompanyId", rs.getLong("user_company_id"), "userId", rs.getLong("user_id"),
                "role", rs.getString("membership_role"),
                "fullName", rs.getString("full_name"), "userCode", rs.getString("user_code"),
                "unitId", rs.getObject("unit_id", Long.class),
                "businessId", rs.getObject("business_id", Long.class)), companyId);
    }

    public Optional<Map<String, Object>> employeeScope(long companyId, long userCompanyId) {
        return jdbcTemplate.query("""
            SELECT membership.id AS user_company_id,
                   LOWER(COALESCE(membership.role, '')) AS membership_role,
                   work_profile.unit_id, work_profile.business_id
            FROM user_companies membership
            LEFT JOIN user_work_profiles work_profile
              ON work_profile.user_company_id = membership.id
             AND work_profile.company_id = membership.company_id
            JOIN hr_users employee
              ON employee.id = membership.id AND employee.company_id = membership.company_id
            WHERE membership.company_id = ? AND membership.id = ?
              AND LOWER(COALESCE(membership.status, 'active')) IN ('active', 'activo')
              AND LOWER(COALESCE(employee.status, 'active')) <> 'terminated'
            LIMIT 1
            """, (rs, rowNum) -> map(
                "userCompanyId", rs.getLong("user_company_id"),
                "role", rs.getString("membership_role"),
                "unitId", rs.getObject("unit_id", Long.class),
                "businessId", rs.getObject("business_id", Long.class)), companyId, userCompanyId)
            .stream().findFirst();
    }

    public long openOrder(
            long companyId, long ecosystemId, long tableId, long openedByUserCompanyId,
            Long responsibleUserCompanyId, long kioskId,
            long registerId, long shiftId, String number, int guests, String currency, String notes) {
        jdbcTemplate.update("""
            UPDATE pos_restaurant_tables restaurant_table
            SET restaurant_table.operational_status = 'AVAILABLE',
                restaurant_table.version = restaurant_table.version + 1
            WHERE restaurant_table.company_id = ? AND restaurant_table.ecosystem_id = ?
              AND restaurant_table.id = ?
              AND restaurant_table.operational_status IN ('OCCUPIED', 'CHECK_REQUESTED', 'CHECKOUT')
              AND NOT EXISTS (
                  SELECT 1 FROM pos_restaurant_orders current_order
                  WHERE current_order.company_id = restaurant_table.company_id
                    AND current_order.table_id = restaurant_table.id
                    AND current_order.settlement_shift_id = ?
                    AND current_order.status NOT IN ('PAID', 'CLOSED', 'CANCELLED')
              )
            """, companyId, ecosystemId, tableId, shiftId);
        var tableAvailable = !jdbcTemplate.query("""
            SELECT id FROM pos_restaurant_tables
            WHERE company_id = ? AND ecosystem_id = ? AND id = ? AND operational_status = 'AVAILABLE'
            FOR UPDATE
            """, (rs, rowNum) -> rs.getLong("id"), companyId, ecosystemId, tableId).isEmpty();
        if (!tableAvailable) throw PosApiException.conflict("Restaurant table is not available.");
        var existing = jdbcTemplate.queryForObject("""
            SELECT COUNT(*) FROM pos_restaurant_orders
            WHERE company_id = ? AND table_id = ?
              AND settlement_shift_id = ?
              AND status NOT IN ('PAID', 'CLOSED', 'CANCELLED')
            """, Long.class, companyId, tableId, shiftId);
        if (existing != null && existing > 0) throw PosApiException.conflict("Table already has an open order.");
        var id = insertKey("""
            INSERT INTO pos_restaurant_orders (
                company_id, ecosystem_id, table_id, opened_by_user_company_id,
                responsible_user_company_id, source_kiosk_id, settlement_cash_register_id, settlement_shift_id,
                order_number, guest_count, status, currency_code, notes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'OPEN', ?, ?)
            """, companyId, ecosystemId, tableId, openedByUserCompanyId, responsibleUserCompanyId, kioskId,
            registerId, shiftId, number, guests, currency, notes);
        jdbcTemplate.update("""
            UPDATE pos_restaurant_tables SET operational_status = 'OCCUPIED', version = version + 1
            WHERE company_id = ? AND id = ?
            """, companyId, tableId);
        return id;
    }

    public boolean attributeWaiter(
            long companyId, long ecosystemId, long shiftId, long orderId, long userCompanyId) {
        return jdbcTemplate.update("""
            UPDATE pos_restaurant_orders
            SET responsible_user_company_id = ?, version = version + 1
            WHERE company_id = ? AND ecosystem_id = ? AND settlement_shift_id = ? AND id = ?
              AND status IN ('OPEN', 'IN_SERVICE', 'CHECK_REQUESTED', 'READY_FOR_CHECKOUT')
            """, userCompanyId, companyId, ecosystemId, shiftId, orderId) == 1;
    }

    public long addItem(
            long companyId, long ecosystemId, long warehouseId, String currency,
            long orderId, long shiftId, long productId, BigDecimal quantity,
            int guestNumber, String notes, String modifiers, String stationCode) {
        var orderGuestCount = jdbcTemplate.query("""
            SELECT guest_count FROM pos_restaurant_orders
            WHERE company_id = ? AND ecosystem_id = ? AND id = ?
              AND settlement_shift_id = ?
              AND status IN ('OPEN', 'IN_SERVICE')
            FOR UPDATE
            """, (rs, rowNum) -> rs.getInt("guest_count"), companyId, ecosystemId, orderId, shiftId)
            .stream().findFirst().orElseThrow(() ->
                PosApiException.conflict("Restaurant order is not open for new items."));
        if (guestNumber < 1 || guestNumber > orderGuestCount) {
            throw new IllegalArgumentException("guestNumber must belong to the active restaurant order.");
        }
        var product = jdbcTemplate.query("""
            SELECT product.id, COALESCE(NULLIF(product.sku, ''), product.product_code) AS sku,
                   product.name, product.price, product.inventory_ready,
                   COALESCE(balance.available_quantity, 0) AS available_quantity,
                   COALESCE((
                     SELECT SUM(reserved_item.quantity)
                     FROM pos_restaurant_order_items reserved_item
                     JOIN pos_restaurant_orders reserved_order
                       ON reserved_order.id = reserved_item.order_id
                      AND reserved_order.company_id = reserved_item.company_id
                     JOIN pos_restaurant_ecosystems reserved_ecosystem
                       ON reserved_ecosystem.id = reserved_order.ecosystem_id
                      AND reserved_ecosystem.company_id = reserved_order.company_id
                     WHERE reserved_item.company_id = product.company_id
                       AND reserved_item.product_id = product.id
                       AND reserved_ecosystem.warehouse_id = ?
                       AND reserved_order.settlement_shift_id = ?
                       AND reserved_order.status NOT IN ('PAID', 'CLOSED', 'CANCELLED')
                       AND reserved_item.status NOT IN ('CANCELLED', 'VOIDED')
                   ), 0) AS reserved_quantity
            FROM sales_products product
            LEFT JOIN sales_inventory_balances balance
              ON balance.company_id = product.company_id AND balance.product_id = product.id
             AND balance.warehouse_id = ? AND balance.deleted_at IS NULL
            WHERE product.company_id = ? AND product.id = ? AND product.deleted_at IS NULL
              AND LOWER(product.status) = 'active' AND product.pos_ready = 1
              AND UPPER(product.currency) = UPPER(?)
              AND product.price IS NOT NULL AND product.price >= 0
            FOR UPDATE
            """, (rs, rowNum) -> map("id", rs.getLong("id"), "sku", rs.getString("sku"),
                "name", rs.getString("name"), "price", rs.getBigDecimal("price"),
                "stockTracked", rs.getBoolean("inventory_ready"),
                "availableQuantity", rs.getBigDecimal("available_quantity"),
                "reservedQuantity", rs.getBigDecimal("reserved_quantity")),
                warehouseId, shiftId, warehouseId, companyId, productId, currency)
            .stream().findFirst().orElseThrow(() -> new IllegalArgumentException("Product not found."));
        var normalizedQuantity = quantity.setScale(4, RoundingMode.HALF_UP);
        if (normalizedQuantity.signum() <= 0) {
            throw new IllegalArgumentException("quantity must remain greater than zero at four decimals.");
        }
        if (Boolean.TRUE.equals(product.get("stockTracked"))) {
            var available = (BigDecimal) product.get("availableQuantity");
            var reserved = (BigDecimal) product.get("reservedQuantity");
            if (reserved.add(normalizedQuantity).compareTo(available) > 0) {
                throw PosApiException.conflict(
                    "Requested quantity is not currently available.");
            }
        }
        var price = ((BigDecimal) product.get("price")).setScale(4, RoundingMode.HALF_UP);
        var total = price.multiply(normalizedQuantity).setScale(4, RoundingMode.HALF_UP);
        var id = insertKey("""
            INSERT INTO pos_restaurant_order_items (
                company_id, order_id, product_id, guest_number, kitchen_station_code, sku_snapshot,
                product_name_snapshot, quantity, unit_price, line_total_amount, notes,
                modifier_summary, sort_order
            ) SELECT ?, restaurant_order.id, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
                     COALESCE((SELECT MAX(item.sort_order) + 1 FROM pos_restaurant_order_items item
                               WHERE item.company_id = ? AND item.order_id = restaurant_order.id), 1)
              FROM pos_restaurant_orders restaurant_order
             WHERE restaurant_order.company_id = ? AND restaurant_order.ecosystem_id = ?
               AND restaurant_order.id = ?
               AND restaurant_order.settlement_shift_id = ?
               AND restaurant_order.status IN ('OPEN', 'IN_SERVICE')
            """, companyId, productId, guestNumber, normalizedStation(stationCode), product.get("sku"), product.get("name"),
            normalizedQuantity, price, total, notes, modifiers, companyId, companyId, ecosystemId, orderId, shiftId);
        jdbcTemplate.update("""
            UPDATE pos_restaurant_orders
            SET first_item_at = COALESCE(first_item_at, CURRENT_TIMESTAMP), version = version + 1
            WHERE company_id = ? AND ecosystem_id = ? AND id = ?
              AND settlement_shift_id = ? AND status IN ('OPEN', 'IN_SERVICE')
            """, companyId, ecosystemId, orderId, shiftId);
        recalculateOrder(companyId, orderId);
        return id;
    }

    public int sendRound(
            long companyId, long ecosystemId, long orderId, long shiftId,
            long userCompanyId, long kioskId) {
        var orderAvailable = !jdbcTemplate.query("""
            SELECT id FROM pos_restaurant_orders
            WHERE company_id = ? AND ecosystem_id = ? AND id = ?
              AND settlement_shift_id = ?
              AND status IN ('OPEN', 'IN_SERVICE')
            FOR UPDATE
            """, (rs, rowNum) -> rs.getLong("id"), companyId, ecosystemId, orderId, shiftId).isEmpty();
        if (!orderAvailable) throw PosApiException.conflict("Restaurant order is not open for a new round.");
        var round = jdbcTemplate.queryForObject("""
            SELECT COALESCE(MAX(round_number), 0) + 1 FROM pos_restaurant_order_rounds
            WHERE company_id = ? AND order_id = ?
            """, Integer.class, companyId, orderId);
        var roundId = insertKey("""
            INSERT INTO pos_restaurant_order_rounds (
                company_id, order_id, round_number, sent_by_user_company_id, source_kiosk_id
            ) VALUES (?, ?, ?, ?, ?)
            """, companyId, orderId, round, userCompanyId, kioskId);
        var linked = jdbcTemplate.update("""
            INSERT INTO pos_restaurant_round_items (round_id, order_item_id, company_id)
            SELECT ?, id, company_id FROM pos_restaurant_order_items
            WHERE company_id = ? AND order_id = ? AND status = 'DRAFT'
            """, roundId, companyId, orderId);
        if (linked == 0) throw PosApiException.conflict("Order has no draft items to send.");
        jdbcTemplate.update("""
            UPDATE pos_restaurant_order_items SET status = 'SENT', version = version + 1
            WHERE company_id = ? AND order_id = ? AND status = 'DRAFT'
            """, companyId, orderId);
        jdbcTemplate.update("""
            UPDATE pos_restaurant_orders
            SET status = 'IN_SERVICE',
                first_round_sent_at = COALESCE(first_round_sent_at, CURRENT_TIMESTAMP),
                version = version + 1
            WHERE company_id = ? AND id = ? AND status IN ('OPEN', 'IN_SERVICE')
            """, companyId, orderId);
        return round;
    }

    public boolean updateItemStatus(
            long companyId, long ecosystemId, long shiftId, long itemId,
            String fromStatuses, String toStatus) {
        var changed = jdbcTemplate.update("""
            UPDATE pos_restaurant_order_items item
            JOIN pos_restaurant_orders restaurant_order
              ON restaurant_order.id = item.order_id AND restaurant_order.company_id = item.company_id
            SET item.status = ?, item.version = item.version + 1
            WHERE item.company_id = ? AND item.id = ? AND restaurant_order.ecosystem_id = ?
              AND restaurant_order.settlement_shift_id = ?
              AND FIND_IN_SET(item.status, ?) > 0
            """, toStatus, companyId, itemId, ecosystemId, shiftId, fromStatuses) > 0;
        if (changed) recordServiceMilestone(companyId, ecosystemId, shiftId, itemId, toStatus);
        return changed;
    }

    private void recordServiceMilestone(
            long companyId, long ecosystemId, long shiftId, long itemId, String toStatus) {
        if ("PREPARING".equals(toStatus)) {
            jdbcTemplate.update("""
                UPDATE pos_restaurant_orders restaurant_order
                JOIN pos_restaurant_order_items item
                  ON item.order_id = restaurant_order.id AND item.company_id = restaurant_order.company_id
                SET restaurant_order.kitchen_started_at = COALESCE(
                        restaurant_order.kitchen_started_at, CURRENT_TIMESTAMP),
                    restaurant_order.version = restaurant_order.version + 1
                WHERE restaurant_order.company_id = ? AND restaurant_order.ecosystem_id = ?
                  AND restaurant_order.settlement_shift_id = ? AND item.id = ?
                """, companyId, ecosystemId, shiftId, itemId);
            return;
        }
        if ("READY".equals(toStatus)) {
            jdbcTemplate.update("""
                UPDATE pos_restaurant_orders restaurant_order
                JOIN pos_restaurant_order_items changed_item
                  ON changed_item.order_id = restaurant_order.id
                 AND changed_item.company_id = restaurant_order.company_id
                SET restaurant_order.kitchen_ready_at = COALESCE(
                        restaurant_order.kitchen_ready_at, CURRENT_TIMESTAMP),
                    restaurant_order.version = restaurant_order.version + 1
                WHERE restaurant_order.company_id = ? AND restaurant_order.ecosystem_id = ?
                  AND restaurant_order.settlement_shift_id = ? AND changed_item.id = ?
                  AND NOT EXISTS (
                    SELECT 1 FROM pos_restaurant_order_items pending_item
                    WHERE pending_item.company_id = restaurant_order.company_id
                      AND pending_item.order_id = restaurant_order.id
                      AND pending_item.status IN ('SENT', 'ACKNOWLEDGED', 'PREPARING')
                  )
                """, companyId, ecosystemId, shiftId, itemId);
            return;
        }
        if ("SERVED".equals(toStatus)) {
            jdbcTemplate.update("""
                UPDATE pos_restaurant_orders restaurant_order
                JOIN pos_restaurant_order_items changed_item
                  ON changed_item.order_id = restaurant_order.id
                 AND changed_item.company_id = restaurant_order.company_id
                SET restaurant_order.served_at = COALESCE(
                        restaurant_order.served_at, CURRENT_TIMESTAMP),
                    restaurant_order.version = restaurant_order.version + 1
                WHERE restaurant_order.company_id = ? AND restaurant_order.ecosystem_id = ?
                  AND restaurant_order.settlement_shift_id = ? AND changed_item.id = ?
                  AND NOT EXISTS (
                    SELECT 1 FROM pos_restaurant_order_items pending_item
                    WHERE pending_item.company_id = restaurant_order.company_id
                      AND pending_item.order_id = restaurant_order.id
                      AND pending_item.status NOT IN ('SERVED', 'CANCELLED', 'VOIDED')
                  )
                """, companyId, ecosystemId, shiftId, itemId);
        }
    }

    public long itemOrderId(long companyId, long ecosystemId, long itemId) {
        var value = jdbcTemplate.query("""
            SELECT item.order_id
            FROM pos_restaurant_order_items item
            JOIN pos_restaurant_orders restaurant_order
              ON restaurant_order.id = item.order_id AND restaurant_order.company_id = item.company_id
            WHERE item.company_id = ? AND restaurant_order.ecosystem_id = ? AND item.id = ?
            """, (rs, rowNum) -> rs.getLong("order_id"), companyId, ecosystemId, itemId);
        if (value.isEmpty()) throw new NoSuchElementException("Restaurant item not found.");
        return value.getFirst();
    }

    public boolean requestCheck(long companyId, long ecosystemId, long shiftId, long orderId) {
        var changed = jdbcTemplate.update("""
            UPDATE pos_restaurant_orders SET status = 'READY_FOR_CHECKOUT',
                check_requested_at = CURRENT_TIMESTAMP, version = version + 1
            WHERE company_id = ? AND ecosystem_id = ? AND id = ?
              AND settlement_shift_id = ?
              AND status IN ('OPEN', 'IN_SERVICE', 'CHECK_REQUESTED')
              AND NOT EXISTS (SELECT 1 FROM pos_restaurant_order_items item
                              WHERE item.company_id = pos_restaurant_orders.company_id
                                AND item.order_id = pos_restaurant_orders.id AND item.status = 'DRAFT')
              AND EXISTS (SELECT 1 FROM pos_restaurant_order_items item
                          WHERE item.company_id = pos_restaurant_orders.company_id
                            AND item.order_id = pos_restaurant_orders.id
                            AND item.status NOT IN ('CANCELLED', 'VOIDED'))
            """, companyId, ecosystemId, orderId, shiftId) > 0;
        if (changed) jdbcTemplate.update("""
            UPDATE pos_restaurant_tables restaurant_table
            JOIN pos_restaurant_orders restaurant_order ON restaurant_order.table_id = restaurant_table.id
            SET restaurant_table.operational_status = 'CHECK_REQUESTED', restaurant_table.version = restaurant_table.version + 1
            WHERE restaurant_order.company_id = ? AND restaurant_order.id = ?
            """, companyId, orderId);
        return changed;
    }

    public List<Map<String, Object>> orders(long companyId, long ecosystemId) {
        return queryOrders(companyId, ecosystemId, null);
    }

    public List<Map<String, Object>> ordersForShift(long companyId, long ecosystemId, long shiftId) {
        return queryOrders(companyId, ecosystemId, shiftId);
    }

    private List<Map<String, Object>> queryOrders(long companyId, long ecosystemId, Long shiftId) {
        var sql = """
            SELECT restaurant_order.id, restaurant_order.order_number, restaurant_order.table_id,
                   restaurant_table.name AS table_name, area.name AS area_name,
                   restaurant_order.status, restaurant_order.guest_count,
                   restaurant_order.currency_code, restaurant_order.total_amount,
                   restaurant_order.responsible_user_company_id, restaurant_order.created_at,
                   NULLIF(TRIM(CONCAT_WS(' ', COALESCE(responsible_waiter.first_name, ''),
                       COALESCE(responsible_waiter.last_name, ''))), '') AS responsible_waiter_name,
                   NULLIF(responsible_waiter.user_code, '') AS responsible_waiter_code,
                   restaurant_order.updated_at, restaurant_order.first_item_at,
                   restaurant_order.first_round_sent_at, restaurant_order.kitchen_started_at,
                   restaurant_order.kitchen_ready_at, restaurant_order.served_at,
                   restaurant_order.check_requested_at
            FROM pos_restaurant_orders restaurant_order
            JOIN pos_restaurant_tables restaurant_table
              ON restaurant_table.id = restaurant_order.table_id
             AND restaurant_table.company_id = restaurant_order.company_id
            JOIN pos_restaurant_areas area
              ON area.id = restaurant_table.area_id
             AND area.company_id = restaurant_table.company_id
            LEFT JOIN hr_users responsible_waiter
              ON responsible_waiter.id = restaurant_order.responsible_user_company_id
             AND responsible_waiter.company_id = restaurant_order.company_id
            WHERE restaurant_order.company_id = ? AND restaurant_order.ecosystem_id = ?
              AND restaurant_order.status NOT IN ('CLOSED', 'CANCELLED')
            """ + (shiftId == null ? "" : " AND restaurant_order.settlement_shift_id = ?\n") + """
            ORDER BY restaurant_order.created_at, restaurant_order.id
            """;
        var mapper = (org.springframework.jdbc.core.RowMapper<Map<String, Object>>) (rs, rowNum) -> map(
                "id", rs.getLong("id"), "orderNumber", rs.getString("order_number"),
                "tableId", rs.getLong("table_id"), "tableName", rs.getString("table_name"),
                "areaName", rs.getString("area_name"), "status", rs.getString("status"),
                "guestCount", rs.getInt("guest_count"), "currencyCode", rs.getString("currency_code"),
                "totalAmount", rs.getBigDecimal("total_amount"),
                "responsibleUserCompanyId", nullableLong(rs, "responsible_user_company_id"),
                "responsibleWaiterName", rs.getString("responsible_waiter_name"),
                "responsibleWaiterCode", rs.getString("responsible_waiter_code"),
                "createdAt", instant(rs.getTimestamp("created_at")), "updatedAt", instant(rs.getTimestamp("updated_at")),
                "firstItemAt", instant(rs.getTimestamp("first_item_at")),
                "firstRoundSentAt", instant(rs.getTimestamp("first_round_sent_at")),
                "kitchenStartedAt", instant(rs.getTimestamp("kitchen_started_at")),
                "kitchenReadyAt", instant(rs.getTimestamp("kitchen_ready_at")),
                "servedAt", instant(rs.getTimestamp("served_at")),
                "checkRequestedAt", instant(rs.getTimestamp("check_requested_at")));
        return shiftId == null
            ? jdbcTemplate.query(sql, mapper, companyId, ecosystemId)
            : jdbcTemplate.query(sql, mapper, companyId, ecosystemId, shiftId);
    }

    public List<Map<String, Object>> items(long companyId, long orderId) {
        return jdbcTemplate.query("""
            SELECT item.id, item.product_id, item.guest_number, item.sku_snapshot,
                   item.product_name_snapshot, item.quantity, item.unit_price,
                   item.line_total_amount, item.notes, item.modifier_summary,
                   item.kitchen_station_code, item.status, item.sort_order,
                   item.created_at, item.updated_at,
                   restaurant_round.id AS round_id, restaurant_round.round_number,
                   restaurant_round.sent_at
            FROM pos_restaurant_order_items item
            LEFT JOIN pos_restaurant_round_items round_item
              ON round_item.order_item_id = item.id
             AND round_item.company_id = item.company_id
            LEFT JOIN pos_restaurant_order_rounds restaurant_round
              ON restaurant_round.id = round_item.round_id
             AND restaurant_round.company_id = round_item.company_id
             AND restaurant_round.order_id = item.order_id
            WHERE item.company_id = ? AND item.order_id = ?
            ORDER BY item.sort_order, item.id
            """, (rs, rowNum) -> map(
                "id", rs.getLong("id"), "productId", rs.getLong("product_id"),
                "guestNumber", rs.getInt("guest_number"),
                "sku", rs.getString("sku_snapshot"), "name", rs.getString("product_name_snapshot"),
                "quantity", rs.getBigDecimal("quantity"), "unitPrice", rs.getBigDecimal("unit_price"),
                "lineTotal", rs.getBigDecimal("line_total_amount"), "notes", rs.getString("notes"),
                "modifierSummary", rs.getString("modifier_summary"),
                "kitchenStationCode", rs.getString("kitchen_station_code"),
                "status", rs.getString("status"),
                "roundId", nullableLong(rs, "round_id"),
                "roundNumber", nullableInteger(rs, "round_number"),
                "sentAt", instant(rs.getTimestamp("sent_at")),
                "createdAt", instant(rs.getTimestamp("created_at")),
                "updatedAt", instant(rs.getTimestamp("updated_at"))),
            companyId, orderId);
    }

    public List<Map<String, Object>> kitchenItems(long companyId, long ecosystemId, long shiftId, String station) {
        return jdbcTemplate.query("""
            SELECT item.id, item.order_id, restaurant_order.order_number, restaurant_table.name AS table_name,
                   item.product_name_snapshot, item.quantity, item.guest_number, item.notes, item.modifier_summary,
                   item.kitchen_station_code, item.status, item.created_at, item.updated_at,
                   restaurant_round.id AS round_id, restaurant_round.round_number, restaurant_round.sent_at
            FROM pos_restaurant_order_items item
            JOIN pos_restaurant_orders restaurant_order
              ON restaurant_order.id = item.order_id AND restaurant_order.company_id = item.company_id
            JOIN pos_restaurant_tables restaurant_table
              ON restaurant_table.id = restaurant_order.table_id
             AND restaurant_table.company_id = restaurant_order.company_id
            JOIN pos_restaurant_round_items round_item
              ON round_item.order_item_id = item.id AND round_item.company_id = item.company_id
            JOIN pos_restaurant_order_rounds restaurant_round
              ON restaurant_round.id = round_item.round_id
             AND restaurant_round.company_id = round_item.company_id
            WHERE item.company_id = ? AND restaurant_order.ecosystem_id = ?
              AND restaurant_order.settlement_shift_id = ?
              AND item.status IN ('SENT', 'ACKNOWLEDGED', 'PREPARING', 'READY')
              AND (? = 'ALL' OR item.kitchen_station_code = ?)
            ORDER BY restaurant_round.sent_at, restaurant_round.id, item.sort_order, item.id
            """, (rs, rowNum) -> map(
                "id", rs.getLong("id"), "orderId", rs.getLong("order_id"),
                "orderNumber", rs.getString("order_number"), "tableName", rs.getString("table_name"),
                "name", rs.getString("product_name_snapshot"), "quantity", rs.getBigDecimal("quantity"),
                "guestNumber", rs.getInt("guest_number"),
                "notes", rs.getString("notes"), "modifierSummary", rs.getString("modifier_summary"),
                "kitchenStationCode", rs.getString("kitchen_station_code"), "status", rs.getString("status"),
                "roundId", rs.getLong("round_id"), "roundNumber", rs.getInt("round_number"),
                "sentAt", instant(rs.getTimestamp("sent_at")),
                "createdAt", instant(rs.getTimestamp("created_at")),
                "updatedAt", instant(rs.getTimestamp("updated_at"))), companyId, ecosystemId, shiftId,
            station == null ? "ALL" : station, station == null ? "ALL" : station);
    }

    public List<Map<String, Object>> pendingCheckout(
            long companyId, long registerId, long shiftId, long userId) {
        return jdbcTemplate.query("""
            SELECT restaurant_order.id, restaurant_order.order_number, restaurant_order.currency_code,
                   restaurant_order.total_amount, restaurant_order.guest_count,
                   restaurant_table.name AS table_name, ecosystem.name AS ecosystem_name,
                   restaurant_order.check_requested_at, restaurant_order.status,
                   COUNT(item.id) AS item_count
            FROM pos_restaurant_orders restaurant_order
            JOIN pos_restaurant_tables restaurant_table
              ON restaurant_table.id = restaurant_order.table_id
             AND restaurant_table.company_id = restaurant_order.company_id
            JOIN pos_restaurant_ecosystems ecosystem
              ON ecosystem.id = restaurant_order.ecosystem_id
             AND ecosystem.company_id = restaurant_order.company_id
            JOIN pos_restaurant_order_items item
              ON item.order_id = restaurant_order.id
             AND item.company_id = restaurant_order.company_id
            WHERE restaurant_order.company_id = ? AND restaurant_order.settlement_cash_register_id = ?
              AND restaurant_order.settlement_shift_id = ?
              AND (restaurant_order.status = 'READY_FOR_CHECKOUT'
                   OR (restaurant_order.status = 'CLAIMED_FOR_CHECKOUT'
                       AND restaurant_order.claimed_by_user_id = ?))
              AND item.status NOT IN ('CANCELLED', 'VOIDED')
            GROUP BY restaurant_order.id, restaurant_order.order_number, restaurant_order.currency_code,
                     restaurant_order.total_amount, restaurant_order.guest_count, restaurant_table.name,
                     ecosystem.name, restaurant_order.check_requested_at, restaurant_order.status
            ORDER BY restaurant_order.check_requested_at, restaurant_order.id
            """, (rs, rowNum) -> map(
                "id", rs.getLong("id"), "orderNumber", rs.getString("order_number"),
                "currencyCode", rs.getString("currency_code"), "totalAmount", rs.getBigDecimal("total_amount"),
                "guestCount", rs.getInt("guest_count"), "tableName", rs.getString("table_name"),
                "ecosystemName", rs.getString("ecosystem_name"), "itemCount", rs.getInt("item_count"),
                "status", rs.getString("status"), "createdAt", instant(rs.getTimestamp("check_requested_at"))),
            companyId, registerId, shiftId, userId);
    }

    public boolean claim(long companyId, long orderId, long registerId, long shiftId, long userId) {
        return jdbcTemplate.update("""
            UPDATE pos_restaurant_orders SET status = 'CLAIMED_FOR_CHECKOUT', claimed_by_user_id = ?,
                   claimed_at = CURRENT_TIMESTAMP, version = version + 1
            WHERE company_id = ? AND id = ? AND settlement_cash_register_id = ?
              AND settlement_shift_id = ?
              AND (status = 'READY_FOR_CHECKOUT'
                   OR (status = 'CLAIMED_FOR_CHECKOUT' AND claimed_by_user_id = ?))
            """, userId, companyId, orderId, registerId, shiftId, userId) > 0;
    }

    public boolean release(long companyId, long orderId, long registerId, long shiftId, long userId) {
        return jdbcTemplate.update("""
            UPDATE pos_restaurant_orders SET status = 'READY_FOR_CHECKOUT', claimed_by_user_id = NULL,
                   claimed_at = NULL, version = version + 1
            WHERE company_id = ? AND id = ? AND settlement_cash_register_id = ?
              AND settlement_shift_id = ?
              AND status = 'CLAIMED_FOR_CHECKOUT' AND claimed_by_user_id = ?
            """, companyId, orderId, registerId, shiftId, userId) > 0;
    }

    public Optional<RestaurantCheckoutOrder> lockClaimed(
            long companyId, long orderId, long registerId, long shiftId, long userId) {
        var orders = jdbcTemplate.query("""
            SELECT id, company_id, settlement_cash_register_id, order_number,
                   currency_code, claimed_by_user_id
            FROM pos_restaurant_orders
            WHERE company_id = ? AND id = ? AND settlement_cash_register_id = ?
              AND settlement_shift_id = ?
              AND status = 'CLAIMED_FOR_CHECKOUT' AND claimed_by_user_id = ?
            FOR UPDATE
            """, (rs, rowNum) -> new RestaurantCheckoutOrder(
                rs.getLong("id"), rs.getLong("company_id"), rs.getLong("settlement_cash_register_id"),
                rs.getString("order_number"), rs.getString("currency_code"),
                rs.getLong("claimed_by_user_id"), List.of()),
            companyId, orderId, registerId, shiftId, userId);
        if (orders.isEmpty()) return Optional.empty();
        var order = orders.getFirst();
        var lines = jdbcTemplate.query("""
            SELECT product_id, sku_snapshot, product_name_snapshot, quantity, unit_price, line_total_amount
            FROM pos_restaurant_order_items
            WHERE company_id = ? AND order_id = ? AND status NOT IN ('CANCELLED', 'VOIDED')
            ORDER BY sort_order, id
            """, (rs, rowNum) -> new RestaurantCheckoutLine(
                rs.getLong("product_id"), rs.getString("sku_snapshot"), rs.getString("product_name_snapshot"),
                rs.getBigDecimal("quantity"), rs.getBigDecimal("unit_price"), rs.getBigDecimal("line_total_amount")),
            companyId, orderId);
        return Optional.of(new RestaurantCheckoutOrder(
            order.id(), order.companyId(), order.cashRegisterId(), order.orderNumber(),
            order.currencyCode(), order.claimedByUserId(), List.copyOf(lines)));
    }

    public boolean completeCheckout(
            long companyId, long orderId, long registerId, long shiftId,
            long userId, long ticketId) {
        var changed = jdbcTemplate.update("""
            UPDATE pos_restaurant_orders SET status = 'CLOSED', ticket_id = ?, paid_at = CURRENT_TIMESTAMP,
                   closed_at = CURRENT_TIMESTAMP, version = version + 1
            WHERE company_id = ? AND id = ? AND settlement_cash_register_id = ?
              AND settlement_shift_id = ?
              AND status = 'CLAIMED_FOR_CHECKOUT' AND claimed_by_user_id = ? AND ticket_id IS NULL
            """, ticketId, companyId, orderId, registerId, shiftId, userId) > 0;
        if (changed) jdbcTemplate.update("""
            UPDATE pos_restaurant_tables restaurant_table
            JOIN pos_restaurant_orders restaurant_order
              ON restaurant_order.table_id = restaurant_table.id
             AND restaurant_order.company_id = restaurant_table.company_id
            SET restaurant_table.operational_status = 'AVAILABLE', restaurant_table.version = restaurant_table.version + 1
            WHERE restaurant_order.company_id = ? AND restaurant_order.id = ?
            """, companyId, orderId);
        return changed;
    }

    public long orderEcosystem(long companyId, long orderId) {
        var value = jdbcTemplate.queryForObject(
            "SELECT ecosystem_id FROM pos_restaurant_orders WHERE company_id = ? AND id = ?",
            Long.class, companyId, orderId);
        if (value == null) throw new NoSuchElementException("Restaurant order not found.");
        return value;
    }

    public void event(
            long companyId, long ecosystemId, Long orderId, Long itemId, Long definitionId,
            Long userCompanyId, Long userId, String eventType, String from, String to, String reason) {
        jdbcTemplate.update("""
            INSERT INTO pos_restaurant_order_events (
                event_id, company_id, ecosystem_id, order_id, order_item_id, kiosk_definition_id,
                actor_user_company_id, actor_user_id, event_type, from_status, to_status, reason
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, UUID.randomUUID().toString(), companyId, ecosystemId, orderId, itemId, definitionId,
            userCompanyId, userId, eventType, from, to, reason);
    }

    public List<Map<String, Object>> trace(long companyId, long ecosystemId) {
        return jdbcTemplate.query("""
            SELECT event.id, event.event_type, event.from_status, event.to_status, event.reason,
                   event.order_id, event.order_item_id, event.kiosk_definition_id,
                   event.actor_user_company_id, event.actor_user_id, event.created_at,
                   restaurant_order.order_number, restaurant_table.name AS table_name,
                   ticket.ticket_number
            FROM pos_restaurant_order_events event
            LEFT JOIN pos_restaurant_orders restaurant_order
              ON restaurant_order.id = event.order_id
             AND restaurant_order.company_id = event.company_id
            LEFT JOIN pos_restaurant_tables restaurant_table
              ON restaurant_table.id = restaurant_order.table_id
             AND restaurant_table.company_id = restaurant_order.company_id
            LEFT JOIN pos_tickets ticket
              ON ticket.id = restaurant_order.ticket_id
             AND ticket.company_id = restaurant_order.company_id
            WHERE event.company_id = ? AND event.ecosystem_id = ?
            ORDER BY event.created_at DESC, event.id DESC LIMIT 200
            """, (rs, rowNum) -> map(
                "id", rs.getLong("id"), "eventType", rs.getString("event_type"),
                "fromStatus", rs.getString("from_status"), "toStatus", rs.getString("to_status"),
                "reason", rs.getString("reason"), "orderId", nullableLong(rs, "order_id"),
                "itemId", nullableLong(rs, "order_item_id"),
                "kioskDefinitionId", nullableLong(rs, "kiosk_definition_id"),
                "actorUserCompanyId", nullableLong(rs, "actor_user_company_id"),
                "actorUserId", nullableLong(rs, "actor_user_id"),
                "orderNumber", rs.getString("order_number"), "tableName", rs.getString("table_name"),
                "ticketNumber", rs.getString("ticket_number"), "createdAt", instant(rs.getTimestamp("created_at"))),
            companyId, ecosystemId);
    }

    private void recalculateOrder(long companyId, long orderId) {
        jdbcTemplate.update("""
            UPDATE pos_restaurant_orders restaurant_order
            SET subtotal_amount = COALESCE((SELECT SUM(item.line_total_amount)
                                            FROM pos_restaurant_order_items item
                                            WHERE item.company_id = restaurant_order.company_id
                                              AND item.order_id = restaurant_order.id
                                              AND item.status NOT IN ('CANCELLED', 'VOIDED')), 0),
                total_amount = COALESCE((SELECT SUM(item.line_total_amount)
                                         FROM pos_restaurant_order_items item
                                         WHERE item.company_id = restaurant_order.company_id
                                           AND item.order_id = restaurant_order.id
                                           AND item.status NOT IN ('CANCELLED', 'VOIDED')), 0),
                version = version + 1
            WHERE restaurant_order.company_id = ? AND restaurant_order.id = ?
            """, companyId, orderId);
    }

    private long insertKey(String sql, Object... values) {
        var keys = new GeneratedKeyHolder();
        jdbcTemplate.update(connection -> {
            var statement = connection.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS);
            for (var index = 0; index < values.length; index++) {
                statement.setObject(index + 1, values[index]);
            }
            return statement;
        }, keys);
        if (keys.getKey() == null) throw new IllegalStateException("Database did not return a generated key.");
        return keys.getKey().longValue();
    }

    private Map<String, Object> actions(String status, boolean recoverable) {
        var mutable = List.of("ACTIVE", "DISABLED").contains(status);
        return map("edit", mutable, "access", "ACTIVE".equals(status) && recoverable,
            "copy", mutable && recoverable, "rotate", mutable, "toggle", mutable, "delete", false);
    }

    private String connectionStatus(java.sql.Timestamp lastSeen) {
        if (lastSeen == null) return "NEVER_CONNECTED";
        return lastSeen.toInstant().isAfter(Instant.now().minusSeconds(120)) ? "ONLINE" : "OFFLINE";
    }

    private String normalizedStation(String value) {
        return value == null || value.isBlank() ? "GENERAL" : value.trim().toUpperCase();
    }

    private Object instant(java.sql.Timestamp value) {
        return value == null ? null : value.toInstant().toString();
    }

    private java.sql.Timestamp latest(java.sql.Timestamp... values) {
        java.sql.Timestamp result = null;
        for (var value : values) {
            if (value != null && (result == null || value.after(result))) {
                result = value;
            }
        }
        return result;
    }

    private Long nullableLong(java.sql.ResultSet rs, String column) throws java.sql.SQLException {
        var value = rs.getLong(column);
        return rs.wasNull() ? null : value;
    }

    private Integer nullableInteger(java.sql.ResultSet rs, String column) throws java.sql.SQLException {
        var value = rs.getInt(column);
        return rs.wasNull() ? null : value;
    }

    private String first(String... values) {
        for (var value : values) if (value != null && !value.isBlank()) return value;
        return "";
    }

    private Map<String, Object> map(Object... entries) {
        var result = new LinkedHashMap<String, Object>();
        for (var index = 0; index < entries.length; index += 2) {
            if (entries[index + 1] != null) result.put(String.valueOf(entries[index]), entries[index + 1]);
        }
        return result;
    }
}
