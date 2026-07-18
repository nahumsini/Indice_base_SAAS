package com.indice.erp.processTasks.kiosk;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.indice.erp.hr.attendance.kiosk.AttendanceKioskTokenService;
import com.indice.erp.kiosk.engine.KioskDefinitionStatus;
import com.indice.erp.kiosk.engine.KioskRegistryService;
import java.security.SecureRandom;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ProcessTaskKioskService {

    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    private final JdbcTemplate jdbcTemplate;
    private final ObjectMapper objectMapper;
    private final AttendanceKioskTokenService tokenService;
    private final KioskRegistryService kioskRegistry;
    private final ProcessTaskKioskIdentityService identityService;
    private final ProcessTaskKioskQueryService queries;
    private final ProcessTaskKioskCommandService commands;
    private final ProcessTaskKioskFileService files;
    private final ProcessTaskKioskViewMapper views;

    public ProcessTaskKioskService(
        JdbcTemplate jdbcTemplate,
        ObjectMapper objectMapper,
        AttendanceKioskTokenService tokenService,
        KioskRegistryService kioskRegistry,
        ProcessTaskKioskIdentityService identityService,
        ProcessTaskKioskQueryService queries,
        ProcessTaskKioskCommandService commands,
        ProcessTaskKioskFileService files,
        ProcessTaskKioskViewMapper views
    ) {
        this.jdbcTemplate = jdbcTemplate;
        this.objectMapper = objectMapper;
        this.tokenService = tokenService;
        this.kioskRegistry = kioskRegistry;
        this.identityService = identityService;
        this.queries = queries;
        this.commands = commands;
        this.files = files;
        this.views = views;
    }

    public Map<String, Object> listKiosks(long companyId) {
        return Map.of("items", loadKiosks(companyId).stream().map(views::admin).toList());
    }

    public Map<String, Object> kioskDetail(long companyId, long kioskId) {
        return views.admin(getKiosk(companyId, kioskId));
    }

    @Transactional
    public Map<String, Object> saveKiosk(long companyId, long userId, Long kioskId, Map<String, Object> payload) {
        var normalizedPayload = payload == null ? Map.<String, Object>of() : payload;
        var name = stringValue(normalizedPayload, "name");
        var code = stringValue(normalizedPayload, "code");
        if (name.isBlank() || code.isBlank()) {
            throw new IllegalArgumentException("name and code are required.");
        }

        var status = normalizeStatus(stringValue(normalizedPayload, "status"));
        var expiresAt = optionalDateTime(normalizedPayload, "expires_at", "expiresAt");
        var unitId = normalizeOptionalId(longValue(normalizedPayload, "unit_id"));
        var businessId = normalizeOptionalId(longValue(normalizedPayload, "business_id"));
        if (unitId == null || businessId == null) {
            throw new IllegalArgumentException("unit_id and business_id are required for a kiosk.");
        }
        validateScope(companyId, unitId, businessId);
        ensureUniqueCode(companyId, kioskId, code);

        var metadata = parseMetadata(normalizedPayload.get("metadata"));
        metadata.put("kiosk_type", metadata.getOrDefault("kiosk_type", "task_access"));
        var metadataJson = toJson(metadata);
        var publicAccessToken = generateUniquePublicAccessToken();

        if (kioskId != null && kioskId > 0) {
            var existing = getKiosk(companyId, kioskId);
            publicAccessToken = existing.publicAccessToken();
            jdbcTemplate.update(
                """
                    UPDATE process_task_kiosks
                    SET unit_id = ?,
                        business_id = ?,
                        code = ?,
                        name = ?,
                        status = ?,
                        expires_at = ?,
                        metadata_json = ?
                    WHERE company_id = ?
                      AND id = ?
                    """,
                unitId,
                businessId,
                code,
                name,
                status,
                expiresAt,
                metadataJson,
                companyId,
                kioskId
            );
            var saved = getKiosk(companyId, kioskId);
            kioskRegistry.registerLegacyDefinition(
                companyId, ProcessTaskKioskCapabilities.OWNER_MODULE,
                String.valueOf(metadata.get("kiosk_type")), saved.id(), saved.code(), saved.name(),
                saved.status(), saved.unitId(), saved.businessId(), instant(saved.expiresAt()),
                saved.publicAccessToken(), saved.legacyTokenRecoverable(), userId
            );
            return Map.of("kiosk", views.admin(saved));
        }

        var storageMarker = opaqueTokenMarker();
        jdbcTemplate.update(
            """
                INSERT INTO process_task_kiosks (
                    company_id, unit_id, business_id, code, name, status,
                    expires_at, public_access_token, metadata_json, created_by
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
            companyId,
            unitId,
            businessId,
            code,
            name,
            status,
            expiresAt,
            storageMarker,
            metadataJson,
            userId
        );
        var saved = getKioskByStoredAccessReference(storageMarker);
        kioskRegistry.registerLegacyDefinition(
            companyId, ProcessTaskKioskCapabilities.OWNER_MODULE,
            String.valueOf(metadata.get("kiosk_type")), saved.id(), saved.code(), saved.name(),
            saved.status(), saved.unitId(), saved.businessId(), instant(saved.expiresAt()),
            publicAccessToken, false, userId
        );
        return Map.of("kiosk", views.issued(saved, publicAccessToken));
    }

    @Transactional
    public Map<String, Object> rotatePublicAccessToken(long companyId, long userId, long kioskId) {
        getKiosk(companyId, kioskId);
        var publicAccessToken = generateUniquePublicAccessToken();
        jdbcTemplate.update(
            """
                UPDATE process_task_kiosks
                SET public_access_token = ?
                WHERE company_id = ?
                  AND id = ?
                """,
            opaqueTokenMarker(),
            companyId,
            kioskId
        );
        kioskRegistry.replacePublicToken(
            companyId, ProcessTaskKioskCapabilities.OWNER_MODULE, kioskId, publicAccessToken, userId);
        return Map.of("kiosk", views.issued(getKiosk(companyId, kioskId), publicAccessToken));
    }

    @Transactional
    public void deleteKiosk(long companyId, long userId, long kioskId) {
        getKiosk(companyId, kioskId);
        kioskRegistry.deleteDefinition(
            companyId, ProcessTaskKioskCapabilities.OWNER_MODULE, kioskId, userId, "Deleted from module administration");
        jdbcTemplate.update(
            """
                DELETE FROM process_task_kiosks
                WHERE company_id = ?
                  AND id = ?
                """,
            companyId,
            kioskId
        );
    }

    @Transactional
    public Map<String, Object> transitionKiosk(
            long companyId,
            long userId,
            long kioskId,
            KioskDefinitionStatus target,
            String reason) {
        getKiosk(companyId, kioskId);
        var definition = kioskRegistry.transition(
            companyId, ProcessTaskKioskCapabilities.OWNER_MODULE, kioskId, target, userId, reason);
        var legacyStatus = definition.status() == KioskDefinitionStatus.ACTIVE ? "active" : "inactive";
        jdbcTemplate.update(
            "UPDATE process_task_kiosks SET status = ? WHERE company_id = ? AND id = ?",
            legacyStatus, companyId, kioskId
        );
        return Map.of("kiosk", views.admin(getKiosk(companyId, kioskId)));
    }

    public Map<String, Object> publicBootstrap(String deviceToken) {
        var kiosk = getActiveKioskByPublicAccessToken(deviceToken);
        var body = new LinkedHashMap<String, Object>();
        body.put("kiosk", views.publicKiosk(kiosk));
        body.put("scope_label", views.scopeLabel(kiosk));
        body.put("auth_methods", List.of("pin"));
        body.put("inactivity_timeout_seconds", 180);
        return body;
    }

    @Transactional(noRollbackFor = IllegalArgumentException.class)
    public Map<String, Object> publicIdentify(String deviceToken, Map<String, Object> payload) {
        var kiosk = getActiveKioskByPublicAccessToken(deviceToken);
        var normalizedPayload = payload == null ? Map.<String, Object>of() : payload;
        var authMethod = normalizePublicAuthMethod(stringValue(normalizedPayload, "auth_method"));
        var credentialPayload = stringValue(normalizedPayload, "credential_payload", "credential", "pin");
        if (credentialPayload.isBlank()) {
            throw new IllegalArgumentException("credential_payload is required.");
        }

        var employee = identityService.resolveEmployeeByPin(kiosk.companyId(), credentialPayload);
        if (employee == null) {
            throw new IllegalArgumentException("Credential validation failed.");
        }

        identityService.requirePublicScope(kiosk, employee);
        var expiresAtEpochSeconds = tokenService.nextIdentificationExpiryEpochSeconds();
        var identificationToken = tokenService.createIdentificationToken(
            deviceToken,
            employee.userCompanyId(),
            authMethod,
            expiresAtEpochSeconds
        );

        var body = new LinkedHashMap<String, Object>();
        body.put("auth_method", authMethod);
        body.put("user", views.employee(employee));
        body.put("identification_token", identificationToken);
        body.put("expires_at", Instant.ofEpochSecond(expiresAtEpochSeconds).toString());
        body.put("tasks", queries.listTasks(kiosk, employee));
        body.put("assignment_options", queries.assignmentOptions(kiosk, employee.userId()));
        return body;
    }

    public Map<String, Object> publicTasks(String deviceToken, Map<String, Object> payload) {
        var context = requirePublicContext(deviceToken, payload);
        return Map.of("items", queries.listTasks(context.kiosk(), context.employee()));
    }

    @Transactional
    public Map<String, Object> publicCreateTask(String deviceToken, Map<String, Object> payload) {
        return commands.create(requirePublicContext(deviceToken, payload), payload);
    }

    @Transactional
    public Map<String, Object> publicAssignTaskResponsible(String deviceToken, long taskId, Map<String, Object> payload) {
        return commands.assignResponsible(requirePublicContext(deviceToken, payload), taskId, payload);
    }

    @Transactional
    public Map<String, Object> publicCreateAttachmentUpload(String deviceToken, long taskId, Map<String, Object> payload) {
        return files.presign(requirePublicContext(deviceToken, payload), taskId, payload);
    }

    @Transactional
    public Map<String, Object> publicRegisterAttachment(String deviceToken, long taskId, Map<String, Object> payload) {
        return files.register(requirePublicContext(deviceToken, payload), taskId, payload);
    }

    @Transactional
    public Map<String, Object> publicCompleteTask(String deviceToken, long taskId, Map<String, Object> payload) {
        return commands.complete(requirePublicContext(deviceToken, payload), taskId, payload);
    }

    private ProcessTaskPublicKioskContext requirePublicContext(String deviceToken, Map<String, Object> payload) {
        var kiosk = getActiveKioskByPublicAccessToken(deviceToken);
        var identificationToken = stringValue(payload == null ? Map.of() : payload, "identification_token");
        var claims = tokenService.verifyIdentificationToken(deviceToken, identificationToken);
        var employee = identityService.loadEmployee(kiosk.companyId(), claims.userCompanyId());
        identityService.requireScope(kiosk, employee);
        return new ProcessTaskPublicKioskContext(kiosk, employee);
    }

    private List<ProcessTaskKioskRow> loadKiosks(long companyId) {
        return jdbcTemplate.query(
            """
                SELECT kiosk.id,
                       kiosk.company_id,
                       kiosk.unit_id,
                       unit.name AS unit_name,
                       kiosk.business_id,
                       business.name AS business_name,
                       kiosk.code,
                       kiosk.name,
                       COALESCE(LOWER(kiosk.status), 'active') AS status,
                       COALESCE(definition.status,
                           CASE WHEN LOWER(COALESCE(kiosk.status, 'active')) = 'active'
                                THEN 'ACTIVE' ELSE 'DISABLED' END) AS engine_status,
                       kiosk.expires_at,
                       kiosk.public_access_token,
                       COALESCE(definition.public_token_hint, RIGHT(kiosk.public_access_token, 8)) AS public_token_hint,
                       COALESCE(definition.legacy_token_recoverable, 1) AS legacy_token_recoverable,
                       kiosk.metadata_json,
                       kiosk.created_at,
                       kiosk.updated_at
                FROM process_task_kiosks kiosk
                LEFT JOIN units unit ON unit.id = kiosk.unit_id
                LEFT JOIN businesses business ON business.id = kiosk.business_id
                LEFT JOIN kiosk_definitions definition
                  ON definition.owner_module = 'PROCESS_TASKS'
                 AND definition.legacy_reference_id = kiosk.id
                WHERE kiosk.company_id = ?
                ORDER BY CASE LOWER(COALESCE(kiosk.status, 'active')) WHEN 'active' THEN 0 ELSE 1 END,
                         kiosk.name ASC
                """,
            (rs, rowNum) -> mapKiosk(rs),
            companyId
        );
    }

    private ProcessTaskKioskRow getKiosk(long companyId, long kioskId) {
        var rows = jdbcTemplate.query(
            """
                SELECT kiosk.id,
                       kiosk.company_id,
                       kiosk.unit_id,
                       unit.name AS unit_name,
                       kiosk.business_id,
                       business.name AS business_name,
                       kiosk.code,
                       kiosk.name,
                       COALESCE(LOWER(kiosk.status), 'active') AS status,
                       COALESCE(definition.status,
                           CASE WHEN LOWER(COALESCE(kiosk.status, 'active')) = 'active'
                                THEN 'ACTIVE' ELSE 'DISABLED' END) AS engine_status,
                       kiosk.expires_at,
                       kiosk.public_access_token,
                       COALESCE(definition.public_token_hint, RIGHT(kiosk.public_access_token, 8)) AS public_token_hint,
                       COALESCE(definition.legacy_token_recoverable, 1) AS legacy_token_recoverable,
                       kiosk.metadata_json,
                       kiosk.created_at,
                       kiosk.updated_at
                FROM process_task_kiosks kiosk
                LEFT JOIN units unit ON unit.id = kiosk.unit_id
                LEFT JOIN businesses business ON business.id = kiosk.business_id
                LEFT JOIN kiosk_definitions definition
                  ON definition.owner_module = 'PROCESS_TASKS'
                 AND definition.legacy_reference_id = kiosk.id
                WHERE kiosk.company_id = ?
                  AND kiosk.id = ?
                LIMIT 1
                """,
            (rs, rowNum) -> mapKiosk(rs),
            companyId,
            kioskId
        );
        if (rows.isEmpty()) {
            throw new NoSuchElementException("Task kiosk not found.");
        }
        return rows.getFirst();
    }

    private ProcessTaskKioskRow getKioskByStoredAccessReference(String accessReference) {
        var rows = jdbcTemplate.query(
            kioskSelect() + " WHERE kiosk.public_access_token = ? LIMIT 1",
            (rs, rowNum) -> mapKiosk(rs),
            accessReference
        );
        if (rows.isEmpty()) {
            throw new NoSuchElementException("Task kiosk not found.");
        }
        return rows.getFirst();
    }

    private ProcessTaskKioskRow getActiveKioskByPublicAccessToken(String publicAccessToken) {
        var definition = kioskRegistry.resolvePublic(
            ProcessTaskKioskCapabilities.OWNER_MODULE, publicAccessToken);
        if (definition.legacyReferenceId() == null) {
            throw new NoSuchElementException("Task kiosk not found.");
        }
        return getKiosk(definition.companyId(), definition.legacyReferenceId());
    }

    private String kioskSelect() {
        return """
            SELECT kiosk.id,
                   kiosk.company_id,
                   kiosk.unit_id,
                   unit.name AS unit_name,
                   kiosk.business_id,
                   business.name AS business_name,
                   kiosk.code,
                   kiosk.name,
                   COALESCE(LOWER(kiosk.status), 'active') AS status,
                   COALESCE(definition.status,
                       CASE WHEN LOWER(COALESCE(kiosk.status, 'active')) = 'active'
                            THEN 'ACTIVE' ELSE 'DISABLED' END) AS engine_status,
                   kiosk.expires_at,
                   kiosk.public_access_token,
                   COALESCE(definition.public_token_hint, RIGHT(kiosk.public_access_token, 8)) AS public_token_hint,
                   COALESCE(definition.legacy_token_recoverable, 1) AS legacy_token_recoverable,
                   kiosk.metadata_json,
                   kiosk.created_at,
                   kiosk.updated_at
            FROM process_task_kiosks kiosk
            LEFT JOIN units unit ON unit.id = kiosk.unit_id
            LEFT JOIN businesses business ON business.id = kiosk.business_id
            LEFT JOIN kiosk_definitions definition
              ON definition.owner_module = 'PROCESS_TASKS'
             AND definition.legacy_reference_id = kiosk.id
            """;
    }

    private ProcessTaskKioskRow mapKiosk(ResultSet rs) throws SQLException {
        return new ProcessTaskKioskRow(
            rs.getLong("id"),
            rs.getLong("company_id"),
            rs.getObject("unit_id", Long.class),
            fallback(rs.getString("unit_name"), ""),
            rs.getObject("business_id", Long.class),
            fallback(rs.getString("business_name"), ""),
            fallback(rs.getString("code"), ""),
            fallback(rs.getString("name"), ""),
            fallback(rs.getString("status"), "active"),
            fallback(rs.getString("engine_status"), "ACTIVE"),
            toDateTimeString(rs, "expires_at"),
            fallback(rs.getString("public_access_token"), ""),
            fallback(rs.getString("public_token_hint"), ""),
            rs.getBoolean("legacy_token_recoverable"),
            fallback(rs.getString("metadata_json"), ""),
            toDateTimeString(rs, "created_at"),
            toDateTimeString(rs, "updated_at")
        );
    }

    private void validateScope(long companyId, Long unitId, Long businessId) {
        if (unitId != null) {
            var count = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM units WHERE id = ? AND (company_id = ? OR company_id IS NULL)",
                Integer.class,
                unitId,
                companyId
            );
            if (count == null || count == 0) {
                throw new IllegalArgumentException("Selected unit does not exist.");
            }
        }
        if (businessId != null) {
            var count = jdbcTemplate.queryForObject(
                """
                    SELECT COUNT(*)
                    FROM businesses
                    WHERE id = ?
                      AND (company_id = ? OR company_id IS NULL)
                      AND (? IS NULL OR unit_id = ?)
                    """,
                Integer.class,
                businessId,
                companyId,
                unitId,
                unitId
            );
            if (count == null || count == 0) {
                throw new IllegalArgumentException("Selected business does not exist in this unit.");
            }
        }
    }

    private void ensureUniqueCode(long companyId, Long kioskId, String code) {
        var count = jdbcTemplate.queryForObject(
            """
                SELECT COUNT(*)
                FROM process_task_kiosks
                WHERE company_id = ?
                  AND code = ?
                  AND (? IS NULL OR id <> ?)
                """,
            Integer.class,
            companyId,
            code,
            kioskId,
            kioskId
        );
        if (count != null && count > 0) {
            throw new IllegalArgumentException("Task kiosk code must be unique.");
        }
    }

    private String generateUniquePublicAccessToken() {
        var randomBytes = new byte[32];
        SECURE_RANDOM.nextBytes(randomBytes);
        return java.util.Base64.getUrlEncoder().withoutPadding().encodeToString(randomBytes);
    }

    private String opaqueTokenMarker() {
        return "opaque:" + UUID.randomUUID();
    }

    private Instant instant(String localDateTime) {
        if (localDateTime == null || localDateTime.isBlank()) {
            return null;
        }
        return LocalDateTime.parse(localDateTime).atZone(ZoneId.systemDefault()).toInstant();
    }

    private Map<String, Object> parseMetadata(Object value) {
        if (value == null) {
            return new LinkedHashMap<>();
        }
        if (value instanceof Map<?, ?> map) {
            var result = new LinkedHashMap<String, Object>();
            map.forEach((key, mapValue) -> {
                if (key != null) {
                    result.put(String.valueOf(key), mapValue);
                }
            });
            return result;
        }
        return parseMetadata(String.valueOf(value));
    }

    private Map<String, Object> parseMetadata(String metadataJson) {
        if (metadataJson == null || metadataJson.isBlank()) {
            return new LinkedHashMap<>();
        }
        try {
            return objectMapper.readValue(metadataJson, new TypeReference<LinkedHashMap<String, Object>>() {
            });
        } catch (Exception ignored) {
            return new LinkedHashMap<>();
        }
    }

    private String toJson(Map<String, Object> value) {
        try {
            return objectMapper.writeValueAsString(value == null ? Map.of() : value);
        } catch (Exception ex) {
            throw new IllegalArgumentException("metadata must be valid JSON.");
        }
    }

    private String normalizeStatus(String value) {
        var normalized = value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
        return switch (normalized) {
            case "", "active", "activo" -> "active";
            case "inactive", "inactivo", "disabled" -> "inactive";
            default -> throw new IllegalArgumentException("Unsupported status.");
        };
    }

    private LocalDateTime optionalDateTime(Map<String, Object> payload, String... keys) {
        var value = nullableString(payload, keys);
        if (value == null || value.isBlank()) {
            return null;
        }
        try {
            return LocalDateTime.parse(value.trim());
        } catch (java.time.format.DateTimeParseException ex) {
            throw new IllegalArgumentException("expires_at must be a valid local date and time.");
        }
    }

    private String normalizePublicAuthMethod(String value) {
        var normalized = value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
        return switch (normalized) {
            case "", "pin" -> "pin";
            default -> throw new IllegalArgumentException("Public kiosk auth_method must be pin.");
        };
    }

    private Long normalizeOptionalId(Long value) {
        return value == null || value <= 0 ? null : value;
    }

    private Long longValue(Map<String, Object> payload, String... keys) {
        if (payload == null) {
            return null;
        }
        for (var key : keys) {
            var value = payload.get(key);
            if (value == null) {
                continue;
            }
            if (value instanceof Number number) {
                return number.longValue();
            }
            var text = String.valueOf(value).trim();
            if (!text.isBlank()) {
                return Long.parseLong(text);
            }
        }
        return null;
    }

    private String stringValue(Map<String, Object> payload, String... keys) {
        if (payload == null) {
            return "";
        }
        for (var key : keys) {
            var value = payload.get(key);
            if (value != null) {
                return String.valueOf(value).trim();
            }
        }
        return "";
    }

    private String nullableString(Map<String, Object> payload, String... keys) {
        var value = stringValue(payload, keys);
        return value.isBlank() ? null : value;
    }

    private String fallback(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value;
    }

    private Long zeroToNull(Long value) {
        return value == null || value == 0 ? null : value;
    }

    private String toDateTimeString(ResultSet rs, String column) throws SQLException {
        var timestamp = rs.getTimestamp(column);
        return timestamp == null ? null : timestamp.toLocalDateTime().toString();
    }

}
