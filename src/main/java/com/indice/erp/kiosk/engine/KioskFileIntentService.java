package com.indice.erp.kiosk.engine;

import com.indice.erp.storage.ObjectStorageProperties;
import com.indice.erp.storage.ObjectStorageService;
import java.sql.Timestamp;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import org.slf4j.MDC;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

@Service
public class KioskFileIntentService {

    private final JdbcTemplate jdbcTemplate;
    private final ObjectStorageService objectStorage;
    private final ObjectStorageProperties storageProperties;
    private final KioskFileRejectionService rejections;

    public KioskFileIntentService(
            JdbcTemplate jdbcTemplate,
            ObjectStorageService objectStorage,
            ObjectStorageProperties storageProperties,
            KioskFileRejectionService rejections) {
        this.jdbcTemplate = jdbcTemplate;
        this.objectStorage = objectStorage;
        this.storageProperties = storageProperties;
        this.rejections = rejections;
    }

    public void validateTechnicalPolicy(
            KioskExecutionContext context,
            KioskActionRequest request,
            KioskCapabilityDescriptor capability) {
        if (capability.filePolicy().isEmpty()) {
            return;
        }
        var fileName = text(request.payload(),
            "original_filename", "originalFilename", "file_name", "fileName");
        var mimeType = text(request.payload(),
            "mime_type", "mimeType", "content_type", "contentType").toLowerCase();
        var size = number(request.payload(), "size_bytes", "sizeBytes");
        if (fileName.isBlank() || fileName.length() > 255 || size == null || size <= 0) {
            throw new IllegalArgumentException("File name and size are required.");
        }
        var maxSize = longPolicy(capability.filePolicy(), "maxSizeBytes", 10L * 1024L * 1024L);
        if (size > maxSize) {
            throw new IllegalArgumentException("File exceeds the allowed size.");
        }
        var mimeTypes = capability.filePolicy().get("mimeTypes");
        if (!(mimeTypes instanceof List<?> allowed)
                || allowed.stream().map(String::valueOf).noneMatch(mimeType::equalsIgnoreCase)) {
            throw new IllegalArgumentException("File type is not allowed.");
        }
        if (mimeType.startsWith("audio/") || mimeType.startsWith("video/")) {
            throw new IllegalArgumentException("Audio and video are not supported.");
        }
        var extensions = capability.filePolicy().get("extensions");
        var lowerName = fileName.toLowerCase(Locale.ROOT);
        if (!(extensions instanceof List<?> allowedExtensions)
                || allowedExtensions.stream().map(String::valueOf)
                    .noneMatch(extension -> lowerName.endsWith(extension.toLowerCase(Locale.ROOT)))) {
            throw new IllegalArgumentException("File extension is not allowed.");
        }
        if (!extensionMatchesMime(lowerName, mimeType)) {
            throw new IllegalArgumentException("File extension does not match its content type.");
        }
        if (capability.key().endsWith(".register")) {
            requirePending(context, request, capability);
        }
    }

    @Transactional
    public void captureOutcome(
            KioskExecutionContext context,
            KioskActionRequest request,
            KioskCapabilityDescriptor capability,
            Map<String, Object> response) {
        if (capability.filePolicy().isEmpty()) {
            return;
        }
        if (capability.key().endsWith(".presign")) {
            recordPresign(context, request, capability, response);
        } else if (capability.key().endsWith(".register")) {
            if (booleanPolicy(capability.filePolicy(), "sealOnRegister", false)) {
                sealAndAdopt(context, request, capability, response);
            } else {
                adopt(context, request, capability,
                    text(request.payload(), "object_key", "objectKey"));
            }
        }
    }

