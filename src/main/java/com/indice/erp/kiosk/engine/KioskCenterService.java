package com.indice.erp.kiosk.engine;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

/** Read model for the transversal, security-only Kiosk Center surface. */
@Service
public class KioskCenterService {

    private static final TypeReference<Map<String, Object>> MAP_TYPE = new TypeReference<>() {};
    private final JdbcTemplate jdbcTemplate;
    private final ObjectMapper objectMapper;

    public KioskCenterService(JdbcTemplate jdbcTemplate, ObjectMapper objectMapper) {
        this.jdbcTemplate = jdbcTemplate;
        this.objectMapper = objectMapper;
    }

    public List<Map<String, Object>> list(long companyId) {
        return jdbcTemplate.query(centerSelect()
                + " WHERE definition.company_id = ?"
                + " AND definition.code NOT LIKE 'INDICE-EMPLOYEE-TOOL-%'"
                + " ORDER BY definition.owner_module ASC, definition.name ASC",
            this::mapCenterRow,
            companyId
        );
    }

    public List<Map<String, Object>> list(long companyId, Collection<String> ownerModules) {
        var modules = normalizedOwnerModules(ownerModules);
        if (modules.isEmpty()) {
            return List.of();
        }
        var parameters = new ArrayList<Object>();
        parameters.add(companyId);
        parameters.addAll(modules);
        return jdbcTemplate.query(centerSelect()
                + " WHERE definition.company_id = ?"
                + " AND definition.owner_module IN ("
                + String.join(", ", Collections.nCopies(modules.size(), "?")) + ")"
                + " AND definition.code NOT LIKE 'INDICE-EMPLOYEE-TOOL-%'"
                + " ORDER BY definition.owner_module ASC, definition.name ASC",
            this::mapCenterRow,
            parameters.toArray()
        );
    }

    public List<Map<String, Object>> list(long companyId, Map<String, OwnerScope> ownerScopes) {
        var parameters = new ArrayList<Object>();
        parameters.add(companyId);
        var ownerPredicate = ownerScopePredicate(ownerScopes, parameters);
        if (ownerPredicate.isBlank()) {
            return List.of();
        }
        return jdbcTemplate.query(centerSelect()
                + " WHERE definition.company_id = ?"
                + " AND (" + ownerPredicate + ")"
                + " AND definition.code NOT LIKE 'INDICE-EMPLOYEE-TOOL-%'"
                + " ORDER BY definition.owner_module ASC, definition.name ASC",
            this::mapCenterRow,
            parameters.toArray()
        );
    }

    public Map<String, Object> detail(long companyId, long kioskDefinitionId) {
        var rows = jdbcTemplate.query(centerSelect()
                + " WHERE definition.company_id = ? AND definition.id = ?"
                + " AND definition.code NOT LIKE 'INDICE-EMPLOYEE-TOOL-%' LIMIT 1",
            this::mapCenterRow,
            companyId,
            kioskDefinitionId
        );
        if (rows.isEmpty()) {
            throw new KioskUnavailableException();
        }
        return rows.getFirst();
    }

    public Map<String, Object> detail(
            long companyId,
            long kioskDefinitionId,
            Collection<String> ownerModules) {
        var modules = normalizedOwnerModules(ownerModules);
        if (modules.isEmpty()) {
            throw new KioskUnavailableException();
        }
        var parameters = new ArrayList<Object>();
        parameters.add(companyId);
        parameters.add(kioskDefinitionId);
        parameters.addAll(modules);
        var rows = jdbcTemplate.query(centerSelect()
                + " WHERE definition.company_id = ? AND definition.id = ?"
                + " AND definition.owner_module IN ("
                + String.join(", ", Collections.nCopies(modules.size(), "?")) + ")"
                + " AND definition.code NOT LIKE 'INDICE-EMPLOYEE-TOOL-%' LIMIT 1",
            this::mapCenterRow,
            parameters.toArray()
        );
        if (rows.isEmpty()) {
            throw new KioskUnavailableException();
        }
        return rows.getFirst();
    }

