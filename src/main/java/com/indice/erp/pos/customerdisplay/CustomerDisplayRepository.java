package com.indice.erp.pos.customerdisplay;

import com.indice.erp.pos.PosSqlSupport;
import java.sql.PreparedStatement;
import java.sql.Statement;
import java.sql.Timestamp;
import java.time.Instant;
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

    public Optional<CustomerDisplayDeviceRecord> findActiveDeviceByToken(String deviceToken) {
        return jdbcTemplate.query(deviceSelect() + """
            WHERE device.device_token = ? AND device.deleted_at IS NULL AND device.status = 'ACTIVE'
            """, this::mapDevice, deviceToken).stream().findFirst();
    }

    public Optional<CustomerDisplayDeviceRecord> findPairableDeviceByCode(String pairingCode) {
        return jdbcTemplate.query(deviceSelect() + """
            WHERE device.pairing_code = ? AND device.deleted_at IS NULL
              AND device.status IN ('PENDING', 'ACTIVE')
              AND device.pairing_code_expires_at > CURRENT_TIMESTAMP
            ORDER BY device.id DESC LIMIT 1
            """, this::mapDevice, pairingCode).stream().findFirst();
    }

    public boolean existsActivePairingCode(String pairingCode) {
        var count = jdbcTemplate.queryForObject("""
            SELECT COUNT(*) FROM pos_customer_display_devices
            WHERE pairing_code = ? AND deleted_at IS NULL
              AND pairing_code_expires_at > CURRENT_TIMESTAMP
            """, Long.class, pairingCode);
        return count != null && count > 0;
    }

    public boolean existsDeviceToken(String deviceToken) {
        var count = jdbcTemplate.queryForObject("""
            SELECT COUNT(*) FROM pos_customer_display_devices WHERE device_token = ?
            """, Long.class, deviceToken);
        return count != null && count > 0;
    }

    public CustomerDisplayDeviceRecord insertDevice(
            long companyId,
            Long unitId,
            Long businessId,
            long warehouseId,
            long cashRegisterId,
            String deviceToken,
            String pairingCode,
            Instant pairingCodeExpiresAt,
            String name,
            long userId) {
        var keyHolder = new GeneratedKeyHolder();
        jdbcTemplate.update(connection -> {
            var statement = connection.prepareStatement("""
                INSERT INTO pos_customer_display_devices
                (company_id, unit_id, business_id, warehouse_id, cash_register_id, device_token,
                 pairing_code, pairing_code_expires_at, name, status, created_by_user_id)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', ?)
                """, Statement.RETURN_GENERATED_KEYS);
            statement.setLong(1, companyId);
            statement.setObject(2, unitId);
            statement.setObject(3, businessId);
            statement.setLong(4, warehouseId);
            statement.setLong(5, cashRegisterId);
            statement.setString(6, deviceToken);
            statement.setString(7, pairingCode);
            statement.setTimestamp(8, Timestamp.from(pairingCodeExpiresAt));
            statement.setString(9, name);
            statement.setLong(10, userId);
            return statement;
        }, keyHolder);
        return findDeviceById(companyId, keyHolder.getKey().longValue()).orElseThrow();
    }

    public CustomerDisplayDeviceRecord updatePairingCode(
            long companyId,
            long deviceId,
            String pairingCode,
            Instant pairingCodeExpiresAt,
            String name,
            long userId) {
        jdbcTemplate.update("""
            UPDATE pos_customer_display_devices
            SET pairing_code = ?, pairing_code_expires_at = ?, name = ?, status = 'ACTIVE',
                updated_by_user_id = ?, version = version + 1
            WHERE company_id = ? AND id = ? AND deleted_at IS NULL
            """, pairingCode, Timestamp.from(pairingCodeExpiresAt), name, userId, companyId, deviceId);
        return findDeviceById(companyId, deviceId).orElseThrow();
    }

    public CustomerDisplayDeviceRecord activatePairing(CustomerDisplayDeviceRecord device, String name) {
        jdbcTemplate.update("""
            UPDATE pos_customer_display_devices
            SET name = ?, status = 'ACTIVE', paired_at = COALESCE(paired_at, CURRENT_TIMESTAMP),
                last_seen_at = CURRENT_TIMESTAMP, pairing_code = NULL, pairing_code_expires_at = NULL,
                version = version + 1
            WHERE id = ? AND deleted_at IS NULL
            """, name, device.id());
        return findActiveDeviceByToken(device.deviceToken()).orElseThrow();
    }

    public void touchDevice(long deviceId) {
        jdbcTemplate.update("""
            UPDATE pos_customer_display_devices
            SET last_seen_at = CURRENT_TIMESTAMP
            WHERE id = ? AND deleted_at IS NULL
            """, deviceId);
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
            SELECT device.*, register.code AS cash_register_code, register.name AS cash_register_name
            FROM pos_customer_display_devices device
            JOIN pos_cash_registers register ON register.id = device.cash_register_id
            """;
    }

    private CustomerDisplayDeviceRecord mapDevice(java.sql.ResultSet rs, int rowNum) throws java.sql.SQLException {
        return new CustomerDisplayDeviceRecord(
            rs.getLong("id"),
            rs.getLong("company_id"),
            PosSqlSupport.nullableLong(rs, "unit_id"),
            PosSqlSupport.nullableLong(rs, "business_id"),
            rs.getLong("warehouse_id"),
            rs.getLong("cash_register_id"),
            rs.getString("cash_register_code"),
            rs.getString("cash_register_name"),
            rs.getString("device_token"),
            rs.getString("pairing_code"),
            PosSqlSupport.instant(rs, "pairing_code_expires_at"),
            rs.getString("name"),
            rs.getString("status"),
            PosSqlSupport.instant(rs, "paired_at"),
            PosSqlSupport.instant(rs, "last_seen_at"),
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