    private void recordPresign(
            KioskExecutionContext context,
            KioskActionRequest request,
            KioskCapabilityDescriptor capability,
            Map<String, Object> response) {
        var maxFiles = (int) longPolicy(capability.filePolicy(), "maxFiles", 5);
        var countAdopted = booleanPolicy(capability.filePolicy(), "countAdopted", true);
        // Serialize reservations for the same authenticated session so COUNT + INSERT
        // cannot overbook the capability's maxFiles limit.
        jdbcTemplate.queryForObject(
            "SELECT session_id FROM kiosk_sessions WHERE session_id = ? FOR UPDATE",
            String.class, context.session().sessionId());
        var accepted = jdbcTemplate.queryForObject(
            """
                SELECT COUNT(*) FROM kiosk_file_intents
                WHERE kiosk_definition_id = ? AND session_id = ? AND module_reference = ?
                  AND ((? = 1 AND status = 'ADOPTED')
                       OR (status = 'PENDING' AND expires_at > CURRENT_TIMESTAMP))
                """,
            Integer.class,
            context.definition().id(), context.session().sessionId(), moduleReference(request),
            countAdopted ? 1 : 0
        );
        if (accepted != null && accepted >= maxFiles) {
            audit(context, capability, "KIOSK_FILE_REJECTED", "FAILED", "pending-limit");
            throw new IllegalArgumentException("Maximum number of pending files reached.");
        }
        var objectKey = text(response, "object_key", "objectKey");
        if (objectKey.isBlank()) {
            throw new IllegalStateException("Module did not return an object key for the file intent.");
        }
        var expiresAt = instant(response.get("expires_at"));
        if (expiresAt == null) {
            expiresAt = Instant.now().plus(15, ChronoUnit.MINUTES);
        }
        var intentId = UUID.randomUUID().toString();
        var responseBucket = text(response, "bucket_name", "bucketName");
        var bucketName = responseBucket.isBlank()
            ? storageProperties.getMinio().getBucketDocuments()
            : responseBucket;
        jdbcTemplate.update(
            """
                INSERT INTO kiosk_file_intents (
                    intent_id, kiosk_definition_id, company_id, owner_module, session_id, action_id,
                    capability_key, module_reference, bucket_name, object_key,
                    staging_object_key, original_filename, mime_type, size_bytes, status, expires_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', ?)
                """,
            intentId, context.definition().id(), context.definition().companyId(),
            context.ownerModule(), context.session().sessionId(), MDC.get("actionId"), capability.versionedKey(),
            moduleReference(request), bucketName, objectKey, objectKey,
            text(request.payload(), "original_filename", "originalFilename", "file_name", "fileName"),
            text(request.payload(), "mime_type", "mimeType", "content_type", "contentType").toLowerCase(),
            number(request.payload(), "size_bytes", "sizeBytes"), Timestamp.from(expiresAt)
        );
        audit(context, capability, "KIOSK_FILE_PRESIGNED", "SUCCEEDED", objectKey);
    }

    private void requirePending(
            KioskExecutionContext context,
            KioskActionRequest request,
            KioskCapabilityDescriptor capability) {
        var intents = jdbcTemplate.query(
            """
                SELECT bucket_name, original_filename, mime_type, size_bytes
                FROM kiosk_file_intents
                WHERE kiosk_definition_id = ? AND session_id = ? AND module_reference = ?
                  AND object_key = ? AND status = 'PENDING' AND expires_at > CURRENT_TIMESTAMP
                  AND original_filename = ? AND LOWER(mime_type) = LOWER(?) AND size_bytes = ?
                LIMIT 1
                """,
            (rs, rowNum) -> new PendingIntent(
                rs.getString("bucket_name"), rs.getString("original_filename"),
                rs.getString("mime_type"), rs.getLong("size_bytes")),
            context.definition().id(), context.session().sessionId(), moduleReference(request),
            text(request.payload(), "object_key", "objectKey"),
            text(request.payload(), "original_filename", "originalFilename", "file_name", "fileName"),
            text(request.payload(), "mime_type", "mimeType", "content_type", "contentType"),
            number(request.payload(), "size_bytes", "sizeBytes")
        );
        if (intents.isEmpty()) {
            audit(context, capability,
                "KIOSK_FILE_REJECTED", "FAILED", text(request.payload(), "object_key", "objectKey"));
            throw new SecurityException("File intent is missing, expired, or belongs to another session.");
        }
        var intent = intents.getFirst();
        var objectKey = text(request.payload(), "object_key", "objectKey");
        if (!booleanPolicy(capability.filePolicy(), "sealOnRegister", false)
                && !storedObjectMatches(intent, objectKey)) {
            rejectPending(context, request, capability, intent.bucketName(), objectKey, objectKey,
                "Uploaded file does not match the approved intent.");
        }
    }