    public Map<String, Object> detail(
            long companyId,
            long kioskDefinitionId,
            Map<String, OwnerScope> ownerScopes) {
        var parameters = new ArrayList<Object>();
        parameters.add(companyId);
        parameters.add(kioskDefinitionId);
        var ownerPredicate = ownerScopePredicate(ownerScopes, parameters);
        if (ownerPredicate.isBlank()) {
            throw new KioskUnavailableException();
        }
        var rows = jdbcTemplate.query(centerSelect()
                + " WHERE definition.company_id = ? AND definition.id = ?"
                + " AND (" + ownerPredicate + ")"
                + " AND definition.code NOT LIKE 'INDICE-EMPLOYEE-TOOL-%' LIMIT 1",
            this::mapCenterRow,
            parameters.toArray()
        );
        if (rows.isEmpty()) {
            throw new KioskUnavailableException();
        }
        return rows.getFirst();
    }

    public List<Map<String, Object>> audit(long companyId, long kioskDefinitionId) {
        // Resolve first so another company's identifier is indistinguishable from a missing kiosk.
        detail(companyId, kioskDefinitionId);
        return auditRows(companyId, kioskDefinitionId);
    }

    public HistoricalKioskDefinition historicalDefinition(
            long companyId,
            long historicalKioskId) {
        var rows = jdbcTemplate.query(
            """
                SELECT owner_module,
                       JSON_UNQUOTE(JSON_EXTRACT(snapshot_json, '$.kiosk_type')) AS kiosk_type,
                       JSON_UNQUOTE(JSON_EXTRACT(snapshot_json, '$.legacy_reference_id')) AS legacy_reference_id,
                       JSON_UNQUOTE(JSON_EXTRACT(snapshot_json, '$.unit_id')) AS unit_id,
                       JSON_UNQUOTE(JSON_EXTRACT(snapshot_json, '$.business_id')) AS business_id
                FROM kiosk_audit_events
                WHERE company_id = ? AND historical_kiosk_id = ?
                  AND snapshot_json IS NOT NULL
                ORDER BY created_at DESC, id DESC
                LIMIT 1
                """,
            (rs, rowNum) -> new HistoricalKioskDefinition(
                historicalKioskId, rs.getString("owner_module"), rs.getString("kiosk_type"),
                parseLong(rs.getString("legacy_reference_id")),
                parseLong(rs.getString("unit_id")), parseLong(rs.getString("business_id"))),
            companyId, historicalKioskId);
        if (rows.isEmpty()) {
            throw new KioskUnavailableException();
        }
        return rows.getFirst();
    }

    public List<Map<String, Object>> auditHistorical(long companyId, long historicalKioskId) {
        historicalDefinition(companyId, historicalKioskId);
        return auditRows(companyId, historicalKioskId);
    }

    private List<Map<String, Object>> auditRows(long companyId, long kioskDefinitionId) {
        return jdbcTemplate.query(
            """
                SELECT event_id, request_id, action_id, session_id, event_type, outcome,
                       actor_type, actor_id, capability_key, module_reference,
                       snapshot_json, created_at
                FROM kiosk_audit_events
                WHERE company_id = ?
                  AND historical_kiosk_id = ?
                ORDER BY created_at DESC, id DESC
                LIMIT 200
                """,
            (rs, rowNum) -> {
                var event = new LinkedHashMap<String, Object>();
                event.put("event_id", rs.getString("event_id"));
                put(event, "request_id", rs.getString("request_id"));
                put(event, "action_id", rs.getString("action_id"));
                put(event, "session_id", rs.getString("session_id"));
                event.put("event_type", rs.getString("event_type"));
                event.put("outcome", rs.getString("outcome"));
                put(event, "actor_type", rs.getString("actor_type"));
                put(event, "actor_id", rs.getObject("actor_id", Long.class));
                put(event, "capability", rs.getString("capability_key"));
                put(event, "module_reference", rs.getString("module_reference"));
                var snapshot = jsonMap(rs.getString("snapshot_json"));
                if (!snapshot.isEmpty()) {
                    event.put("snapshot", snapshot);
                }
                event.put("created_at", rs.getTimestamp("created_at").toInstant().toString());
                return Map.copyOf(event);
            },
            companyId,
            kioskDefinitionId
        );
    }

