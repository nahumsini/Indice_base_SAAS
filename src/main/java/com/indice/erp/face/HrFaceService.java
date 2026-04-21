package com.indice.erp.face;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.indice.erp.storage.ObjectStorageDisabledException;
import com.indice.erp.storage.ObjectStorageProperties;
import com.indice.erp.storage.ObjectStorageService;
import com.indice.erp.storage.PresignedUpload;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class HrFaceService {

    private static final List<String> REQUIRED_STEPS = List.of("neutral", "left", "right");

    private final JdbcTemplate jdbcTemplate;
    private final ObjectStorageService objectStorageService;
    private final ObjectStorageProperties objectStorageProperties;
    private final FaceVerificationProperties faceVerificationProperties;
    private final FaceVerificationClient faceVerificationClient;
    private final ObjectMapper objectMapper;

    public HrFaceService(
        JdbcTemplate jdbcTemplate,
        ObjectStorageService objectStorageService,
        ObjectStorageProperties objectStorageProperties,
        FaceVerificationProperties faceVerificationProperties,
        FaceVerificationClient faceVerificationClient,
        ObjectMapper objectMapper
    ) {
        this.jdbcTemplate = jdbcTemplate;
        this.objectStorageService = objectStorageService;
        this.objectStorageProperties = objectStorageProperties;
        this.faceVerificationProperties = faceVerificationProperties;
        this.faceVerificationClient = faceVerificationClient;
        this.objectMapper = objectMapper;
    }

    public boolean isEnabled() {
        return faceVerificationProperties.isEnabled();
    }

    @Transactional
    public Map<String, Object> createEnrollmentSession(long companyId, long userId, Map<String, Object> payload) {
        requireFaceEnabled();
        var employeeId = parseRequiredEmployeeId(payload);
        ensureEmployeeIsEligible(companyId, employeeId);

        jdbcTemplate.update(
            """
                UPDATE hr_face_enrollments
                SET status = 'replaced'
                WHERE company_id = ?
                  AND employee_id = ?
                  AND status = 'pending'
                """,
            companyId,
            employeeId
        );

        var expiresAt = LocalDateTime.now().plusSeconds(faceVerificationProperties.getSessionExpirySeconds());
        KeyHolder keyHolder = new GeneratedKeyHolder();
        jdbcTemplate.update(connection -> {
            var statement = connection.prepareStatement(
                """
                    INSERT INTO hr_face_enrollments
                    (company_id, employee_id, status, expires_at, created_by)
                    VALUES (?, ?, 'pending', ?, ?)
                    """,
                new String[] {"id"}
            );
            statement.setLong(1, companyId);
            statement.setLong(2, employeeId);
            statement.setObject(3, expiresAt);
            statement.setLong(4, userId);
            return statement;
        }, keyHolder);

        var enrollmentId = keyHolder.getKey() == null ? null : keyHolder.getKey().longValue();
        if (enrollmentId == null) {
            throw new IllegalStateException("Enrollment session could not be created.");
        }

        var body = new LinkedHashMap<String, Object>();
        body.put("id", enrollmentId);
        body.put("employee_id", employeeId);
        body.put("status", "pending");
        body.put("required_steps", REQUIRED_STEPS);
        body.put("expires_at", expiresAt.toString());
        return body;
    }

    @Transactional
    public Map<String, Object> createEnrollmentCaptureUpload(long companyId, long enrollmentId, Map<String, Object> payload) {
        requireFaceEnabled();
        requireBiometricStorageEnabled();
        var enrollment = loadEnrollment(companyId, enrollmentId);
        if (!"pending".equals(enrollment.status())) {
            throw new IllegalArgumentException("Enrollment session is not pending.");
        }
        ensureEnrollmentSessionPending(enrollment);

        var step = normalizeStep(payload.get("step"));
        var contentType = normalizeImageContentType(payload.get("content_type"));
        var objectKey = buildEnrollmentObjectKey(companyId, enrollment.employeeId(), enrollmentId, step, contentType);
        replaceEnrollmentCaptureIfExists(enrollmentId, step);
        var upload = objectStorageService.presignUpload(
            biometricBucket(),
            objectKey,
            contentType,
            objectStorageProperties.getMinio().getPresignExpirySeconds()
        );

        jdbcTemplate.update(
            """
                INSERT INTO hr_face_enrollment_captures
                (enrollment_id, capture_step, object_key, capture_metadata_json, status)
                VALUES (?, ?, ?, CAST(? AS JSON), 'pending')
                """,
            enrollmentId,
            step,
            objectKey,
            toJson(Map.of("content_type", contentType))
        );

        return presignBody(upload, step);
    }

    @Transactional
    public Map<String, Object> completeEnrollment(long companyId, long userId, long enrollmentId) {
        requireFaceEnabled();
        requireBiometricStorageEnabled();
        var enrollment = loadEnrollment(companyId, enrollmentId);
        if (!"pending".equals(enrollment.status())) {
            throw new IllegalArgumentException("Enrollment session is not pending.");
        }

        var captures = loadEnrollmentCaptures(enrollmentId);
        if (captures.size() != REQUIRED_STEPS.size()) {
            throw new IllegalArgumentException("Enrollment requires 3 captures.");
        }

        var captureReferences = new ArrayList<FaceVerificationClient.CaptureReference>();
        for (var step : REQUIRED_STEPS) {
            var capture = captures.stream()
                .filter((item) -> step.equals(item.captureStep()))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Missing enrollment capture step."));
            if (!objectStorageService.objectExists(biometricBucket(), capture.objectKey())) {
                throw new IllegalArgumentException("Enrollment capture upload is missing.");
            }
            captureReferences.add(new FaceVerificationClient.CaptureReference(
                step,
                objectStorageService.presignServiceDownload(
                    biometricBucket(),
                    capture.objectKey(),
                    objectStorageProperties.getMinio().getPresignExpirySeconds()
                )
            ));
        }

        var result = faceVerificationClient.enroll(captureReferences);
        if (result == null || !"success".equalsIgnoreCase(result.status()) || result.embeddings() == null || result.embeddings().size() != REQUIRED_STEPS.size()) {
            throw new IllegalArgumentException(result == null ? "Enrollment failed." : coalesce(result.failureReason(), "Enrollment failed."));
        }

        jdbcTemplate.update(
            """
                UPDATE hr_face_enrollments
                SET status = 'superseded'
                WHERE company_id = ?
                  AND employee_id = ?
                  AND status = 'active'
                """,
            companyId,
            enrollment.employeeId()
        );

        for (int index = 0; index < REQUIRED_STEPS.size(); index += 1) {
            var step = REQUIRED_STEPS.get(index);
            var capture = captures.stream().filter((item) -> step.equals(item.captureStep())).findFirst().orElseThrow();
            jdbcTemplate.update(
                """
                    UPDATE hr_face_enrollment_captures
                    SET embedding_json = CAST(? AS JSON),
                        status = 'processed',
                        processed_at = ?
                    WHERE id = ?
                    """,
                toJson(result.embeddings().get(index)),
                LocalDateTime.now(),
                capture.id()
            );
            objectStorageService.deleteObject(biometricBucket(), capture.objectKey());
        }

        jdbcTemplate.update(
            """
                UPDATE hr_face_enrollments
                SET status = 'active',
                    enrolled_at = ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ? AND company_id = ?
                """,
            LocalDateTime.now(),
            enrollmentId,
            companyId
        );

        jdbcTemplate.update(
            """
                UPDATE hr_employee_access_profiles
                SET last_enrolled_at = ?
                WHERE company_id = ?
                  AND employee_id = ?
                """,
            LocalDateTime.now(),
            companyId,
            enrollment.employeeId()
        );

        return Map.of(
            "enrollment", toEnrollmentMap(loadLatestEnrollment(companyId, enrollment.employeeId()))
        );
    }

    public Map<String, Object> getEnrollment(long companyId, long employeeId) {
        requireFaceEnabled();
        ensureEmployeeExists(companyId, employeeId);
        var enrollment = loadLatestEnrollment(companyId, employeeId);
        return Map.of("enrollment", toEnrollmentMap(enrollment));
    }

    @Transactional
    public Map<String, Object> deleteEnrollment(long companyId, long employeeId) {
        requireFaceEnabled();
        ensureEmployeeExists(companyId, employeeId);

        var enrollments = jdbcTemplate.query(
            """
                SELECT id
                FROM hr_face_enrollments
                WHERE company_id = ?
                  AND employee_id = ?
                  AND status IN ('pending', 'active')
                ORDER BY id DESC
                """,
            (rs, rowNum) -> rs.getLong("id"),
            companyId,
            employeeId
        );

        for (var enrollmentId : enrollments) {
            for (var capture : loadEnrollmentCaptures(enrollmentId)) {
                if (objectStorageService.isEnabled() && objectStorageService.objectExists(biometricBucket(), capture.objectKey())) {
                    objectStorageService.deleteObject(biometricBucket(), capture.objectKey());
                }
            }
        }

        jdbcTemplate.update(
            """
                UPDATE hr_face_enrollments
                SET status = 'deleted',
                    deleted_at = ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE company_id = ?
                  AND employee_id = ?
                  AND status IN ('pending', 'active')
                """,
            LocalDateTime.now(),
            companyId,
            employeeId
        );

        return Map.of("success", true);
    }

    @Transactional
    public Map<String, Object> createVerificationSession(long companyId, long userId, Map<String, Object> payload) {
        requireFaceEnabled();
        var employeeId = parseRequiredEmployeeId(payload);
        ensureEmployeeIsEligible(companyId, employeeId);
        if (loadLatestEnrollment(companyId, employeeId) == null) {
            throw new IllegalArgumentException("Employee is not enrolled for face verification.");
        }

        var expiresAt = LocalDateTime.now().plusSeconds(faceVerificationProperties.getSessionExpirySeconds());
        KeyHolder keyHolder = new GeneratedKeyHolder();
        jdbcTemplate.update(connection -> {
            var statement = connection.prepareStatement(
                """
                    INSERT INTO hr_face_verification_sessions
                    (company_id, employee_id, status, auth_method, challenge_sequence_json, created_by, expires_at)
                    VALUES (?, ?, 'pending', 'facial_recognition', CAST(? AS JSON), ?, ?)
                    """,
                new String[] {"id"}
            );
            statement.setLong(1, companyId);
            statement.setLong(2, employeeId);
            statement.setString(3, toJson(REQUIRED_STEPS));
            statement.setLong(4, userId);
            statement.setObject(5, expiresAt);
            return statement;
        }, keyHolder);

        var sessionId = keyHolder.getKey() == null ? null : keyHolder.getKey().longValue();
        if (sessionId == null) {
            throw new IllegalStateException("Verification session could not be created.");
        }

        appendVerificationEvent(sessionId, companyId, employeeId, "session_created", "pending", Map.of("required_steps", REQUIRED_STEPS));

        return Map.of(
            "session_id", sessionId,
            "employee_id", employeeId,
            "required_steps", REQUIRED_STEPS,
            "expires_at", expiresAt.toString(),
            "status", "pending"
        );
    }

    @Transactional
    public Map<String, Object> createVerificationCaptureUpload(long companyId, long sessionId, Map<String, Object> payload) {
        requireFaceEnabled();
        requireBiometricStorageEnabled();
        var session = loadVerificationSession(companyId, sessionId);
        ensureVerificationSessionPending(session);
        var step = normalizeStep(payload.get("step"));
        var contentType = normalizeImageContentType(payload.get("content_type"));
        var objectKey = buildVerificationObjectKey(companyId, session.employeeId(), sessionId, step, contentType);
        removePreviousVerificationCapture(sessionId, step);
        var upload = objectStorageService.presignUpload(
            biometricBucket(),
            objectKey,
            contentType,
            objectStorageProperties.getMinio().getPresignExpirySeconds()
        );
        appendVerificationEvent(sessionId, companyId, session.employeeId(), "capture_requested", "pending", Map.of(
            "step", step,
            "object_key", objectKey,
            "content_type", contentType
        ));
        return presignBody(upload, step);
    }

    @Transactional
    public Map<String, Object> completeVerificationSession(long companyId, long userId, long sessionId) {
        requireFaceEnabled();
        requireBiometricStorageEnabled();
        var session = loadVerificationSession(companyId, sessionId);
        ensureVerificationSessionPending(session);

        var capturesByStep = loadVerificationCaptureRequests(sessionId);
        if (capturesByStep.size() != REQUIRED_STEPS.size()) {
            throw new IllegalArgumentException("Verification requires 3 captures.");
        }

        var enrollment = loadLatestEnrollment(companyId, session.employeeId());
        if (enrollment == null || !"active".equals(enrollment.status())) {
            throw new IllegalArgumentException("Employee is not enrolled for face verification.");
        }

        var enrollmentEmbeddings = loadEnrollmentEmbeddings(enrollment.id());
        if (enrollmentEmbeddings.size() != REQUIRED_STEPS.size()) {
            throw new IllegalArgumentException("Enrollment data is incomplete.");
        }

        var captureReferences = new ArrayList<FaceVerificationClient.CaptureReference>();
        for (var step : REQUIRED_STEPS) {
            var objectKey = capturesByStep.get(step);
            if (objectKey == null || !objectStorageService.objectExists(biometricBucket(), objectKey)) {
                throw new IllegalArgumentException("Verification capture upload is missing.");
            }
            captureReferences.add(new FaceVerificationClient.CaptureReference(
                step,
                objectStorageService.presignServiceDownload(
                    biometricBucket(),
                    objectKey,
                    objectStorageProperties.getMinio().getPresignExpirySeconds()
                )
            ));
        }

        var result = faceVerificationClient.verify(captureReferences, enrollmentEmbeddings);
        var matched = result != null && "success".equalsIgnoreCase(result.status()) && result.matched() && result.livenessPassed();
        var nextStatus = matched ? "verified" : "failed";
        var livenessResult = result != null && result.livenessPassed() ? "passed" : "failed";
        var verificationResult = matched ? "matched" : "rejected";
        var failureReason = result == null ? "Verification failed." : result.failureReason();

        jdbcTemplate.update(
            """
                UPDATE hr_face_verification_sessions
                SET status = ?,
                    liveness_result = ?,
                    verification_result = ?,
                    matched_score = ?,
                    failure_reason = ?,
                    completed_at = ?
                WHERE id = ? AND company_id = ?
                """,
            nextStatus,
            livenessResult,
            verificationResult,
            result == null ? null : result.matchScore(),
            matched ? null : coalesce(failureReason, "Face verification failed."),
            LocalDateTime.now(),
            sessionId,
            companyId
        );

        appendVerificationEvent(sessionId, companyId, session.employeeId(), "verification_completed", nextStatus, Map.of(
            "matched", matched,
            "liveness_passed", result != null && result.livenessPassed(),
            "match_score", result == null ? null : result.matchScore(),
            "failure_reason", matched ? null : coalesce(failureReason, "Face verification failed.")
        ));

        for (var objectKey : capturesByStep.values()) {
            objectStorageService.deleteObject(biometricBucket(), objectKey);
        }

        return Map.of(
            "session_id", sessionId,
            "employee_id", session.employeeId(),
            "status", nextStatus,
            "matched", matched,
            "liveness_passed", result != null && result.livenessPassed(),
            "match_score", result == null ? null : result.matchScore(),
            "failure_reason", matched ? null : coalesce(failureReason, "Face verification failed.")
        );
    }

    @Transactional
    public void consumeSuccessfulVerificationSession(long companyId, long employeeId, Long sessionId) {
        requireFaceEnabled();
        if (sessionId == null || sessionId <= 0) {
            throw new IllegalArgumentException("face_verification_session_id is required for facial recognition.");
        }

        var session = loadVerificationSession(companyId, sessionId);
        if (session.employeeId() != employeeId) {
            throw new IllegalArgumentException("Face verification session does not belong to the selected employee.");
        }
        if (!"verified".equals(session.status())) {
            throw new IllegalArgumentException("Face verification session is not verified.");
        }
        if (session.consumedAt() != null) {
            throw new IllegalArgumentException("Face verification session has already been used.");
        }

        jdbcTemplate.update(
            """
                UPDATE hr_face_verification_sessions
                SET status = 'consumed',
                    consumed_at = ?
                WHERE id = ? AND company_id = ?
                """,
            LocalDateTime.now(),
            sessionId,
            companyId
        );
        appendVerificationEvent(sessionId, companyId, employeeId, "verification_consumed", "success", Map.of());
    }

    private void requireFaceEnabled() {
        if (!faceVerificationProperties.isEnabled() || !faceVerificationClient.isEnabled()) {
            throw new IllegalArgumentException("Face verification is not enabled.");
        }
    }

    private void requireBiometricStorageEnabled() {
        if (!objectStorageService.isEnabled()) {
            throw new ObjectStorageDisabledException("Object storage is not enabled.");
        }
    }

    private long parseRequiredEmployeeId(Map<String, Object> payload) {
        var raw = payload.get("employee_id");
        if (!(raw instanceof Number number) || number.longValue() <= 0) {
            throw new IllegalArgumentException("employee_id is required.");
        }
        return number.longValue();
    }

    private void ensureEmployeeExists(long companyId, long employeeId) {
        var count = jdbcTemplate.queryForObject(
            "SELECT COUNT(*) FROM hr_employees WHERE company_id = ? AND id = ?",
            Integer.class,
            companyId,
            employeeId
        );
        if (count == null || count == 0) {
            throw new NoSuchElementException("Employee not found.");
        }
    }

    private void ensureEmployeeIsEligible(long companyId, long employeeId) {
        var status = jdbcTemplate.query(
            """
                SELECT COALESCE(LOWER(status), 'active') AS status
                FROM hr_employees
                WHERE company_id = ? AND id = ?
                LIMIT 1
                """,
            (rs, rowNum) -> rs.getString("status"),
            companyId,
            employeeId
        ).stream().findFirst().orElseThrow(() -> new NoSuchElementException("Employee not found."));
        if ("terminated".equals(status)) {
            throw new IllegalArgumentException("Terminated employees cannot use face verification.");
        }
    }

    private EnrollmentRow loadEnrollment(long companyId, long enrollmentId) {
        return jdbcTemplate.query(
            """
                SELECT id, company_id, employee_id, status, enrolled_at, deleted_at, created_by
                     , expires_at
                FROM hr_face_enrollments
                WHERE company_id = ? AND id = ?
                LIMIT 1
                """,
            (rs, rowNum) -> new EnrollmentRow(
                rs.getLong("id"),
                rs.getLong("company_id"),
                rs.getLong("employee_id"),
                rs.getString("status"),
                rs.getObject("expires_at", LocalDateTime.class),
                rs.getObject("enrolled_at", LocalDateTime.class),
                rs.getObject("deleted_at", LocalDateTime.class),
                rs.getObject("created_by", Long.class)
            ),
            companyId,
            enrollmentId
        ).stream().findFirst().orElseThrow(() -> new NoSuchElementException("Enrollment session not found."));
    }

    private EnrollmentRow loadLatestEnrollment(long companyId, long employeeId) {
        return jdbcTemplate.query(
            """
                SELECT id, company_id, employee_id, status, enrolled_at, deleted_at, created_by
                     , expires_at
                FROM hr_face_enrollments
                WHERE company_id = ?
                  AND employee_id = ?
                  AND status IN ('pending', 'active')
                ORDER BY CASE status WHEN 'active' THEN 0 ELSE 1 END, id DESC
                LIMIT 1
                """,
            (rs, rowNum) -> new EnrollmentRow(
                rs.getLong("id"),
                rs.getLong("company_id"),
                rs.getLong("employee_id"),
                rs.getString("status"),
                rs.getObject("expires_at", LocalDateTime.class),
                rs.getObject("enrolled_at", LocalDateTime.class),
                rs.getObject("deleted_at", LocalDateTime.class),
                rs.getObject("created_by", Long.class)
            ),
            companyId,
            employeeId
        ).stream().findFirst().orElse(null);
    }

    private void ensureEnrollmentSessionPending(EnrollmentRow enrollment) {
        if (enrollment.expiresAt() != null && enrollment.expiresAt().isBefore(LocalDateTime.now())) {
            jdbcTemplate.update(
                "UPDATE hr_face_enrollments SET status = 'expired' WHERE id = ?",
                enrollment.id()
            );
            throw new IllegalArgumentException("Enrollment session has expired.");
        }
    }

    private List<EnrollmentCaptureRow> loadEnrollmentCaptures(long enrollmentId) {
        return jdbcTemplate.query(
            """
                SELECT id, enrollment_id, capture_step, object_key, embedding_json, status
                FROM hr_face_enrollment_captures
                WHERE enrollment_id = ?
                ORDER BY id ASC
                """,
            (rs, rowNum) -> new EnrollmentCaptureRow(
                rs.getLong("id"),
                rs.getLong("enrollment_id"),
                rs.getString("capture_step"),
                rs.getString("object_key"),
                rs.getString("embedding_json"),
                rs.getString("status")
            ),
            enrollmentId
        );
    }

    private List<List<Double>> loadEnrollmentEmbeddings(long enrollmentId) {
        var rows = loadEnrollmentCaptures(enrollmentId).stream()
            .filter((capture) -> "processed".equals(capture.status()) && capture.embeddingJson() != null && !capture.embeddingJson().isBlank())
            .toList();

        var embeddings = new ArrayList<List<Double>>();
        for (var step : REQUIRED_STEPS) {
            var row = rows.stream().filter((capture) -> step.equals(capture.captureStep())).findFirst().orElse(null);
            if (row == null) {
                continue;
            }
            embeddings.add(parseJsonList(row.embeddingJson()));
        }
        return embeddings;
    }

    private void replaceEnrollmentCaptureIfExists(long enrollmentId, String step) {
        var existing = loadEnrollmentCaptures(enrollmentId).stream()
            .filter((capture) -> step.equals(capture.captureStep()))
            .findFirst()
            .orElse(null);
        if (existing == null) {
            return;
        }
        if (objectStorageService.isEnabled() && objectStorageService.objectExists(biometricBucket(), existing.objectKey())) {
            objectStorageService.deleteObject(biometricBucket(), existing.objectKey());
        }
        jdbcTemplate.update("DELETE FROM hr_face_enrollment_captures WHERE id = ?", existing.id());
    }

    private VerificationSessionRow loadVerificationSession(long companyId, long sessionId) {
        return jdbcTemplate.query(
            """
                SELECT id, company_id, employee_id, status, auth_method, challenge_sequence_json, liveness_result, verification_result, matched_score, failure_reason, created_by, expires_at, completed_at, consumed_at
                FROM hr_face_verification_sessions
                WHERE company_id = ? AND id = ?
                LIMIT 1
                """,
            (rs, rowNum) -> new VerificationSessionRow(
                rs.getLong("id"),
                rs.getLong("company_id"),
                rs.getLong("employee_id"),
                rs.getString("status"),
                rs.getString("auth_method"),
                rs.getString("challenge_sequence_json"),
                rs.getString("liveness_result"),
                rs.getString("verification_result"),
                rs.getObject("matched_score", Double.class),
                rs.getString("failure_reason"),
                rs.getObject("created_by", Long.class),
                rs.getObject("expires_at", LocalDateTime.class),
                rs.getObject("completed_at", LocalDateTime.class),
                rs.getObject("consumed_at", LocalDateTime.class)
            ),
            companyId,
            sessionId
        ).stream().findFirst().orElseThrow(() -> new NoSuchElementException("Face verification session not found."));
    }

    private void ensureVerificationSessionPending(VerificationSessionRow session) {
        if (!"pending".equals(session.status())) {
            throw new IllegalArgumentException("Face verification session is not pending.");
        }
        if (session.expiresAt() != null && session.expiresAt().isBefore(LocalDateTime.now())) {
            jdbcTemplate.update(
                "UPDATE hr_face_verification_sessions SET status = 'expired' WHERE id = ?",
                session.id()
            );
            throw new IllegalArgumentException("Face verification session has expired.");
        }
    }

    private void appendVerificationEvent(long sessionId, long companyId, long employeeId, String eventType, String status, Map<String, Object> detail) {
        jdbcTemplate.update(
            """
                INSERT INTO hr_face_verification_events
                (session_id, company_id, employee_id, event_type, status, detail_json)
                VALUES (?, ?, ?, ?, ?, CAST(? AS JSON))
                """,
            sessionId,
            companyId,
            employeeId,
            eventType,
            status,
            toJson(detail)
        );
    }

    private Map<String, String> loadVerificationCaptureRequests(long sessionId) {
        List<Map.Entry<Long, String>> rows = jdbcTemplate.query(
            """
                SELECT id, detail_json
                FROM hr_face_verification_events
                WHERE session_id = ?
                  AND event_type = 'capture_requested'
                ORDER BY id DESC
                """,
            (rs, rowNum) -> Map.entry(rs.getLong("id"), safe(rs.getString("detail_json"))),
            sessionId
        );
        var byStep = new LinkedHashMap<String, String>();
        for (var row : rows) {
            var detail = parseJsonMap(row.getValue());
            var step = stringValue(detail.get("step"));
            var objectKey = stringValue(detail.get("object_key"));
            if (!step.isBlank() && !objectKey.isBlank() && !byStep.containsKey(step)) {
                byStep.put(step, objectKey);
            }
        }
        return byStep;
    }

    private void removePreviousVerificationCapture(long sessionId, String step) {
        List<Map.Entry<Long, String>> rows = jdbcTemplate.query(
            """
                SELECT id, detail_json
                FROM hr_face_verification_events
                WHERE session_id = ?
                  AND event_type = 'capture_requested'
                ORDER BY id DESC
                """,
            (rs, rowNum) -> Map.entry(rs.getLong("id"), safe(rs.getString("detail_json"))),
            sessionId
        );
        for (var row : rows) {
            var detail = parseJsonMap(row.getValue());
            if (!step.equals(stringValue(detail.get("step")))) {
                continue;
            }
            var objectKey = stringValue(detail.get("object_key"));
            if (objectStorageService.isEnabled() && !objectKey.isBlank() && objectStorageService.objectExists(biometricBucket(), objectKey)) {
                objectStorageService.deleteObject(biometricBucket(), objectKey);
            }
            jdbcTemplate.update("DELETE FROM hr_face_verification_events WHERE id = ?", row.getKey());
            return;
        }
    }

    private Map<String, Object> toEnrollmentMap(EnrollmentRow enrollment) {
        if (enrollment == null) {
            return null;
        }
        return Map.of(
            "id", enrollment.id(),
            "employee_id", enrollment.employeeId(),
            "status", enrollment.status(),
            "expires_at", enrollment.expiresAt() == null ? null : enrollment.expiresAt().toString(),
            "enrolled_at", enrollment.enrolledAt() == null ? null : enrollment.enrolledAt().toString(),
            "required_steps", REQUIRED_STEPS
        );
    }

    private Map<String, Object> presignBody(PresignedUpload upload, String step) {
        var body = new LinkedHashMap<String, Object>();
        body.put("step", step);
        body.put("object_key", upload.objectKey());
        body.put("upload_url", upload.uploadUrl());
        body.put("expires_at", upload.expiresAt().toString());
        body.put("upload_headers", upload.uploadHeaders());
        return body;
    }

    private String biometricBucket() {
        return objectStorageProperties.getMinio().getBucketBiometric();
    }

    private String normalizeStep(Object rawValue) {
        var value = stringValue(rawValue);
        if (!REQUIRED_STEPS.contains(value)) {
            throw new IllegalArgumentException("step must be neutral, left, or right.");
        }
        return value;
    }

    private String normalizeImageContentType(Object rawValue) {
        var value = stringValue(rawValue);
        return switch (value) {
            case "image/jpeg", "image/png", "image/webp" -> value;
            default -> throw new IllegalArgumentException("content_type must be image/jpeg, image/png, or image/webp.");
        };
    }

    private String buildEnrollmentObjectKey(long companyId, long employeeId, long enrollmentId, String step, String contentType) {
        return "hr/face/enrollments/" + companyId + "/" + employeeId + "/" + enrollmentId + "/" + step + extensionFor(contentType);
    }

    private String buildVerificationObjectKey(long companyId, long employeeId, long sessionId, String step, String contentType) {
        return "hr/face/verifications/" + companyId + "/" + employeeId + "/" + sessionId + "/" + step + extensionFor(contentType);
    }

    private String extensionFor(String contentType) {
        return switch (contentType) {
            case "image/png" -> ".png";
            case "image/webp" -> ".webp";
            default -> ".jpg";
        };
    }

    private String toJson(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException ex) {
            throw new IllegalArgumentException("payload must be valid JSON.", ex);
        }
    }

    private Map<String, Object> parseJsonMap(String value) {
        if (value == null || value.isBlank()) {
            return Map.of();
        }
        try {
            return objectMapper.readValue(value, new TypeReference<Map<String, Object>>() {});
        } catch (JsonProcessingException ex) {
            throw new IllegalArgumentException("Stored JSON is invalid.", ex);
        }
    }

    private List<Double> parseJsonList(String value) {
        if (value == null || value.isBlank()) {
            return List.of();
        }
        try {
            return objectMapper.readValue(value, new TypeReference<List<Double>>() {});
        } catch (JsonProcessingException ex) {
            throw new IllegalArgumentException("Stored embedding JSON is invalid.", ex);
        }
    }

    private String stringValue(Object value) {
        return value == null ? "" : String.valueOf(value).trim();
    }

    private String safe(String value) {
        return value == null ? "" : value;
    }

    private String coalesce(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value;
    }

    private record EnrollmentRow(
        long id,
        long companyId,
        long employeeId,
        String status,
        LocalDateTime expiresAt,
        LocalDateTime enrolledAt,
        LocalDateTime deletedAt,
        Long createdBy
    ) {
    }

    private record EnrollmentCaptureRow(
        long id,
        long enrollmentId,
        String captureStep,
        String objectKey,
        String embeddingJson,
        String status
    ) {
    }

    private record VerificationSessionRow(
        long id,
        long companyId,
        long employeeId,
        String status,
        String authMethod,
        String challengeSequenceJson,
        String livenessResult,
        String verificationResult,
        Double matchedScore,
        String failureReason,
        Long createdBy,
        LocalDateTime expiresAt,
        LocalDateTime completedAt,
        LocalDateTime consumedAt
    ) {
    }
}