    private void rejectPending(
            KioskExecutionContext context,
            KioskActionRequest request,
            KioskCapabilityDescriptor capability,
            String bucketName,
            String intentObjectKey,
            String storedObjectKey,
            String message) {
        rejections.reject(
            context, capability.versionedKey(), moduleReference(request),
            intentObjectKey, storedObjectKey);
        try {
            objectStorage.deleteObject(bucketName, storedObjectKey);
            if (!storedObjectKey.equals(intentObjectKey)) {
                objectStorage.deleteObject(bucketName, intentObjectKey);
            }
        } catch (RuntimeException ignored) {
            // The rejected intent remains auditable even if storage cleanup must be retried.
        }
        throw new IllegalArgumentException(message);
    }

    private boolean storedObjectMatches(PendingIntent intent, String objectKey) {
        var metadata = objectStorage.objectMetadata(intent.bucketName(), objectKey);
        var actualType = metadata.contentType() == null ? "" : metadata.contentType().trim();
        if (metadata.sizeBytes() != intent.sizeBytes()
                || actualType.isBlank()
                || "application/octet-stream".equalsIgnoreCase(actualType)
                || !intent.mimeType().equalsIgnoreCase(actualType)) {
            return false;
        }
        var prefix = objectStorage.readObjectPrefix(intent.bucketName(), objectKey, 4096);
        return contentMatches(intent.originalFilename(), intent.mimeType(), prefix);
    }

    private void adopt(
            KioskExecutionContext context,
            KioskActionRequest request,
            KioskCapabilityDescriptor capability,
            String acceptedObjectKey) {
        var stagedObjectKey = text(request.payload(), "object_key", "objectKey");
        var updated = jdbcTemplate.update(
            """
                UPDATE kiosk_file_intents
                SET status = 'ADOPTED', adopted_at = CURRENT_TIMESTAMP, action_id = ?, object_key = ?
                WHERE kiosk_definition_id = ? AND session_id = ? AND module_reference = ?
                  AND object_key = ? AND status = 'PENDING' AND expires_at > CURRENT_TIMESTAMP
                """,
            MDC.get("actionId"), acceptedObjectKey, context.definition().id(),
            context.session().sessionId(), moduleReference(request), stagedObjectKey
        );
        if (updated != 1) {
            throw new SecurityException("File intent could not be adopted.");
        }
        audit(context, capability, "KIOSK_FILE_ADOPTED", "SUCCEEDED", acceptedObjectKey);
    }

    private void sealAndAdopt(
            KioskExecutionContext context,
            KioskActionRequest request,
            KioskCapabilityDescriptor capability,
            Map<String, Object> response) {
        var stagedObjectKey = text(request.payload(), "object_key", "objectKey");
        var intents = jdbcTemplate.query(
            """
                SELECT bucket_name, original_filename, mime_type, size_bytes
                FROM kiosk_file_intents
                WHERE kiosk_definition_id = ? AND session_id = ? AND module_reference = ?
                  AND object_key = ? AND status = 'PENDING' AND expires_at > CURRENT_TIMESTAMP
                LIMIT 1
                """,
            (rs, rowNum) -> new PendingIntent(
                rs.getString("bucket_name"), rs.getString("original_filename"),
                rs.getString("mime_type"), rs.getLong("size_bytes")),
            context.definition().id(), context.session().sessionId(),
            moduleReference(request), stagedObjectKey
        );
        if (intents.isEmpty()) {
            throw new SecurityException("File intent could not be sealed.");
        }
        var intent = intents.getFirst();
        var bucket = intent.bucketName();
        var acceptedObjectKey = sealedObjectKey(stagedObjectKey);
        objectStorage.copyObject(bucket, stagedObjectKey, acceptedObjectKey);
        final boolean valid;
        try {
            valid = storedObjectMatches(intent, acceptedObjectKey);
        } catch (RuntimeException inspectionFailure) {
            try {
                objectStorage.deleteObject(bucket, acceptedObjectKey);
            } catch (RuntimeException cleanupFailure) {
                inspectionFailure.addSuppressed(cleanupFailure);
            }
            throw inspectionFailure;
        }
        if (!valid) {
            rejectPending(context, request, capability, bucket,
                stagedObjectKey, acceptedObjectKey,
                "Uploaded file does not match the approved intent.");
        }
        try {
            adopt(context, request, capability, acceptedObjectKey);
            response.put("object_key", acceptedObjectKey);
            response.put("objectKey", acceptedObjectKey);
        } catch (RuntimeException failure) {
            try {
                objectStorage.deleteObject(bucket, acceptedObjectKey);
            } catch (RuntimeException cleanupFailure) {
                failure.addSuppressed(cleanupFailure);
            }
            throw failure;
        }
        completeSealingAfterTransaction(
            context, moduleReference(request), bucket, stagedObjectKey, acceptedObjectKey);
    }