    private String centerSelect() {
        return """
            SELECT definition.id, definition.company_id, definition.owner_module,
                   definition.kiosk_type, definition.legacy_reference_id, definition.code,
                   definition.name, definition.description, definition.status,
                   definition.unit_id, unit.name AS unit_name,
                   definition.business_id, business.name AS business_name,
                   definition.location_id, definition.access_level, definition.expires_at,
                   definition.public_token_hint, definition.configuration_version,
                   definition.adapter_version, definition.last_seen_at,
                   (definition.protected_public_token IS NOT NULL
                    AND definition.protected_public_token <> '') AS access_recoverable,
                   (SELECT MAX(session.last_activity_at)
                      FROM kiosk_sessions session
                     WHERE session.kiosk_definition_id = definition.id) AS session_activity_at,
                   (SELECT MAX(COALESCE(action.completed_at, action.requested_at))
                      FROM kiosk_actions action
                     WHERE action.kiosk_definition_id = definition.id) AS action_activity_at,
                   (SELECT COUNT(*)
                      FROM kiosk_actions action
                     WHERE action.kiosk_definition_id = definition.id
                       AND action.status = 'FAILED'
                       AND action.requested_at >= CURRENT_TIMESTAMP - INTERVAL 1 HOUR) AS recent_failures
            FROM kiosk_definitions definition
            LEFT JOIN units unit
              ON unit.id = definition.unit_id
             AND (unit.company_id = definition.company_id OR unit.company_id IS NULL)
            LEFT JOIN businesses business
              ON business.id = definition.business_id
             AND (business.company_id = definition.company_id OR business.company_id IS NULL)
            """;
    }

    private Map<String, Object> mapCenterRow(ResultSet rs, int rowNum) throws SQLException {
        var row = new LinkedHashMap<String, Object>();
        var status = KioskDefinitionStatus.valueOf(rs.getString("status"));
        var expires = rs.getTimestamp("expires_at");
        var expiresAt = expires == null ? null : expires.toInstant();
        if (status == KioskDefinitionStatus.ACTIVE && expiresAt != null && !expiresAt.isAfter(Instant.now())) {
            status = KioskDefinitionStatus.EXPIRED;
        }
        row.put("id", rs.getLong("id"));
        row.put("company_id", rs.getLong("company_id"));
        row.put("owner_module", rs.getString("owner_module"));
        row.put("kiosk_type", rs.getString("kiosk_type"));
        put(row, "legacy_reference_id", rs.getObject("legacy_reference_id", Long.class));
        row.put("code", rs.getString("code"));
        row.put("name", rs.getString("name"));
        put(row, "description", rs.getString("description"));
        row.put("status", status.name());
        row.put("access_level", rs.getString("access_level"));
        row.put("access_methods", accessMethods(rs.getString("access_level")));
        put(row, "unit_id", rs.getObject("unit_id", Long.class));
        put(row, "unit_name", rs.getString("unit_name"));
        put(row, "business_id", rs.getObject("business_id", Long.class));
        put(row, "business_name", rs.getString("business_name"));
        put(row, "location_id", rs.getObject("location_id", Long.class));
        put(row, "expires_at", expiresAt == null ? null : expiresAt.toString());
        row.put("public_token_hint", rs.getString("public_token_hint"));
        row.put("configuration_version", rs.getInt("configuration_version"));
        row.put("adapter_version", rs.getInt("adapter_version"));
        row.put("access_recoverable", rs.getBoolean("access_recoverable"));
        var lastSeen = instant(rs.getTimestamp("last_seen_at"));
        var sessionActivity = instant(rs.getTimestamp("session_activity_at"));
        var actionActivity = instant(rs.getTimestamp("action_activity_at"));
        put(row, "last_seen_at", lastSeen == null ? null : lastSeen.toString());
        var lastActivity = latest(lastSeen, sessionActivity, actionActivity);
        put(row, "last_activity_at", lastActivity == null ? null : lastActivity.toString());
        var failures = rs.getInt("recent_failures");
        row.put("risk_signals", riskSignals(status, expiresAt, failures));
        return Map.copyOf(row);
    }

    private List<String> accessMethods(String accessLevel) {
        return switch (KioskAccessLevel.valueOf(accessLevel)) {
            case PUBLIC -> List.of();
            case IDENTIFIED -> List.of("IDENTIFICATION");
            case VERIFIED -> List.of("EMAIL_OTP");
            case CONTROLLED -> List.of("PIN", "INDEX_SESSION");
        };
    }

    private List<String> riskSignals(
            KioskDefinitionStatus status,
            Instant expiresAt,
            int recentFailures) {
        var signals = new ArrayList<String>();
        if (status == KioskDefinitionStatus.EXPIRED) {
            signals.add("EXPIRED");
        } else if (expiresAt != null && expiresAt.isBefore(Instant.now().plus(7, ChronoUnit.DAYS))) {
            signals.add("EXPIRING_SOON");
        }
        if (status == KioskDefinitionStatus.REVOKED) {
            signals.add("REVOKED");
        }
        if (recentFailures >= 5) {
            signals.add("REPEATED_FAILURES");
        }
        return List.copyOf(signals);
    }

