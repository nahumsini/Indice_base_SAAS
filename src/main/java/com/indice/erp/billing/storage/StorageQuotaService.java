package com.indice.erp.billing.storage;

import com.indice.erp.billing.BillingHashing;
import com.indice.erp.storage.ObjectStorageService;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.sql.Timestamp;
import java.time.Clock;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class StorageQuotaService {

    private final JdbcTemplate jdbcTemplate;
    private final StorageQuotaProperties properties;
    private final ObjectStorageService objectStorage;
    private final ObjectMapper objectMapper;
    private final Clock clock;

    public StorageQuotaService(JdbcTemplate jdbcTemplate, StorageQuotaProperties properties,
                               ObjectStorageService objectStorage, ObjectMapper objectMapper, Clock clock) {
        this.jdbcTemplate = jdbcTemplate;
        this.properties = properties;
        this.objectStorage = objectStorage;
        this.objectMapper = objectMapper;
        this.clock = clock;
    }

    @Transactional
    public void initializeCompany(long companyId) {
        jdbcTemplate.update(
            """
                INSERT INTO company_storage_states (company_id, included_bytes)
                VALUES (?, ?)
                ON DUPLICATE KEY UPDATE included_bytes = GREATEST(included_bytes, VALUES(included_bytes))
                """,
            companyId,
            properties.getIncludedBytes()
        );
    }

    @Transactional
    public Reservation reserve(long companyId, String ownerModule, String bucketName,
                               String objectKey, long declaredBytes) {
        if (declaredBytes <= 0 || objectKey == null || objectKey.isBlank()) {
            throw new IllegalArgumentException("A positive file size and object key are required.");
        }
        var state = lockState(companyId);
        if (state == null) return Reservation.unmetered(objectKey);
        expireLocked(companyId);

        var existing = findObjectForUpdate(companyId, objectKey);
        if (existing != null) {
            if (existing.declaredBytes() != declaredBytes) {
                throw new IllegalStateException("The storage reservation does not match the requested file size.");
            }
            if ("RESERVED".equals(existing.status()) || "COMMITTED".equals(existing.status())) {
                return new Reservation(existing.id(), objectKey, true, "COMMITTED".equals(existing.status()));
            }
            throw new IllegalStateException("This object key can no longer be reused.");
        }

        var snapshot = snapshotLocked(companyId);
        ensureAutomaticCapacity(companyId, snapshot, saturatingAdd(snapshot.usedAndReservedBytes(), declaredBytes));
        var hash = BillingHashing.sha256("storage:" + companyId + ":" + objectKey);
        jdbcTemplate.update(
            """
                INSERT INTO company_storage_objects (
                    company_id, owner_module, bucket_name, object_key, declared_size_bytes,
                    status, idempotency_key_hash, expires_at
                ) VALUES (?, ?, ?, ?, ?, 'RESERVED', ?, ?)
                """,
            companyId,
            normalizeOwner(ownerModule),
            bucketName == null ? "" : bucketName.trim(),
            objectKey.trim(),
            declaredBytes,
            hash,
            Timestamp.from(clock.instant().plus(properties.reservationTtl()))
        );
        var id = jdbcTemplate.queryForObject("SELECT LAST_INSERT_ID()", Long.class);
        jdbcTemplate.update(
            "UPDATE company_storage_states SET reserved_bytes = reserved_bytes + ?, version = version + 1 WHERE company_id = ?",
            declaredBytes,
            companyId
        );
        event(companyId, id, "RESERVED", declaredBytes, Map.of("owner_module", normalizeOwner(ownerModule)));
        return new Reservation(id == null ? 0 : id, objectKey, true, false);
    }

    @Transactional
    public CommitResult commitStoredObject(long companyId, String bucketName, String objectKey,
                                           long expectedBytes) {
        return commitStoredObject(companyId, bucketName, objectKey, objectKey, expectedBytes);
    }

    @Transactional
    public CommitResult commitStoredObject(long companyId, String bucketName, String reservationObjectKey,
                                           String storedObjectKey, long expectedBytes) {
        var state = lockState(companyId);
        if (state == null) return CommitResult.unmetered(storedObjectKey, expectedBytes);
        var object = findObjectForUpdate(companyId, reservationObjectKey);
        if (object == null) {
            throw new IllegalStateException("The storage reservation is missing or expired.");
        }
        if ("COMMITTED".equals(object.status())) {
            if (!reservationObjectKey.equals(storedObjectKey)) {
                if (!objectStorage.objectExists(bucketName, storedObjectKey)) {
                    throw new IllegalArgumentException("The moved object was not found in storage.");
                }
                var metadata = objectStorage.objectMetadata(bucketName, storedObjectKey);
                if (metadata.sizeBytes() != object.actualBytes()
                        || (expectedBytes > 0 && metadata.sizeBytes() != expectedBytes)) {
                    throw new IllegalArgumentException("The moved file size does not match its committed reservation.");
                }
                jdbcTemplate.update(
                    "UPDATE company_storage_objects SET object_key = ? WHERE id = ? AND object_key = ?",
                    storedObjectKey, object.id(), reservationObjectKey);
                event(companyId, object.id(), "MOVED", 0,
                    Map.of("from", reservationObjectKey, "to", storedObjectKey));
            }
            return new CommitResult(object.id(), storedObjectKey, object.actualBytes(), true);
        }
        if (!"RESERVED".equals(object.status()) || object.expiresAt() == null
                || !object.expiresAt().toInstant().isAfter(clock.instant())) {
            throw new IllegalStateException("The storage reservation is no longer active.");
        }
        if (!objectStorage.objectExists(bucketName, storedObjectKey)) {
            throw new IllegalArgumentException("The uploaded object was not found in storage.");
        }
        var metadata = objectStorage.objectMetadata(bucketName, storedObjectKey);
        var actualBytes = metadata.sizeBytes();
        if (actualBytes <= 0 || expectedBytes <= 0 || actualBytes != expectedBytes
                || object.declaredBytes() != expectedBytes) {
            throw new IllegalArgumentException("The uploaded file size does not match its approved reservation.");
        }
        var snapshot = snapshotLocked(companyId);
        var projected = saturatingAdd(
            Math.max(0, snapshot.usedAndReservedBytes() - object.declaredBytes()), actualBytes);
        ensureAutomaticCapacity(companyId, snapshot, projected);
        jdbcTemplate.update(
            """
                UPDATE company_storage_objects
                SET status = 'COMMITTED', object_key = ?, actual_size_bytes = ?,
                    committed_at = CURRENT_TIMESTAMP(6), expires_at = NULL
                WHERE id = ? AND status = 'RESERVED'
                """,
            storedObjectKey,
            actualBytes,
            object.id()
        );
        jdbcTemplate.update(
            """
                UPDATE company_storage_states
                SET reserved_bytes = GREATEST(0, reserved_bytes - ?),
                    used_bytes = used_bytes + ?, version = version + 1
                WHERE company_id = ?
                """,
            object.declaredBytes(),
            actualBytes,
            companyId
        );
        event(companyId, object.id(), "COMMITTED", actualBytes, Map.of());
        return new CommitResult(object.id(), storedObjectKey, actualBytes, true);
    }

    @Transactional
    public void release(long companyId, String objectKey, String reason) {
        if (lockState(companyId) == null) return;
        var object = findObjectForUpdate(companyId, objectKey);
        if (object == null || "RELEASED".equals(object.status()) || "EXPIRED".equals(object.status())) return;
        var bytes = "COMMITTED".equals(object.status()) ? object.actualBytes() : object.declaredBytes();
        if ("COMMITTED".equals(object.status())) {
            jdbcTemplate.update(
                "UPDATE company_storage_states SET used_bytes = GREATEST(0, used_bytes - ?), version = version + 1 WHERE company_id = ?",
                bytes, companyId);
        } else {
            jdbcTemplate.update(
                "UPDATE company_storage_states SET reserved_bytes = GREATEST(0, reserved_bytes - ?), version = version + 1 WHERE company_id = ?",
                bytes, companyId);
        }
        jdbcTemplate.update(
            "UPDATE company_storage_objects SET status = 'RELEASED', released_at = CURRENT_TIMESTAMP(6), expires_at = NULL WHERE id = ?",
            object.id()
        );
        event(companyId, object.id(), "RELEASED", -bytes,
            Map.of("reason", reason == null || reason.isBlank() ? "released" : reason.trim()));
    }

    @Transactional(readOnly = true)
    public StorageSnapshot snapshot(long companyId) {
        var exists = jdbcTemplate.query(
            "SELECT company_id FROM company_storage_states WHERE company_id = ?",
            (rs, rowNum) -> rs.getLong(1), companyId);
        return exists.isEmpty() ? StorageSnapshot.unmetered(companyId) : snapshotLocked(companyId);
    }

    public java.time.Duration reservationTtl() {
        return properties.reservationTtl();
    }

    @Scheduled(fixedDelayString = "${app.billing.storage.cleanup-delay-ms:300000}")
    @Transactional
    public int expireReservations() {
        var companies = jdbcTemplate.query(
            """
                SELECT DISTINCT company_id
                FROM company_storage_objects
                WHERE status = 'RESERVED' AND expires_at <= CURRENT_TIMESTAMP(6)
                ORDER BY company_id
                LIMIT ?
                """,
            (rs, rowNum) -> rs.getLong("company_id"),
            properties.getCleanupBatchSize()
        );
        var expiredCount = 0;
        for (var companyId : companies) {
            // Keep the same lock order used by reserve/commit/release: state first, objects second.
            // This avoids a scheduler/upload deadlock under concurrent kiosk traffic.
            if (lockState(companyId) != null) {
                expiredCount += expireLocked(companyId);
            }
        }
        return expiredCount;
    }

    private State lockState(long companyId) {
        return jdbcTemplate.query(
            "SELECT included_bytes, purchased_blocks FROM company_storage_states WHERE company_id = ? FOR UPDATE",
            (rs, rowNum) -> new State(rs.getLong(1), rs.getInt(2)), companyId
        ).stream().findFirst().orElse(null);
    }

    private StorageObject findObjectForUpdate(long companyId, String objectKey) {
        return jdbcTemplate.query(
            """
                SELECT id, status, declared_size_bytes, COALESCE(actual_size_bytes, declared_size_bytes) actual_size_bytes, expires_at
                FROM company_storage_objects WHERE company_id = ? AND object_key = ? FOR UPDATE
                """,
            (rs, rowNum) -> new StorageObject(rs.getLong("id"), rs.getString("status"),
                rs.getLong("declared_size_bytes"), rs.getLong("actual_size_bytes"), rs.getTimestamp("expires_at")),
            companyId, objectKey
        ).stream().findFirst().orElse(null);
    }

    private int expireLocked(long companyId) {
        var expired = jdbcTemplate.query(
            """
                SELECT id, company_id, bucket_name, object_key, declared_size_bytes
                FROM company_storage_objects
                WHERE company_id = ? AND status = 'RESERVED' AND expires_at <= CURRENT_TIMESTAMP(6)
                ORDER BY id
                FOR UPDATE
                """,
            (rs, rowNum) -> new ExpiredObject(rs.getLong("id"), rs.getLong("company_id"),
                rs.getString("bucket_name"), rs.getString("object_key"), rs.getLong("declared_size_bytes")),
            companyId);
        for (var object : expired) {
            deleteQuietly(object.bucketName(), object.objectKey());
            jdbcTemplate.update(
                "UPDATE company_storage_objects SET status = 'EXPIRED', released_at = CURRENT_TIMESTAMP(6), expires_at = NULL WHERE id = ? AND status = 'RESERVED'",
                object.id());
            jdbcTemplate.update(
                "UPDATE company_storage_states SET reserved_bytes = GREATEST(0, reserved_bytes - ?), version = version + 1 WHERE company_id = ?",
                object.declaredBytes(), companyId);
            event(companyId, object.id(), "EXPIRED", -object.declaredBytes(), Map.of());
        }
        return expired.size();
    }

    private StorageSnapshot snapshotLocked(long companyId) {
        return jdbcTemplate.queryForObject(
            """
                SELECT state.included_bytes, state.purchased_blocks, state.used_bytes, state.reserved_bytes,
                       (SELECT COALESCE(SUM(benefit.quantity), 0)
                          FROM company_benefit_grants benefit
                         WHERE benefit.company_id = state.company_id
                           AND benefit.benefit_type = 'STORAGE' AND benefit.status = 'ACTIVE'
                           AND benefit.starts_at <= CURRENT_TIMESTAMP(6)
                           AND (benefit.ends_at IS NULL OR benefit.ends_at > CURRENT_TIMESTAMP(6))) benefit_blocks
                FROM company_storage_states state WHERE state.company_id = ?
                """,
            (rs, rowNum) -> new StorageSnapshot(companyId, properties.isEnforcementEnabled(), true,
                rs.getLong("included_bytes"), properties.getBlockBytes(), rs.getInt("purchased_blocks"),
                rs.getInt("benefit_blocks"), rs.getLong("used_bytes"), rs.getLong("reserved_bytes")),
            companyId
        );
    }

    private void ensureAutomaticCapacity(long companyId, StorageSnapshot snapshot, long projectedBytes) {
        if (!properties.isEnforcementEnabled() || projectedBytes <= snapshot.limitBytes()) return;
        var benefitCapacity = saturatingMultiply(snapshot.blockBytes(), snapshot.benefitBlocks());
        var includedAndBenefits = saturatingAdd(snapshot.includedBytes(), benefitCapacity);
        var billableBytes = Math.max(0, projectedBytes - includedAndBenefits);
        var requiredBlocks = ceilingDivision(billableBytes, snapshot.blockBytes());
        if (requiredBlocks > 100_000) {
            throw new IllegalStateException("The storage request exceeds the supported automatic billing range.");
        }
        var targetBlocks = (int) Math.max(snapshot.purchasedBlocks(), requiredBlocks);
        if (targetBlocks <= snapshot.purchasedBlocks()) return;
        jdbcTemplate.update(
            "UPDATE company_storage_states SET purchased_blocks = ?, version = version + 1 WHERE company_id = ?",
            targetBlocks,
            companyId
        );
        jdbcTemplate.update(
            """
                INSERT INTO company_storage_overage_syncs (
                    company_id, public_reference, target_blocks, synced_blocks, status, next_attempt_at
                ) VALUES (?, ?, ?, 0, 'PENDING', CURRENT_TIMESTAMP(6))
                ON DUPLICATE KEY UPDATE
                    target_blocks = GREATEST(target_blocks, VALUES(target_blocks)),
                    status = CASE
                        WHEN synced_blocks >= GREATEST(target_blocks, VALUES(target_blocks)) THEN 'SYNCED'
                        ELSE 'PENDING'
                    END,
                    next_attempt_at = CURRENT_TIMESTAMP(6),
                    last_error_code = NULL,
                    last_error_message = NULL
                """,
            companyId,
            UUID.randomUUID().toString().replace("-", ""),
            targetBlocks
        );
        event(companyId, null, "AUTOMATIC_BLOCKS_ADDED", 0, Map.of(
            "prior_blocks", snapshot.purchasedBlocks(),
            "target_blocks", targetBlocks,
            "block_bytes", snapshot.blockBytes(),
            "billing_timing", "NEXT_INVOICE"
        ));
    }

    private long ceilingDivision(long numerator, long denominator) {
        if (numerator <= 0) return 0;
        return 1 + ((numerator - 1) / denominator);
    }

    private long saturatingMultiply(long value, long multiplier) {
        try { return Math.multiplyExact(value, multiplier); }
        catch (ArithmeticException ignored) { return Long.MAX_VALUE; }
    }

    private void event(long companyId, Long objectId, String type, long delta, Map<String, ?> detail) {
        jdbcTemplate.update(
            """
                INSERT INTO company_storage_events
                    (public_reference, company_id, storage_object_id, event_type, bytes_delta, detail_json)
                VALUES (?, ?, ?, ?, ?, CAST(? AS JSON))
                """,
            UUID.randomUUID().toString().replace("-", ""), companyId, objectId, type, delta, json(detail));
    }

    private String json(Map<String, ?> values) {
        if (values == null || values.isEmpty()) return "{}";
        var normalized = new LinkedHashMap<String, Object>();
        values.forEach(normalized::put);
        try {
            return objectMapper.writeValueAsString(normalized);
        } catch (Exception exception) {
            return "{}";
        }
    }

    private void deleteQuietly(String bucketName, String objectKey) {
        if (!objectStorage.isEnabled() || bucketName == null || bucketName.isBlank()
                || "LEGACY".equals(bucketName)) return;
        try {
            if (objectStorage.objectExists(bucketName, objectKey)) objectStorage.deleteObject(bucketName, objectKey);
        } catch (RuntimeException ignored) {
            // Expiration must release reserved capacity even when orphan cleanup needs a later storage sweep.
        }
    }

    private String normalizeOwner(String owner) {
        return owner == null || owner.isBlank() ? "UNKNOWN" : owner.trim().toUpperCase(java.util.Locale.ROOT);
    }

    private long saturatingAdd(long left, long right) {
        try { return Math.addExact(left, right); }
        catch (ArithmeticException ignored) { return Long.MAX_VALUE; }
    }

    private record State(long includedBytes, int purchasedBlocks) {}
    private record StorageObject(long id, String status, long declaredBytes, long actualBytes, Timestamp expiresAt) {}
    private record ExpiredObject(long id, long companyId, String bucketName, String objectKey, long declaredBytes) {}

    public record Reservation(long id, String objectKey, boolean metered, boolean committed) {
        static Reservation unmetered(String objectKey) { return new Reservation(0, objectKey, false, false); }
    }

    public record CommitResult(long id, String objectKey, long actualBytes, boolean metered) {
        static CommitResult unmetered(String objectKey, long bytes) { return new CommitResult(0, objectKey, bytes, false); }
    }

    public record StorageSnapshot(long companyId, boolean enforced, boolean metered,
                                  long includedBytes, long blockBytes, int purchasedBlocks,
                                  int benefitBlocks, long usedBytes, long reservedBytes) {
        public long limitBytes() {
            if (!metered) return Long.MAX_VALUE;
            try {
                return Math.addExact(includedBytes,
                    Math.multiplyExact(blockBytes, (long) purchasedBlocks + benefitBlocks));
            } catch (ArithmeticException ignored) { return Long.MAX_VALUE; }
        }
        public long usedAndReservedBytes() {
            try { return Math.addExact(usedBytes, reservedBytes); }
            catch (ArithmeticException ignored) { return Long.MAX_VALUE; }
        }
        public long availableBytes() { return metered ? Math.max(0, limitBytes() - usedAndReservedBytes()) : Long.MAX_VALUE; }
        static StorageSnapshot unmetered(long companyId) {
            return new StorageSnapshot(companyId, false, false, 0, StorageQuotaProperties.FIVE_GIB, 0, 0, 0, 0);
        }
    }
}
