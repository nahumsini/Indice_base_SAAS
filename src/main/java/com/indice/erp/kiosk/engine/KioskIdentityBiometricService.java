package com.indice.erp.kiosk.engine;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.indice.erp.face.FaceIdentityTemplateVault;
import com.indice.erp.face.FaceVerificationClient;
import com.indice.erp.face.FaceVerificationProperties;
import com.indice.erp.storage.ObjectStorageDisabledException;
import com.indice.erp.storage.ObjectStorageProperties;
import com.indice.erp.storage.ObjectStorageService;
import com.indice.erp.storage.PresignedUpload;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class KioskIdentityBiometricService {

    private static final List<String> REQUIRED_STEPS = List.of("neutral", "left", "right");
    private static final String CONSENT_VERSION = "kiosk-biometric-v1";
    private final JdbcTemplate jdbcTemplate;
    private final ObjectMapper objectMapper;
    private final ObjectStorageService objectStorage;
    private final ObjectStorageProperties storageProperties;
    private final FaceVerificationProperties faceProperties;
    private final FaceVerificationClient faceClient;
    private final FaceIdentityTemplateVault templateVault;

    public KioskIdentityBiometricService(
            JdbcTemplate jdbcTemplate,
            ObjectMapper objectMapper,
            ObjectStorageService objectStorage,
            ObjectStorageProperties storageProperties,
            FaceVerificationProperties faceProperties,
            FaceVerificationClient faceClient,
            FaceIdentityTemplateVault templateVault) {
        this.jdbcTemplate = jdbcTemplate;
        this.objectMapper = objectMapper;
        this.objectStorage = objectStorage;
        this.storageProperties = storageProperties;
        this.faceProperties = faceProperties;
        this.faceClient = faceClient;
        this.templateVault = templateVault;
    }

    public Map<String, Object> status(KioskExecutionContext context) {
        var principal = requirePrincipal(context);
        expirePending(principal);
        var enrollment = activeEnrollment(principal);
        var result = new LinkedHashMap<String, Object>();
        result.put("available", available(principal.companyId()));
        result.put("enrolled", enrollment != null);
        result.put("consentVersion", CONSENT_VERSION);
        result.put("requiredSteps", REQUIRED_STEPS);
        if (enrollment != null) {
            result.put("enrollmentId", enrollment.id());
            result.put("enrolledAt", enrollment.enrolledAt() == null ? null : enrollment.enrolledAt().toString());
        }
        return result;
    }

    @Transactional
    public Map<String, Object> beginEnrollment(
            KioskExecutionContext context,
            Map<String, Object> payload) {
        var principal = requirePrincipal(context);
        requireAvailable(principal.companyId());
        if (!Boolean.TRUE.equals(booleanValue(payload == null ? null : payload.get("consent")))) {
            audit(context, null, null, "BIOMETRIC_CONSENT_REJECTED", "REJECTED", Map.of());
            throw new IllegalArgumentException("Explicit biometric consent is required.");
        }
        expirePending(principal);
        jdbcTemplate.update(
            """
                UPDATE kiosk_biometric_enrollments
                SET status = 'EXPIRED'
                WHERE company_id = ? AND identity_type = ? AND identity_id = ? AND status = 'PENDING'
                """,
            principal.companyId(), principal.identityType(), principal.identityId());
        var enrollmentId = UUID.randomUUID().toString();
        var expiresAt = Instant.now().plusSeconds(faceProperties.getSessionExpirySeconds());
        jdbcTemplate.update(
            """
                INSERT INTO kiosk_biometric_enrollments (
                    enrollment_id, company_id, identity_type, identity_id, status,
                    consent_version, consent_at, expires_at
                ) VALUES (?, ?, ?, ?, 'PENDING', ?, CURRENT_TIMESTAMP, ?)
                """,
            enrollmentId, principal.companyId(), principal.identityType(), principal.identityId(),
            CONSENT_VERSION, Timestamp.from(expiresAt));
        audit(context, enrollmentId, null, "BIOMETRIC_CONSENT_RECORDED", "SUCCEEDED",
            Map.of("consentVersion", CONSENT_VERSION));
        return Map.of(
            "enrollmentId", enrollmentId,
            "status", "PENDING",
            "requiredSteps", REQUIRED_STEPS,
            "expiresAt", expiresAt.toString());
    }

    @Transactional
    public Map<String, Object> presignEnrollmentCapture(
            KioskExecutionContext context,
            Map<String, Object> payload) {
        var principal = requirePrincipal(context);
        requireAvailable(principal.companyId());
        var enrollmentId = requiredText(payload, "enrollment_id", "enrollmentId");
        var enrollment = requireEnrollment(principal, enrollmentId, "PENDING");
        requireNotExpired(enrollment.expiresAt(), "Enrollment session expired.");
        return presignCapture(context, "ENROLLMENT", enrollmentId, payload);
    }

    @Transactional
    public Map<String, Object> completeEnrollment(
            KioskExecutionContext context,
            Map<String, Object> payload) {
        var principal = requirePrincipal(context);
        requireAvailable(principal.companyId());
        var enrollmentId = requiredText(payload, "enrollment_id", "enrollmentId");
        var enrollment = requireEnrollment(principal, enrollmentId, "PENDING");
        requireNotExpired(enrollment.expiresAt(), "Enrollment session expired.");
        var captures = requireCaptures("ENROLLMENT", enrollmentId);
        var captureReferences = captureReferences(captures);
        FaceVerificationClient.EnrollResponse result;
        try {
            result = faceClient.enroll(captureReferences);
        } finally {
            purgeCaptures("ENROLLMENT", enrollmentId, captures);
        }
        requireAvailable(principal.companyId());
        if (result == null || !"success".equalsIgnoreCase(result.status())
                || result.embeddings() == null || result.embeddings().size() != REQUIRED_STEPS.size()) {
            audit(context, enrollmentId, null, "BIOMETRIC_ENROLLMENT_FAILED", "FAILED", Map.of());
            throw new IllegalArgumentException(result == null || blank(result.failureReason())
                ? "Face enrollment failed." : result.failureReason());
        }
        var priorTemplates = jdbcTemplate.query(
            """
                SELECT template_reference
                FROM kiosk_biometric_enrollments
                WHERE company_id = ? AND identity_type = ? AND identity_id = ?
                  AND status = 'ACTIVE' AND template_reference IS NOT NULL
                """,
            (rs, rowNum) -> rs.getString("template_reference"),
            principal.companyId(), principal.identityType(), principal.identityId());
        for (var priorTemplate : priorTemplates) {
            templateVault.delete(priorTemplate, principal.companyId(),
                principal.identityType(), principal.identityId());
        }
        var templateReference = templateVault.store(
            principal.companyId(), principal.identityType(), principal.identityId(), result.embeddings());
        jdbcTemplate.update(
            """
                UPDATE kiosk_biometric_enrollments
                SET status = 'SUPERSEDED', template_reference = NULL
                WHERE company_id = ? AND identity_type = ? AND identity_id = ? AND status = 'ACTIVE'
                """,
            principal.companyId(), principal.identityType(), principal.identityId());
        jdbcTemplate.update(
            """
                UPDATE kiosk_biometric_enrollments
                SET status = 'ACTIVE', template_reference = ?, enrolled_at = CURRENT_TIMESTAMP,
                    expires_at = NULL
                WHERE enrollment_id = ? AND status = 'PENDING'
                """,
            templateReference, enrollmentId);
        audit(context, enrollmentId, null, "BIOMETRIC_ENROLLMENT_COMPLETED", "SUCCEEDED",
            Map.of("comparison", "ONE_TO_ONE", "liveness", true));
        return Map.of("enrollmentId", enrollmentId, "status", "ACTIVE", "enrolled", true);
    }

    @Transactional
    public Map<String, Object> withdrawConsent(KioskExecutionContext context) {
        var principal = requirePrincipal(context);
        var enrollments = jdbcTemplate.query(
            """
                SELECT enrollment_id, template_reference FROM kiosk_biometric_enrollments
                WHERE company_id = ? AND identity_type = ? AND identity_id = ?
                  AND status IN ('ACTIVE', 'PENDING')
                """,
            (rs, rowNum) -> new ConsentEnrollmentRow(
                rs.getString("enrollment_id"), rs.getString("template_reference")),
            principal.companyId(), principal.identityType(), principal.identityId());
        for (var enrollment : enrollments) {
            purgeCaptures("ENROLLMENT", enrollment.id(), captures("ENROLLMENT", enrollment.id()));
            templateVault.delete(enrollment.templateReference(), principal.companyId(),
                principal.identityType(), principal.identityId());
        }
        jdbcTemplate.update(
            """
                UPDATE kiosk_biometric_enrollments
                SET status = 'REVOKED', template_reference = NULL,
                    consent_withdrawn_at = CURRENT_TIMESTAMP, revoked_at = CURRENT_TIMESTAMP
                WHERE company_id = ? AND identity_type = ? AND identity_id = ?
                  AND status IN ('ACTIVE', 'PENDING')
                """,
            principal.companyId(), principal.identityType(), principal.identityId());
        audit(context, null, null, "BIOMETRIC_CONSENT_WITHDRAWN", "SUCCEEDED",
            Map.of("templateDeleted", true));
        return Map.of("success", true, "enrolled", false);
    }

    @Transactional
    public Map<String, Object> beginVerification(
            KioskExecutionContext context,
            Map<String, Object> payload) {
        var principal = requirePrincipal(context);
        requireAvailable(principal.companyId());
        var expectedSessionId = payload == null ? null : payload.get("expected_session_id");
        if (expectedSessionId != null && !principal.sessionId().equals(String.valueOf(expectedSessionId))) {
            throw new SecurityException("Kiosk session is not valid.");
        }
        var enrollment = activeEnrollment(principal);
        if (enrollment == null || enrollment.templateReference() == null) {
            throw new IllegalStateException("This identity is not enrolled for face verification.");
        }
        var verificationId = UUID.randomUUID().toString();
        var expiresAt = Instant.now().plusSeconds(faceProperties.getSessionExpirySeconds());
        jdbcTemplate.update(
            """
                INSERT INTO kiosk_biometric_verifications (
                    verification_id, enrollment_id, kiosk_definition_id, kiosk_session_id,
                    company_id, identity_type, identity_id, status, expires_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDING', ?)
                """,
            verificationId, enrollment.id(), context.definition().id(), principal.sessionId(),
            principal.companyId(), principal.identityType(), principal.identityId(), Timestamp.from(expiresAt));
        audit(context, enrollment.id(), verificationId, "BIOMETRIC_VERIFICATION_STARTED", "SUCCEEDED", Map.of());
        return Map.of(
            "verificationId", verificationId,
            "status", "PENDING",
            "requiredSteps", REQUIRED_STEPS,
            "expiresAt", expiresAt.toString());
    }

    @Transactional
    public Map<String, Object> presignVerificationCapture(
            KioskExecutionContext context,
            Map<String, Object> payload) {
        var principal = requirePrincipal(context);
        requireAvailable(principal.companyId());
        var verificationId = requiredText(payload, "verification_id", "verificationId");
        var verification = requireVerification(principal, verificationId, "PENDING");
        requireNotExpired(verification.expiresAt(), "Face verification session expired.");
        return presignCapture(context, "VERIFICATION", verificationId, payload);
    }

    @Transactional
    public Map<String, Object> completeVerification(
            KioskExecutionContext context,
            Map<String, Object> payload) {
        var principal = requirePrincipal(context);
        requireAvailable(principal.companyId());
        var verificationId = requiredText(payload, "verification_id", "verificationId");
        var verification = requireVerification(principal, verificationId, "PENDING");
        requireNotExpired(verification.expiresAt(), "Face verification session expired.");
        var enrollment = requireEnrollment(principal, verification.enrollmentId(), "ACTIVE");
        var captures = requireCaptures("VERIFICATION", verificationId);
        var enrolledTemplate = templateVault.require(
            enrollment.templateReference(), principal.companyId(),
            principal.identityType(), principal.identityId());
        var captureReferences = captureReferences(captures);
        FaceVerificationClient.VerifyResponse result;
        try {
            result = faceClient.verify(captureReferences, enrolledTemplate);
        } finally {
            purgeCaptures("VERIFICATION", verificationId, captures);
        }
        requireAvailable(principal.companyId());
        var matched = result != null && "success".equalsIgnoreCase(result.status())
            && result.matched() && result.livenessPassed();
        var status = matched ? "VERIFIED" : "FAILED";
        var reason = matched || result == null ? null : result.failureReason();
        jdbcTemplate.update(
            """
                UPDATE kiosk_biometric_verifications
                SET status = ?, liveness_passed = ?, matched_score = ?, failure_reason = ?,
                    completed_at = CURRENT_TIMESTAMP
                WHERE verification_id = ? AND status = 'PENDING'
                """,
            status, result != null && result.livenessPassed(), result == null ? null : result.matchScore(),
            reason, verificationId);
        if (matched) {
            jdbcTemplate.update(
                """
                    UPDATE kiosk_sessions
                    SET verified_factors_json = JSON_ARRAY('PIN', 'FACE'),
                        last_face_verified_at = CURRENT_TIMESTAMP
                    WHERE session_id = ? AND company_id = ? AND identity_type = ? AND identity_id = ?
                      AND revoked_at IS NULL
                    """,
                principal.sessionId(), principal.companyId(), principal.identityType(), principal.identityId());
        }
        audit(context, enrollment.id(), verificationId, "BIOMETRIC_VERIFICATION_COMPLETED",
            matched ? "SUCCEEDED" : "FAILED", Map.of(
                "matched", matched,
                "livenessPassed", result != null && result.livenessPassed(),
                "comparison", "ONE_TO_ONE"));
        var response = new LinkedHashMap<String, Object>();
        response.put("verificationId", verificationId);
        response.put("status", status);
        response.put("matched", matched);
        response.put("livenessPassed", result != null && result.livenessPassed());
        response.put("matchScore", result == null ? null : result.matchScore());
        response.put("failureReason", reason);
        return response;
    }

    private Map<String, Object> presignCapture(
            KioskExecutionContext context,
            String flowType,
            String flowId,
            Map<String, Object> payload) {
        var step = normalizeStep(payload == null ? null : payload.get("step"));
        var contentType = normalizeContentType(payload == null ? null
            : first(payload, "content_type", "contentType"));
        var prior = captures(flowType, flowId).stream()
            .filter(capture -> capture.step().equals(step)).findFirst().orElse(null);
        if (prior != null && objectStorage.objectExists(prior.bucket(), prior.objectKey())) {
            objectStorage.deleteObject(prior.bucket(), prior.objectKey());
        }
        var objectKey = "kiosk/biometric/" + context.definition().companyId() + "/"
            + context.session().identityType().toLowerCase() + "/" + context.session().identityId()
            + "/" + flowType.toLowerCase() + "/" + flowId + "/" + step + extension(contentType);
        var upload = objectStorage.presignUpload(
            biometricBucket(), objectKey, contentType, storageProperties.getMinio().getPresignExpirySeconds());
        jdbcTemplate.update(
            """
                INSERT INTO kiosk_biometric_captures (
                    flow_type, flow_id, capture_step, bucket_name, object_key, content_type, expires_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE
                    bucket_name = VALUES(bucket_name), object_key = VALUES(object_key),
                    content_type = VALUES(content_type), expires_at = VALUES(expires_at),
                    created_at = CURRENT_TIMESTAMP
                """,
            flowType, flowId, step, biometricBucket(), objectKey, contentType, upload.expiresAt());
        audit(context, "ENROLLMENT".equals(flowType) ? flowId : null,
            "VERIFICATION".equals(flowType) ? flowId : null,
            "BIOMETRIC_CAPTURE_REQUESTED", "SUCCEEDED", Map.of("step", step, "flowType", flowType));
        return presignBody(upload, step);
    }

    private List<FaceVerificationClient.CaptureReference> captureReferences(List<CaptureRow> captures) {
        var references = new ArrayList<FaceVerificationClient.CaptureReference>();
        for (var step : REQUIRED_STEPS) {
            var capture = captures.stream().filter(item -> step.equals(item.step())).findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Missing biometric capture step."));
            if (!objectStorage.objectExists(capture.bucket(), capture.objectKey())) {
                throw new IllegalArgumentException("Biometric capture upload is missing.");
            }
            references.add(new FaceVerificationClient.CaptureReference(
                step, objectStorage.presignServiceDownload(
                    capture.bucket(), capture.objectKey(), storageProperties.getMinio().getPresignExpirySeconds())));
        }
        return references;
    }

    private List<CaptureRow> requireCaptures(String flowType, String flowId) {
        var captures = captures(flowType, flowId);
        if (captures.size() != REQUIRED_STEPS.size()) {
            throw new IllegalArgumentException("Biometric verification requires 3 captures.");
        }
        return captures;
    }

    private List<CaptureRow> captures(String flowType, String flowId) {
        return jdbcTemplate.query(
            """
                SELECT capture_step, bucket_name, object_key, content_type
                FROM kiosk_biometric_captures
                WHERE flow_type = ? AND flow_id = ?
                """,
            (rs, rowNum) -> new CaptureRow(
                rs.getString("capture_step"), rs.getString("bucket_name"),
                rs.getString("object_key"), rs.getString("content_type")),
            flowType, flowId);
    }

    private void purgeCaptures(String flowType, String flowId, List<CaptureRow> captures) {
        for (var capture : captures) {
            if (objectStorage.objectExists(capture.bucket(), capture.objectKey())) {
                objectStorage.deleteObject(capture.bucket(), capture.objectKey());
            }
        }
        jdbcTemplate.update(
            "DELETE FROM kiosk_biometric_captures WHERE flow_type = ? AND flow_id = ?",
            flowType, flowId);
    }

    private EnrollmentRow activeEnrollment(KioskSessionPrincipal principal) {
        var rows = jdbcTemplate.query(
            """
                SELECT enrollment_id, status, template_reference, expires_at, enrolled_at
                FROM kiosk_biometric_enrollments
                WHERE company_id = ? AND identity_type = ? AND identity_id = ? AND status = 'ACTIVE'
                  AND template_reference IS NOT NULL
                ORDER BY enrolled_at DESC, created_at DESC LIMIT 1
                """,
            (rs, rowNum) -> enrollmentRow(rs),
            principal.companyId(), principal.identityType(), principal.identityId());
        return rows.isEmpty() ? null : rows.getFirst();
    }

    private EnrollmentRow requireEnrollment(
            KioskSessionPrincipal principal,
            String enrollmentId,
            String status) {
        var rows = jdbcTemplate.query(
            """
                SELECT enrollment_id, status, template_reference, expires_at, enrolled_at
                FROM kiosk_biometric_enrollments
                WHERE enrollment_id = ? AND company_id = ? AND identity_type = ? AND identity_id = ?
                  AND status = ?
                LIMIT 1 FOR UPDATE
                """,
            (rs, rowNum) -> enrollmentRow(rs),
            enrollmentId, principal.companyId(), principal.identityType(), principal.identityId(), status);
        if (rows.isEmpty()) {
            throw new NoSuchElementException("Biometric enrollment is not available.");
        }
        return rows.getFirst();
    }

    private EnrollmentRow enrollmentRow(java.sql.ResultSet rs) throws java.sql.SQLException {
        var expiresAt = rs.getTimestamp("expires_at");
        var enrolledAt = rs.getTimestamp("enrolled_at");
        return new EnrollmentRow(
            rs.getString("enrollment_id"), rs.getString("status"), rs.getString("template_reference"),
            expiresAt == null ? null : expiresAt.toInstant(),
            enrolledAt == null ? null : enrolledAt.toInstant());
    }

    private VerificationRow requireVerification(
            KioskSessionPrincipal principal,
            String verificationId,
            String status) {
        var rows = jdbcTemplate.query(
            """
                SELECT verification_id, enrollment_id, expires_at
                FROM kiosk_biometric_verifications
                WHERE verification_id = ? AND company_id = ? AND identity_type = ? AND identity_id = ?
                  AND kiosk_session_id = ? AND status = ?
                LIMIT 1 FOR UPDATE
                """,
            (rs, rowNum) -> new VerificationRow(
                rs.getString("verification_id"), rs.getString("enrollment_id"),
                rs.getTimestamp("expires_at").toInstant()),
            verificationId, principal.companyId(), principal.identityType(), principal.identityId(),
            principal.sessionId(), status);
        if (rows.isEmpty()) {
            throw new NoSuchElementException("Face verification is not available.");
        }
        return rows.getFirst();
    }

    private void expirePending(KioskSessionPrincipal principal) {
        jdbcTemplate.update(
            """
                UPDATE kiosk_biometric_enrollments
                SET status = 'EXPIRED'
                WHERE company_id = ? AND identity_type = ? AND identity_id = ?
                  AND status = 'PENDING' AND expires_at < CURRENT_TIMESTAMP
                """,
            principal.companyId(), principal.identityType(), principal.identityId());
    }

    @Scheduled(
        fixedDelayString = "${app.kiosk-engine.biometric-cleanup-delay-ms:3600000}",
        initialDelayString = "${app.kiosk-engine.biometric-cleanup-initial-delay-ms:300000}")
    @Transactional
    public int cleanupExpiredBiometricData() {
        if (!objectStorage.isEnabled()) return 0;
        var expiredCaptures = jdbcTemplate.query(
            """
                SELECT id, bucket_name, object_key
                FROM kiosk_biometric_captures
                WHERE expires_at < CURRENT_TIMESTAMP
                """,
            (rs, rowNum) -> new ExpiredCaptureRow(
                rs.getLong("id"), rs.getString("bucket_name"), rs.getString("object_key")));
        for (var capture : expiredCaptures) {
            if (objectStorage.objectExists(capture.bucket(), capture.objectKey())) {
                objectStorage.deleteObject(capture.bucket(), capture.objectKey());
            }
        }
        var deleted = jdbcTemplate.update(
            "DELETE FROM kiosk_biometric_captures WHERE expires_at < CURRENT_TIMESTAMP");
        jdbcTemplate.update(
            """
                UPDATE kiosk_biometric_enrollments
                SET status = 'EXPIRED'
                WHERE status = 'PENDING' AND expires_at < CURRENT_TIMESTAMP
                """);
        jdbcTemplate.update(
            """
                UPDATE kiosk_biometric_verifications
                SET status = 'EXPIRED', completed_at = CURRENT_TIMESTAMP
                WHERE status = 'PENDING' AND expires_at < CURRENT_TIMESTAMP
                """);
        jdbcTemplate.update(
            "DELETE FROM kiosk_biometric_events WHERE retain_until < CURRENT_TIMESTAMP");
        return deleted;
    }

    private void audit(
            KioskExecutionContext context,
            String enrollmentId,
            String verificationId,
            String eventType,
            String outcome,
            Map<String, ?> detail) {
        var principal = requirePrincipal(context);
        jdbcTemplate.update(
            """
                INSERT INTO kiosk_biometric_events (
                    event_id, company_id, identity_type, identity_id, kiosk_definition_id,
                    kiosk_session_id, enrollment_id, verification_id, event_type, outcome,
                    detail_json, retain_until
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CAST(? AS JSON), ?)
                """,
            UUID.randomUUID().toString(), principal.companyId(), principal.identityType(),
            principal.identityId(), context.definition().id(), principal.sessionId(), enrollmentId,
            verificationId, eventType, outcome, json(detail == null ? Map.of() : detail),
            Timestamp.from(Instant.now().plus(365, ChronoUnit.DAYS)));
    }

    private KioskSessionPrincipal requirePrincipal(KioskExecutionContext context) {
        if (context == null || context.definition() == null || context.session() == null) {
            throw new SecurityException("Controlled kiosk authentication is required.");
        }
        return context.session();
    }

    public Map<String, Object> companyPolicy(long companyId) {
        return Map.of(
            "enabled", companyBiometricsEnabled(companyId),
            "environmentAvailable", faceProperties.isEnabled() && faceClient.isEnabled()
                && objectStorage.isEnabled());
    }

    @Transactional
    public Map<String, Object> updateCompanyPolicy(long companyId, long actorId, boolean enabled) {
        var rows = jdbcTemplate.query(
            "SELECT settings_json FROM company_settings WHERE company_id = ? LIMIT 1",
            (rs, rowNum) -> rs.getString("settings_json"), companyId);
        ObjectNode root = objectMapper.createObjectNode();
        if (rows != null && !rows.isEmpty() && rows.getFirst() != null && !rows.getFirst().isBlank()) {
            try {
                var parsed = objectMapper.readTree(rows.getFirst());
                if (parsed instanceof ObjectNode objectNode) root = objectNode.deepCopy();
            } catch (JsonProcessingException ignored) {
                // Preserve a safe valid settings document when the prior value is corrupt.
            }
        }
        var kioskEngine = root.get("kioskEngine") instanceof ObjectNode objectNode
            ? objectNode : root.putObject("kioskEngine");
        kioskEngine.put("biometricsEnabled", enabled);
        jdbcTemplate.update(
            """
                INSERT INTO company_settings (company_id, settings_json)
                VALUES (?, ?)
                ON DUPLICATE KEY UPDATE settings_json = VALUES(settings_json)
                """,
            companyId, json(root));
        jdbcTemplate.update(
            """
                INSERT INTO kiosk_biometric_events (
                    event_id, company_id, identity_type, identity_id, event_type, outcome,
                    detail_json, retain_until
                ) VALUES (?, ?, 'USER', ?, 'BIOMETRIC_COMPANY_POLICY_CHANGED', 'SUCCEEDED',
                    CAST(? AS JSON), ?)
                """,
            UUID.randomUUID().toString(), companyId, actorId, json(Map.of("enabled", enabled)),
            Timestamp.from(Instant.now().plus(365, ChronoUnit.DAYS)));
        return companyPolicy(companyId);
    }

    private boolean available(long companyId) {
        return faceProperties.isEnabled() && faceClient.isEnabled() && objectStorage.isEnabled()
            && companyBiometricsEnabled(companyId);
    }

    private void requireAvailable(long companyId) {
        if (!faceProperties.isEnabled() || !faceClient.isEnabled()) {
            throw new UnsupportedOperationException("Face verification is disabled for this company environment.");
        }
        if (!objectStorage.isEnabled()) {
            throw new ObjectStorageDisabledException("Biometric storage is not enabled.");
        }
        if (!companyBiometricsEnabled(companyId)) {
            throw new UnsupportedOperationException("Face verification is disabled by the company.");
        }
    }

    private boolean companyBiometricsEnabled(long companyId) {
        var rows = jdbcTemplate.query(
            "SELECT settings_json FROM company_settings WHERE company_id = ? LIMIT 1",
            (rs, rowNum) -> rs.getString("settings_json"), companyId);
        if (rows == null || rows.isEmpty() || rows.getFirst() == null || rows.getFirst().isBlank()) {
            return true;
        }
        try {
            var value = objectMapper.readTree(rows.getFirst()).path("kioskEngine").path("biometricsEnabled");
            return !value.isBoolean() || value.booleanValue();
        } catch (JsonProcessingException ignored) {
            return true;
        }
    }

    private String biometricBucket() {
        return storageProperties.getMinio().getBucketBiometric();
    }

    private Map<String, Object> presignBody(PresignedUpload upload, String step) {
        return Map.of(
            "step", step,
            "objectKey", upload.objectKey(),
            "uploadUrl", upload.uploadUrl(),
            "expiresAt", upload.expiresAt().toString(),
            "uploadHeaders", upload.uploadHeaders());
    }

    private String requiredText(Map<String, Object> payload, String... keys) {
        if (payload != null) {
            for (var key : keys) {
                var value = payload.get(key);
                if (value != null && !String.valueOf(value).isBlank()) {
                    return String.valueOf(value).trim();
                }
            }
        }
        throw new IllegalArgumentException(keys[0] + " is required.");
    }

    private Object first(Map<String, Object> payload, String... keys) {
        for (var key : keys) {
            if (payload.containsKey(key)) return payload.get(key);
        }
        return null;
    }

    private String normalizeStep(Object value) {
        var step = value == null ? "" : String.valueOf(value).trim().toLowerCase();
        if (!REQUIRED_STEPS.contains(step)) {
            throw new IllegalArgumentException("step must be neutral, left, or right.");
        }
        return step;
    }

    private String normalizeContentType(Object value) {
        var contentType = value == null ? "" : String.valueOf(value).trim().toLowerCase();
        return switch (contentType) {
            case "image/jpeg", "image/png", "image/webp" -> contentType;
            default -> throw new IllegalArgumentException("Biometric capture must be JPEG, PNG, or WebP.");
        };
    }

    private String extension(String contentType) {
        return switch (contentType) {
            case "image/png" -> ".png";
            case "image/webp" -> ".webp";
            default -> ".jpg";
        };
    }

    private Boolean booleanValue(Object value) {
        if (value instanceof Boolean bool) return bool;
        return value == null ? null : Boolean.valueOf(String.valueOf(value));
    }

    private void requireNotExpired(Instant expiresAt, String message) {
        if (expiresAt != null && !expiresAt.isAfter(Instant.now())) {
            throw new SecurityException(message);
        }
    }

    private String json(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException failure) {
            throw new IllegalArgumentException("Biometric payload must be valid JSON.", failure);
        }
    }

    private boolean blank(String value) {
        return value == null || value.isBlank();
    }

    private record EnrollmentRow(
            String id,
            String status,
            String templateReference,
            Instant expiresAt,
            Instant enrolledAt) {
    }

    private record ConsentEnrollmentRow(String id, String templateReference) {
    }

    private record VerificationRow(String id, String enrollmentId, Instant expiresAt) {
    }

    private record CaptureRow(String step, String bucket, String objectKey, String contentType) {
    }

    private record ExpiredCaptureRow(long id, String bucket, String objectKey) {
    }
}
