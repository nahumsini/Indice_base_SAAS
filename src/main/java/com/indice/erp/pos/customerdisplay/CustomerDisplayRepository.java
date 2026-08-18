package com.indice.erp.pos.customerdisplay;

import com.indice.erp.pos.PosSqlSupport;
import java.sql.PreparedStatement;
import java.sql.Statement;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.stereotype.Repository;

@Repository
public class CustomerDisplayRepository {

    private final JdbcTemplate jdbcTemplate;

    public CustomerDisplayRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public Optional<CustomerDisplayDeviceRecord> findLatestDeviceForRegister(long companyId, long cashRegisterId) {
        return jdbcTemplate.query(deviceSelect() + """
            WHERE device.company_id = ? AND device.cash_register_id = ? AND device.deleted_at IS NULL
              AND device.status IN ('PENDING', 'ACTIVE')
            ORDER BY device.id DESC LIMIT 1
            """, this::mapDevice, companyId, cashRegisterId).stream().findFirst();
    }

    public Optional<CustomerDisplayDeviceRecord> findDeviceById(long companyId, long deviceId) {
        return jdbcTemplate.query(deviceSelect() + """
            WHERE device.company_id = ? AND device.id = ? AND device.deleted_at IS NULL
            """, this::mapDevice, companyId, deviceId).stream().findFirst();
    }

    public Optional<CustomerDisplayDeviceRecord> findActiveDeviceByTokenHash(String deviceTokenHash) {
        return jdbcTemplate.query(deviceSelect() + """
            WHERE device.device_token_hash = ? AND device.deleted_at IS NULL AND device.status = 'ACTIVE'
            """, this::mapDevice, deviceTokenHash).stream().findFirst();
    }

    public Optional<CustomerDisplayDeviceRecord> findPairableDeviceByCodeHashes(
            String pairingCodeHash,
            String legacyPairingCodeHash) {
        return jdbcTemplate.query(deviceSelect() + """
            WHERE ((device.pairing_hash_version = 2 AND device.pairing_code_hash = ?)
                   OR (device.pairing_hash_version = 1 AND device.pairing_code_hash = ?))
              AND device.deleted_at IS NULL
              AND device.status IN ('PENDING', 'ACTIVE')
              AND device.pairing_code_expires_at > CURRENT_TIMESTAMP
            ORDER BY device.id DESC LIMIT 1
            """, this::mapDevice, pairingCodeHash, legacyPairingCodeHash).stream().findFirst();
    }

    public Optional<CustomerDisplayDeviceRecord> findDeviceByCurrentOrConsumedPairingCodeHashes(
            String pairingCodeHash,
            String legacyPairingCodeHash) {
        return jdbcTemplate.query(deviceSelect() + """
            WHERE device.deleted_at IS NULL AND device.status = 'ACTIVE'
              AND (
                    (((device.pairing_hash_version = 2 AND device.pairing_code_hash = ?)
                      OR (device.pairing_hash_version = 1 AND device.pairing_code_hash = ?))
                     AND device.pairing_code_expires_at > CURRENT_TIMESTAMP)
                    OR
                    (((device.pairing_hash_version = 2 AND device.consumed_pairing_code_hash = ?)
                      OR (device.pairing_hash_version = 1 AND device.consumed_pairing_code_hash = ?))
                     AND device.consumed_pairing_code_expires_at > CURRENT_TIMESTAMP)
                  )
            ORDER BY device.id DESC LIMIT 1
            """, this::mapDevice,
            pairingCodeHash, legacyPairingCodeHash,
            pairingCodeHash, legacyPairingCodeHash).stream().findFirst();
    }

    public boolean existsActivePairingCodeHashes(
            String pairingCodeHash,
            String legacyPairingCodeHash) {
        var count = jdbcTemplate.queryForObject("""
            SELECT COUNT(*) FROM pos_customer_display_devices
            WHERE ((pairing_hash_version = 2 AND pairing_code_hash = ?)
                   OR (pairing_hash_version = 1 AND pairing_code_hash = ?))
              AND deleted_at IS NULL
              AND pairing_code_expires_at > CURRENT_TIMESTAMP
            """, Long.class, pairingCodeHash, legacyPairingCodeHash);
        return count != null && count > 0;
    }