    private Map<String, Object> jsonMap(String value) {
        if (value == null || value.isBlank()) {
            return Map.of();
        }
        try {
            return objectMapper.readValue(value, MAP_TYPE);
        } catch (JsonProcessingException ex) {
            return Map.of("unavailable", true);
        }
    }

    private void put(Map<String, Object> target, String key, Object value) {
        if (value != null) {
            target.put(key, value);
        }
    }

    private Instant instant(java.sql.Timestamp value) {
        return value == null ? null : value.toInstant();
    }

    private Instant latest(Instant... values) {
        Instant latest = null;
        for (var value : values) {
            if (value != null && (latest == null || value.isAfter(latest))) {
                latest = value;
            }
        }
        return latest;
    }

    private Long parseLong(String value) {
        if (value == null || value.isBlank() || "null".equalsIgnoreCase(value)) return null;
        try {
            return Long.parseLong(value);
        } catch (NumberFormatException ignored) {
            return null;
        }
    }

    private List<String> normalizedOwnerModules(Collection<String> ownerModules) {
        if (ownerModules == null) {
            return List.of();
        }
        return ownerModules.stream()
            .filter(value -> value != null && !value.isBlank())
            .map(value -> value.trim().toUpperCase(java.util.Locale.ROOT))
            .distinct()
            .sorted()
            .toList();
    }

    static String ownerScopePredicate(Map<String, OwnerScope> ownerScopes, List<Object> parameters) {
        if (ownerScopes == null || ownerScopes.isEmpty()) {
            return "";
        }
        var clauses = new ArrayList<String>();
        ownerScopes.entrySet().stream()
            .filter(entry -> entry.getKey() != null && !entry.getKey().isBlank() && entry.getValue() != null)
            .sorted(Map.Entry.comparingByKey(String.CASE_INSENSITIVE_ORDER))
            .forEach(entry -> {
                var ownerModule = entry.getKey().trim().toUpperCase(java.util.Locale.ROOT);
                var scope = entry.getValue();
                parameters.add(ownerModule);
                switch (scope.type()) {
                    case CORPORATE_OFFICE -> clauses.add("definition.owner_module = ?");
                    case UNIT_HEADQUARTERS -> {
                        if (scope.unitId() == null) {
                            clauses.add("definition.owner_module = ? AND 1 = 0");
                        } else {
                            clauses.add("definition.owner_module = ? AND (definition.unit_id = ?"
                                + " OR definition.business_id IN (SELECT scoped_business.id FROM businesses scoped_business"
                                + " WHERE scoped_business.unit_id = ?"
                                + " AND (scoped_business.company_id = definition.company_id OR scoped_business.company_id IS NULL)))");
                            parameters.add(scope.unitId());
                            parameters.add(scope.unitId());
                        }
                    }
                    case BUSINESS_OFFICE -> {
                        if (scope.businessId() == null) {
                            clauses.add("definition.owner_module = ? AND 1 = 0");
                        } else {
                            clauses.add("definition.owner_module = ? AND definition.business_id = ?");
                            parameters.add(scope.businessId());
                        }
                    }
                }
            });
        return String.join(" OR ", clauses);
    }

    public record OwnerScope(Type type, Long unitId, Long businessId) {

        public OwnerScope {
            Objects.requireNonNull(type, "type");
        }

        public static OwnerScope corporateOffice() {
            return new OwnerScope(Type.CORPORATE_OFFICE, null, null);
        }

        public static OwnerScope unitHeadquarters(Long unitId) {
            return new OwnerScope(Type.UNIT_HEADQUARTERS, unitId, null);
        }

        public static OwnerScope businessOffice(Long unitId, Long businessId) {
            return new OwnerScope(Type.BUSINESS_OFFICE, unitId, businessId);
        }

        public enum Type {
            CORPORATE_OFFICE,
            UNIT_HEADQUARTERS,
            BUSINESS_OFFICE
        }
    }

    public record HistoricalKioskDefinition(
            long id,
            String ownerModule,
            String kioskType,
            Long legacyReferenceId,
            Long unitId,
            Long businessId) {
    }
}