    private void completeSealingAfterTransaction(
            KioskExecutionContext context,
            String moduleReference,
            String bucket,
            String stagedObjectKey,
            String sealedObjectKey) {
        if (!TransactionSynchronizationManager.isSynchronizationActive()) {
            deleteStagingAfterCommit(bucket, stagedObjectKey);
            return;
        }
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCompletion(int status) {
                if (status == TransactionSynchronization.STATUS_COMMITTED) {
                    deleteStagingAfterCommit(bucket, stagedObjectKey);
                } else {
                    try {
                        objectStorage.deleteObject(bucket, sealedObjectKey);
                    } catch (RuntimeException storageFailure) {
                        // Persist the detached copy so maintenance can retry cleanup;
                        // the rolled-back intent itself remains PENDING/retryable.
                        try {
                            jdbcTemplate.update(
                                "UPDATE kiosk_file_intents SET staging_object_key = ?"
                                    + " WHERE kiosk_definition_id = ? AND session_id = ?"
                                    + " AND module_reference = ? AND object_key = ?"
                                    + " AND status = 'PENDING'",
                                sealedObjectKey, context.definition().id(),
                                context.session().sessionId(), moduleReference, stagedObjectKey);
                        } catch (RuntimeException ignored) {
                            storageFailure.addSuppressed(ignored);
                        }
                    }
                }
            }
        });
    }

    private void deleteStagingAfterCommit(String bucket, String stagedObjectKey) {
        try {
            objectStorage.deleteObject(bucket, stagedObjectKey);
            jdbcTemplate.update(
                "UPDATE kiosk_file_intents SET staging_object_key = NULL"
                    + " WHERE object_key <> ? AND staging_object_key = ? AND status = 'ADOPTED'",
                stagedObjectKey, stagedObjectKey);
        } catch (RuntimeException ignored) {
            // cleanupSealedStagingObjects retries without affecting the adopted sealed file.
        }
    }

    /**
     * Requires a document to have completed the Engine-owned upload handshake for this exact
     * kiosk session and module resource before a domain mutation can reference it.
     */
    public void requireAdopted(
            KioskExecutionContext context,
            long moduleReference,
            String objectKey,
            String presignCapabilityKey) {
        if (moduleReference <= 0 || objectKey == null || objectKey.isBlank()
                || presignCapabilityKey == null || presignCapabilityKey.isBlank()) {
            throw new SecurityException("Registered file intent is required.");
        }
        var count = jdbcTemplate.queryForObject(
            """
                SELECT COUNT(*) FROM kiosk_file_intents
                WHERE kiosk_definition_id = ? AND session_id = ? AND module_reference = ?
                  AND object_key = ? AND capability_key = ? AND status = 'ADOPTED'
                """,
            Integer.class,
            context.definition().id(), context.session().sessionId(),
            String.valueOf(moduleReference), objectKey.trim(),
            presignCapabilityKey.contains("@")
                ? presignCapabilityKey.trim() : presignCapabilityKey.trim() + "@1"
        );
        if (count == null || count == 0) {
            throw new SecurityException(
                "File must be registered by this kiosk session before it can be used.");
        }
    }

    public void consumeAdopted(
            KioskExecutionContext context,
            long moduleReference,
            String objectKey,
            String presignCapabilityKey,
            String domainRecordType,
            long domainRecordId) {
        var versionedCapability = presignCapabilityKey.contains("@")
            ? presignCapabilityKey.trim() : presignCapabilityKey.trim() + "@1";
        var boundReference = "BOUND:" + domainRecordType.trim().toUpperCase(Locale.ROOT)
            + ":" + domainRecordId;
        var updated = jdbcTemplate.update(
            """
                UPDATE kiosk_file_intents
                SET module_reference = ?, action_id = ?
                WHERE kiosk_definition_id = ? AND session_id = ? AND module_reference = ?
                  AND object_key = ? AND capability_key = ? AND status = 'ADOPTED'
                """,
            boundReference, MDC.get("actionId"), context.definition().id(),
            context.session().sessionId(), String.valueOf(moduleReference), objectKey.trim(),
            versionedCapability
        );
        if (updated != 1) {
            throw new SecurityException("Registered file could not be bound to the domain record.");
        }
        audit(context, versionedCapability, "KIOSK_FILE_BOUND", "SUCCEEDED", objectKey);
    }

    @Scheduled(
            fixedDelayString = "${app.kiosk-engine.file-cleanup-delay-ms:3600000}",
            initialDelayString = "${app.kiosk-engine.file-cleanup-initial-delay-ms:300000}")
    @Transactional
    public int cleanupExpiredUploads() {
        cleanupRejectedObjects();
        cleanupDetachedStagingObjects();
        var expired = jdbcTemplate.query(
            """
                SELECT intent.intent_id, intent.kiosk_definition_id, intent.company_id,
                       intent.owner_module, intent.session_id, intent.capability_key,
                       intent.bucket_name, intent.object_key, intent.staging_object_key
                FROM kiosk_file_intents intent
                WHERE (intent.status = 'PENDING' AND intent.expires_at < CURRENT_TIMESTAMP)
                   OR (intent.status = 'ADOPTED'
                       AND intent.module_reference NOT LIKE 'BOUND:%'
                       AND intent.adopted_at < CURRENT_TIMESTAMP - INTERVAL 24 HOUR
                       AND EXISTS (
                           SELECT 1 FROM kiosk_capabilities capability
                           WHERE CONCAT(capability.capability_key, '@', capability.capability_version)
                                 = intent.capability_key
                             AND JSON_EXTRACT(capability.file_policy_json,
                                 '$.requireConsumption') = TRUE
                       ))
                LIMIT 200
                FOR UPDATE SKIP LOCKED
                """,
            (rs, rowNum) -> new ExpiredIntent(
                rs.getString("intent_id"), rs.getLong("kiosk_definition_id"),
                rs.getLong("company_id"), rs.getString("owner_module"), rs.getString("session_id"),
                rs.getString("capability_key"), rs.getString("bucket_name"), rs.getString("object_key"),
                rs.getString("staging_object_key"))
        );
        var cleaned = 0;
        for (var intent : expired) {
            if (objectStorage.isEnabled()) {
                try {
                    objectStorage.deleteObject(intent.bucketName(), intent.objectKey());
                    if (intent.stagingObjectKey() != null
                            && !intent.stagingObjectKey().equals(intent.objectKey())) {
                        objectStorage.deleteObject(intent.bucketName(), intent.stagingObjectKey());
                    }
                } catch (RuntimeException failure) {
                    continue;
                }
            }
            var updated = jdbcTemplate.update(
                "UPDATE kiosk_file_intents SET status = 'EXPIRED' WHERE intent_id = ?"
                    + " AND status IN ('PENDING', 'ADOPTED') AND module_reference NOT LIKE 'BOUND:%'",
                intent.intentId()
            );
            if (updated == 1) {
                auditExpired(intent);
                cleaned++;
            }
        }
        return cleaned;
    }

    private void cleanupRejectedObjects() {
        var rejected = jdbcTemplate.query(
            """
                SELECT intent_id, bucket_name, object_key, staging_object_key
                FROM kiosk_file_intents
                WHERE status = 'REJECTED' AND staging_object_key IS NOT NULL
                LIMIT 200
                FOR UPDATE SKIP LOCKED
                """,
            (rs, rowNum) -> new RejectedStorage(
                rs.getString("intent_id"), rs.getString("bucket_name"),
                rs.getString("object_key"),
                rs.getString("staging_object_key")));
        for (var intent : rejected) {
            if (objectStorage.isEnabled()) {
                try {
                    objectStorage.deleteObject(intent.bucketName(), intent.cleanupObjectKey());
                    if (!intent.cleanupObjectKey().equals(intent.intentObjectKey())) {
                        objectStorage.deleteObject(intent.bucketName(), intent.intentObjectKey());
                    }
                } catch (RuntimeException failure) {
                    continue;
                }
            }
            jdbcTemplate.update(
                "UPDATE kiosk_file_intents SET staging_object_key = NULL"
                    + " WHERE intent_id = ? AND status = 'REJECTED'",
                intent.intentId());
        }
    }

    private void cleanupDetachedStagingObjects() {
        var sealed = jdbcTemplate.query(
            """
                SELECT intent_id, bucket_name, staging_object_key
                FROM kiosk_file_intents
                WHERE status IN ('PENDING', 'ADOPTED')
                  AND staging_object_key IS NOT NULL
                  AND staging_object_key <> object_key
                LIMIT 200
                FOR UPDATE SKIP LOCKED
                """,
            (rs, rowNum) -> new SealedStaging(
                rs.getString("intent_id"), rs.getString("bucket_name"),
                rs.getString("staging_object_key"))
        );
        for (var staging : sealed) {
            if (objectStorage.isEnabled()) {
                try {
                    objectStorage.deleteObject(staging.bucketName(), staging.objectKey());
                } catch (RuntimeException failure) {
                    continue;
                }
            }
            jdbcTemplate.update(
                "UPDATE kiosk_file_intents"
                    + " SET staging_object_key = CASE WHEN status = 'PENDING' THEN object_key ELSE NULL END"
                    + " WHERE intent_id = ? AND status IN ('PENDING', 'ADOPTED')"
                    + " AND staging_object_key <> object_key",
                staging.intentId());
        }
    }

    private void audit(
            KioskExecutionContext context,
            KioskCapabilityDescriptor capability,
            String eventType,
            String outcome,
            String objectKey) {
        audit(context, capability.versionedKey(), eventType, outcome, objectKey);
    }

    private void audit(
            KioskExecutionContext context,
            String versionedCapability,
            String eventType,
            String outcome,
            String objectKey) {
        jdbcTemplate.update(
            """
                INSERT INTO kiosk_audit_events (
                    event_id, action_id, session_id, kiosk_definition_id, historical_kiosk_id,
                    company_id, owner_module, event_type, outcome, actor_type, actor_id,
                    capability_key, technical_detail_json, retain_until
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, JSON_OBJECT('object_key_hash', SHA2(?, 256)), ?)
                """,
            UUID.randomUUID().toString(), MDC.get("actionId"), context.session().sessionId(),
            context.definition().id(), context.definition().id(), context.definition().companyId(),
            context.ownerModule(), eventType, outcome, context.session().identityType(),
            context.session().identityId(), versionedCapability, objectKey,
            Timestamp.from(Instant.now().plus(365, ChronoUnit.DAYS))
        );
    }

    private void auditExpired(ExpiredIntent intent) {
        jdbcTemplate.update(
            """
                INSERT INTO kiosk_audit_events (
                    event_id, session_id, kiosk_definition_id, historical_kiosk_id,
                    company_id, owner_module, event_type, outcome, capability_key,
                    technical_detail_json, retain_until
                )
                VALUES (?, ?, NULL, ?, ?, ?, 'KIOSK_FILE_EXPIRED', 'SUCCEEDED', ?,
                        JSON_OBJECT('object_key_hash', SHA2(?, 256)), ?)
                """,
            UUID.randomUUID().toString(), intent.sessionId(), intent.definitionId(),
            intent.companyId(), intent.ownerModule(), intent.capabilityKey(),
            intent.objectKey(), Timestamp.from(Instant.now().plus(365, ChronoUnit.DAYS))
        );
    }

    private String moduleReference(KioskActionRequest request) {
        if (request.resourceId() == null || request.resourceId() <= 0) {
            throw new IllegalArgumentException("A file operation requires resource_id.");
        }
        return String.valueOf(request.resourceId());
    }

    private String text(Map<String, Object> payload, String... keys) {
        if (payload != null) {
            for (var key : keys) {
                var value = payload.get(key);
                if (value != null && !String.valueOf(value).isBlank()) {
                    return String.valueOf(value).trim();
                }
            }
        }
        return "";
    }

    private Long number(Map<String, Object> payload, String... keys) {
        var value = text(payload, keys);
        try {
            return value.isBlank() ? null : Long.parseLong(value);
        } catch (NumberFormatException ex) {
            throw new IllegalArgumentException("File size is invalid.");
        }
    }

    private long longPolicy(Map<String, Object> policy, String key, long defaultValue) {
        var value = policy.get(key);
        return value instanceof Number number ? number.longValue() : defaultValue;
    }

    private boolean booleanPolicy(Map<String, Object> policy, String key, boolean defaultValue) {
        var value = policy.get(key);
        return value instanceof Boolean bool ? bool : defaultValue;
    }

    private boolean extensionMatchesMime(String lowerName, String mimeType) {
        var normalizedMime = mimeType.toLowerCase(Locale.ROOT);
        if (lowerName.endsWith(".pdf")) return "application/pdf".equals(normalizedMime);
        if (lowerName.endsWith(".jpg") || lowerName.endsWith(".jpeg")) {
            return "image/jpeg".equals(normalizedMime);
        }
        if (lowerName.endsWith(".png")) return "image/png".equals(normalizedMime);
        if (lowerName.endsWith(".gif")) return "image/gif".equals(normalizedMime);
        if (lowerName.endsWith(".webp")) return "image/webp".equals(normalizedMime);
        if (lowerName.endsWith(".heic")) return "image/heic".equals(normalizedMime);
        if (lowerName.endsWith(".heif")) return "image/heif".equals(normalizedMime);
        if (lowerName.endsWith(".xml")) {
            return "application/xml".equals(normalizedMime) || "text/xml".equals(normalizedMime);
        }
        if (lowerName.endsWith(".doc")) return "application/msword".equals(normalizedMime);
        if (lowerName.endsWith(".docx")) {
            return "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                .equals(normalizedMime);
        }
        if (lowerName.endsWith(".xls")) return "application/vnd.ms-excel".equals(normalizedMime);
        if (lowerName.endsWith(".xlsx")) {
            return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                .equals(normalizedMime);
        }
        if (lowerName.endsWith(".csv")) return "text/csv".equals(normalizedMime);
        if (lowerName.endsWith(".txt")) return "text/plain".equals(normalizedMime);
        return false;
    }

    private boolean contentMatches(String fileName, String mimeType, byte[] prefix) {
        if (prefix == null || prefix.length == 0) {
            return false;
        }
        var normalizedName = fileName == null ? "" : fileName.toLowerCase(Locale.ROOT);
        var normalizedMime = mimeType == null ? "" : mimeType.toLowerCase(Locale.ROOT);
        if (normalizedName.endsWith(".pdf") || "application/pdf".equals(normalizedMime)) {
            return startsWith(prefix, 0x25, 0x50, 0x44, 0x46, 0x2d);
        }
        if (normalizedName.endsWith(".jpg") || normalizedName.endsWith(".jpeg")
                || "image/jpeg".equals(normalizedMime)) {
            return startsWith(prefix, 0xff, 0xd8, 0xff);
        }
        if (normalizedName.endsWith(".png") || "image/png".equals(normalizedMime)) {
            return startsWith(prefix, 0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a);
        }
        if (normalizedName.endsWith(".gif") || "image/gif".equals(normalizedMime)) {
            return asciiAt(prefix, 0, "GIF87a") || asciiAt(prefix, 0, "GIF89a");
        }
        if (normalizedName.endsWith(".webp") || "image/webp".equals(normalizedMime)) {
            return asciiAt(prefix, 0, "RIFF") && asciiAt(prefix, 8, "WEBP");
        }
        if (normalizedName.endsWith(".heic") || normalizedName.endsWith(".heif")
                || normalizedMime.startsWith("image/hei")) {
            return asciiAt(prefix, 4, "ftyp")
                && (asciiAt(prefix, 8, "heic") || asciiAt(prefix, 8, "heix")
                    || asciiAt(prefix, 8, "hevc") || asciiAt(prefix, 8, "hevx")
                    || asciiAt(prefix, 8, "mif1") || asciiAt(prefix, 8, "msf1"));
        }
        if (normalizedName.endsWith(".xml")
                || "application/xml".equals(normalizedMime) || "text/xml".equals(normalizedMime)) {
            var value = new String(prefix, StandardCharsets.UTF_8)
                .replace("\uFEFF", "").stripLeading().toLowerCase(Locale.ROOT);
            return value.startsWith("<")
                && !value.contains("<!doctype")
                && !value.contains("<!entity");
        }
        if (normalizedName.endsWith(".docx") || normalizedName.endsWith(".xlsx")
                || normalizedMime.startsWith("application/vnd.openxmlformats-officedocument")) {
            return startsWith(prefix, 0x50, 0x4b, 0x03, 0x04)
                || startsWith(prefix, 0x50, 0x4b, 0x05, 0x06)
                || startsWith(prefix, 0x50, 0x4b, 0x07, 0x08);
        }
        if (normalizedName.endsWith(".doc") || normalizedName.endsWith(".xls")
                || "application/msword".equals(normalizedMime)
                || "application/vnd.ms-excel".equals(normalizedMime)) {
            return startsWith(prefix, 0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1);
        }
        if (normalizedName.endsWith(".csv") || normalizedName.endsWith(".txt")
                || "text/csv".equals(normalizedMime) || "text/plain".equals(normalizedMime)) {
            return !containsNull(prefix) && !startsWith(prefix, 0x4d, 0x5a)
                && !startsWith(prefix, 0x7f, 0x45, 0x4c, 0x46);
        }
        return false;
    }

    private boolean startsWith(byte[] value, int... expected) {
        if (value.length < expected.length) {
            return false;
        }
        for (var index = 0; index < expected.length; index++) {
            if ((value[index] & 0xff) != expected[index]) {
                return false;
            }
        }
        return true;
    }

    private boolean asciiAt(byte[] value, int offset, String expected) {
        var bytes = expected.getBytes(StandardCharsets.US_ASCII);
        if (offset < 0 || value.length < offset + bytes.length) {
            return false;
        }
        for (var index = 0; index < bytes.length; index++) {
            if (value[offset + index] != bytes[index]) {
                return false;
            }
        }
        return true;
    }

    private boolean containsNull(byte[] value) {
        for (var current : value) {
            if (current == 0) return true;
        }
        return false;
    }

    private String sealedObjectKey(String stagedObjectKey) {
        var separator = stagedObjectKey.lastIndexOf('/');
        var parent = separator < 0 ? "" : stagedObjectKey.substring(0, separator + 1);
        var fileName = separator < 0 ? stagedObjectKey : stagedObjectKey.substring(separator + 1);
        return parent + "sealed/" + UUID.randomUUID() + "-" + fileName;
    }

    private Instant instant(Object value) {
        try {
            return value == null ? null : Instant.parse(String.valueOf(value));
        } catch (RuntimeException ignored) {
            return null;
        }
    }

    private record ExpiredIntent(
            String intentId,
            long definitionId,
            long companyId,
            String ownerModule,
            String sessionId,
            String capabilityKey,
            String bucketName,
            String objectKey,
            String stagingObjectKey) {
    }

    private record SealedStaging(String intentId, String bucketName, String objectKey) {
    }

    private record RejectedStorage(
            String intentId,
            String bucketName,
            String intentObjectKey,
            String cleanupObjectKey) {
    }

    private record PendingIntent(
            String bucketName,
            String originalFilename,
            String mimeType,
            long sizeBytes) {
    }

}