    public boolean existsDeviceTokenHash(String deviceTokenHash) {
        var count = jdbcTemplate.queryForObject("""
            SELECT COUNT(*) FROM pos_customer_display_devices WHERE device_token_hash = ?
            """, Long.class, deviceTokenHash);
        return count != null && count > 0;
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

    public CustomerDisplayDeviceRecord insertDevice(
            long companyId,
            Long unitId,
            Long businessId,
            long warehouseId,
            long cashRegisterId,
            String protectedDeviceToken,
            String deviceTokenHash,
            String deviceTokenHint,
            String protectedPairingCode,
            String pairingCodeHash,
            Instant pairingCodeExpiresAt,
            String name,
            long userId) {
        var keyHolder = new GeneratedKeyHolder();
        jdbcTemplate.update(connection -> {
            var statement = connection.prepareStatement("""
                INSERT INTO pos_customer_display_devices
                (company_id, unit_id, business_id, warehouse_id, cash_register_id,
                 device_token, device_token_hash, device_token_hint,
                 pairing_code, pairing_code_hash, pairing_hash_version, pairing_code_expires_at,
                 name, status, created_by_user_id)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 2, ?, ?, 'ACTIVE', ?)
                """, Statement.RETURN_GENERATED_KEYS);
            statement.setLong(1, companyId);
            statement.setObject(2, unitId);
            statement.setObject(3, businessId);
            statement.setLong(4, warehouseId);
            statement.setLong(5, cashRegisterId);
            statement.setString(6, protectedDeviceToken);
            statement.setString(7, deviceTokenHash);
            statement.setString(8, deviceTokenHint);
            statement.setString(9, protectedPairingCode);
            statement.setString(10, pairingCodeHash);
            statement.setTimestamp(11, Timestamp.from(pairingCodeExpiresAt));
            statement.setString(12, name);
            statement.setLong(13, userId);
            return statement;
        }, keyHolder);
        return findDeviceById(companyId, keyHolder.getKey().longValue()).orElseThrow();
    }

    public CustomerDisplayDeviceRecord updatePairingCode(
            long companyId,
            long deviceId,
            String protectedPairingCode,
            String pairingCodeHash,
            Instant pairingCodeExpiresAt,
            String name,
            long userId) {
        jdbcTemplate.update("""
            UPDATE pos_customer_display_devices
            SET pairing_code = ?, pairing_code_hash = ?, pairing_code_expires_at = ?,
                pairing_hash_version = 2,
                consumed_pairing_code_hash = NULL, consumed_pairing_code_expires_at = NULL,
                name = ?, status = 'ACTIVE',
                updated_by_user_id = ?, version = version + 1
            WHERE company_id = ? AND id = ? AND deleted_at IS NULL
            """, protectedPairingCode, pairingCodeHash, Timestamp.from(pairingCodeExpiresAt),
            name, userId, companyId, deviceId);
        return findDeviceById(companyId, deviceId).orElseThrow();
    }

    public CustomerDisplayDeviceRecord activatePairing(CustomerDisplayDeviceRecord device, String name) {
        jdbcTemplate.update("""
            UPDATE pos_customer_display_devices
            SET name = ?, status = 'ACTIVE', paired_at = COALESCE(paired_at, CURRENT_TIMESTAMP),
                last_seen_at = CURRENT_TIMESTAMP,
                consumed_pairing_code_hash = pairing_code_hash,
                consumed_pairing_code_expires_at = pairing_code_expires_at,
                pairing_code = NULL, pairing_code_expires_at = NULL, pairing_code_hash = NULL,
                version = version + 1
            WHERE id = ? AND deleted_at IS NULL
            """, name, device.id());
        return findDeviceById(device.companyId(), device.id()).orElseThrow();
    }

    public boolean touchDeviceIfStale(long deviceId) {
        return jdbcTemplate.update("""
            UPDATE pos_customer_display_devices
            SET last_seen_at = CURRENT_TIMESTAMP
            WHERE id = ? AND deleted_at IS NULL
              AND (last_seen_at IS NULL OR last_seen_at < CURRENT_TIMESTAMP - INTERVAL 30 SECOND)
            """, deviceId) > 0;
    }

    public boolean claimConnectionAudit(long deviceId) {
        return jdbcTemplate.update("""
            UPDATE pos_customer_display_devices
            SET last_connection_audit_at = CURRENT_TIMESTAMP
            WHERE id = ? AND deleted_at IS NULL
              AND (last_connection_audit_at IS NULL
                   OR last_connection_audit_at < CURRENT_TIMESTAMP - INTERVAL 5 MINUTE)
            """, deviceId) > 0;
    }

    public List<CustomerDisplayDeviceRecord> listDevices(
            long companyId,
            Long unitId,
            Long businessId) {
        return jdbcTemplate.query(deviceSelect() + """
            WHERE device.company_id = ? AND device.deleted_at IS NULL
              AND (? IS NULL OR device.unit_id = ?)
              AND (? IS NULL OR device.business_id = ?)
            ORDER BY device.updated_at DESC, device.id DESC
            """, this::mapDevice, companyId, unitId, unitId, businessId, businessId);
    }

    public void updateStatus(long companyId, long deviceId, String status, long userId) {
        jdbcTemplate.update("""
            UPDATE pos_customer_display_devices
            SET status = ?, pairing_code = NULL, pairing_code_hash = NULL,
                pairing_code_expires_at = NULL, consumed_pairing_code_hash = NULL,
                consumed_pairing_code_expires_at = NULL,
                updated_by_user_id = ?, version = version + 1
            WHERE company_id = ? AND id = ? AND deleted_at IS NULL
            """, status, userId, companyId, deviceId);
    }

    public void updateName(long companyId, long deviceId, String name, long userId) {
        jdbcTemplate.update("""
            UPDATE pos_customer_display_devices
            SET name = ?, updated_by_user_id = ?, version = version + 1
            WHERE company_id = ? AND id = ? AND deleted_at IS NULL
            """, name, userId, companyId, deviceId);
    }

    public void replaceDeviceToken(
            long companyId,
            long deviceId,
            String protectedToken,
            String tokenHash,
            String tokenHint,
            long userId) {
        jdbcTemplate.update(
            """
                UPDATE pos_customer_display_devices
                SET device_token = ?, device_token_hash = ?, device_token_hint = ?,
                    updated_by_user_id = ?, version = version + 1
                WHERE company_id = ? AND id = ? AND deleted_at IS NULL
                  AND status <> 'REVOKED'
                """,
            protectedToken, tokenHash, tokenHint, userId, companyId, deviceId);
    }

    public void delete(long companyId, long deviceId) {
        jdbcTemplate.update("""
            DELETE FROM pos_customer_display_devices
            WHERE company_id = ? AND id = ?
            """, companyId, deviceId);
    }

    public List<CustomerDisplayDeviceRecord> findUnprotectedSecrets(int limit) {
        return jdbcTemplate.query(deviceSelect() + """
            WHERE device.deleted_at IS NULL
              AND (device.device_token NOT LIKE 'enc.v1.%'
                   OR (device.pairing_code IS NOT NULL AND device.pairing_code NOT LIKE 'enc.v1.%')
                   OR (device.pairing_code IS NOT NULL AND device.pairing_hash_version < 2))
            ORDER BY device.id ASC LIMIT ?
            """, this::mapDevice, limit);
    }

    public void protectSecrets(
            long deviceId,
            String expectedDeviceToken,
            String protectedDeviceToken,
            String expectedPairingCode,
            String protectedPairingCode,
            String pairingCodeHash) {
        jdbcTemplate.update("""
            UPDATE pos_customer_display_devices
            SET device_token = ?,
                pairing_code_hash = CASE
                    WHEN ? IS NOT NULL AND pairing_code = ? THEN ? ELSE pairing_code_hash END,
                pairing_hash_version = CASE
                    WHEN ? IS NOT NULL AND pairing_code = ? THEN 2 ELSE pairing_hash_version END,
                pairing_code = CASE
                    WHEN pairing_code <=> ? THEN ? ELSE pairing_code END
            WHERE id = ? AND device_token = ? AND deleted_at IS NULL
            """, protectedDeviceToken,
            expectedPairingCode, expectedPairingCode, pairingCodeHash,
            expectedPairingCode, expectedPairingCode,
            expectedPairingCode, protectedPairingCode,
            deviceId, expectedDeviceToken);
    }

    public Optional<CustomerDisplaySnapshotRecord> findLatestSnapshot(long companyId, long cashRegisterId) {
        return jdbcTemplate.query("""
            SELECT *
            FROM pos_customer_display_snapshots
            WHERE company_id = ? AND cash_register_id = ?
            ORDER BY updated_at DESC, id DESC LIMIT 1
            """, this::mapSnapshot, companyId, cashRegisterId).stream().findFirst();
    }

    public void upsertSnapshot(CustomerDisplaySnapshotRecord snapshot, long updatedByUserId) {
        jdbcTemplate.update(connection -> {
            var statement = connection.prepareStatement("""
                INSERT INTO pos_customer_display_snapshots
                (company_id, unit_id, business_id, warehouse_id, cash_register_id, shift_id,
                 status, currency_code, item_count, subtotal_amount, discount_amount, tax_amount,
                 total_amount, paid_amount, change_amount, balance_amount, ticket_number,
                 customer_message, items_json, payments_json, updated_by_user_id)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE
                  status = VALUES(status),
                  currency_code = VALUES(currency_code),
                  item_count = VALUES(item_count),
                  subtotal_amount = VALUES(subtotal_amount),
                  discount_amount = VALUES(discount_amount),
                  tax_amount = VALUES(tax_amount),
                  total_amount = VALUES(total_amount),
                  paid_amount = VALUES(paid_amount),
                  change_amount = VALUES(change_amount),
                  balance_amount = VALUES(balance_amount),
                  ticket_number = VALUES(ticket_number),
                  customer_message = VALUES(customer_message),
                  items_json = VALUES(items_json),
                  payments_json = VALUES(payments_json),
                  updated_by_user_id = VALUES(updated_by_user_id),
                  updated_at = CURRENT_TIMESTAMP
                """);
            bindSnapshot(statement, snapshot, updatedByUserId);
            return statement;
        });
    }

    private void bindSnapshot(PreparedStatement statement, CustomerDisplaySnapshotRecord snapshot, long updatedByUserId)
            throws java.sql.SQLException {
        statement.setLong(1, snapshot.companyId());
        statement.setObject(2, snapshot.unitId());
        statement.setObject(3, snapshot.businessId());
        statement.setLong(4, snapshot.warehouseId());
        statement.setLong(5, snapshot.cashRegisterId());
        statement.setLong(6, snapshot.shiftId());
        statement.setString(7, snapshot.status());
        statement.setString(8, snapshot.currencyCode());
        statement.setInt(9, snapshot.itemCount());
        statement.setBigDecimal(10, snapshot.subtotalAmount());
        statement.setBigDecimal(11, snapshot.discountAmount());
        statement.setBigDecimal(12, snapshot.taxAmount());
        statement.setBigDecimal(13, snapshot.totalAmount());
        statement.setBigDecimal(14, snapshot.paidAmount());
        statement.setBigDecimal(15, snapshot.changeAmount());
        statement.setBigDecimal(16, snapshot.balanceAmount());
        statement.setString(17, snapshot.ticketNumber());
        statement.setString(18, snapshot.customerMessage());
        statement.setString(19, snapshot.itemsJson());
        statement.setString(20, snapshot.paymentsJson());
        statement.setLong(21, updatedByUserId);
    }

    private String deviceSelect() {
        return """
            SELECT device.*, company.name AS company_name,
                   unit.name AS unit_name, business.name AS business_name,
                   warehouse.name AS warehouse_name,
                   register.code AS cash_register_code, register.name AS cash_register_name
            FROM pos_customer_display_devices device
            JOIN companies company ON company.id = device.company_id
            LEFT JOIN units unit ON unit.id = device.unit_id
              AND (unit.company_id = device.company_id OR unit.company_id IS NULL)
            LEFT JOIN businesses business ON business.id = device.business_id
              AND business.unit_id = device.unit_id
              AND (business.company_id = device.company_id OR business.company_id IS NULL)
            JOIN sales_inventory_warehouses warehouse ON warehouse.id = device.warehouse_id
            JOIN pos_cash_registers register ON register.id = device.cash_register_id
            """;
    }

    private CustomerDisplayDeviceRecord mapDevice(java.sql.ResultSet rs, int rowNum) throws java.sql.SQLException {
        return new CustomerDisplayDeviceRecord(
            rs.getLong("id"),
            rs.getLong("company_id"),
            rs.getString("company_name"),
            PosSqlSupport.nullableLong(rs, "unit_id"),
            rs.getString("unit_name"),
            PosSqlSupport.nullableLong(rs, "business_id"),
            rs.getString("business_name"),
            rs.getLong("warehouse_id"),
            rs.getString("warehouse_name"),
            rs.getLong("cash_register_id"),
            rs.getString("cash_register_code"),
            rs.getString("cash_register_name"),
            rs.getString("device_token"),
            rs.getString("device_token_hash"),
            rs.getString("device_token_hint"),
            rs.getString("pairing_code"),
            rs.getString("pairing_code_hash"),
            rs.getString("consumed_pairing_code_hash"),
            PosSqlSupport.instant(rs, "pairing_code_expires_at"),
            PosSqlSupport.instant(rs, "consumed_pairing_code_expires_at"),
            rs.getString("name"),
            rs.getString("status"),
            PosSqlSupport.instant(rs, "paired_at"),
            PosSqlSupport.instant(rs, "last_seen_at"),
            PosSqlSupport.instant(rs, "last_connection_audit_at"),
            rs.getLong("created_by_user_id"),
            PosSqlSupport.nullableLong(rs, "updated_by_user_id"),
            PosSqlSupport.instant(rs, "created_at"),
            PosSqlSupport.instant(rs, "updated_at"),
            rs.getLong("version"),
            rs.getString("metadata_json")
        );
    }

    private CustomerDisplaySnapshotRecord mapSnapshot(java.sql.ResultSet rs, int rowNum) throws java.sql.SQLException {
        return new CustomerDisplaySnapshotRecord(
            rs.getLong("id"),
            rs.getLong("company_id"),
            PosSqlSupport.nullableLong(rs, "unit_id"),
            PosSqlSupport.nullableLong(rs, "business_id"),
            rs.getLong("warehouse_id"),
            rs.getLong("cash_register_id"),
            rs.getLong("shift_id"),
            rs.getString("status"),
            rs.getString("currency_code"),
            rs.getInt("item_count"),
            rs.getBigDecimal("subtotal_amount"),
            rs.getBigDecimal("discount_amount"),
            rs.getBigDecimal("tax_amount"),
            rs.getBigDecimal("total_amount"),
            rs.getBigDecimal("paid_amount"),
            rs.getBigDecimal("change_amount"),
            rs.getBigDecimal("balance_amount"),
            rs.getString("ticket_number"),
            rs.getString("customer_message"),
            rs.getString("items_json"),
            rs.getString("payments_json"),
            PosSqlSupport.instant(rs, "created_at"),
            PosSqlSupport.instant(rs, "updated_at")
        );
    }
}
