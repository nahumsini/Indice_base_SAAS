package com.indice.erp.kiosk.engine;

import com.indice.erp.access.ModuleSlugNormalizer;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

/** Exact Employee Kiosk Center assignments shared by Config Center and the launcher. */
@Service
public class KioskEmployeeAccessService {

    private final JdbcTemplate jdbcTemplate;

    public KioskEmployeeAccessService(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public boolean hasAssignmentPayload(Map<String, Object> payload) {
        return payload != null && payload.containsKey("kiosk_definition_ids");
    }

    public List<Long> normalizeDefinitionIds(Object rawValue) {
        if (rawValue == null) {
            return List.of();
        }
        if (!(rawValue instanceof Collection<?> values)) {
            throw new IllegalArgumentException("kiosk_definition_ids must be a list.");
        }
        var result = new LinkedHashSet<Long>();
        for (var value : values) {
            final long id;
            try {
                id = value instanceof Number number
                    ? number.longValue()
                    : Long.parseLong(String.valueOf(value));
            } catch (NumberFormatException failure) {
                throw new IllegalArgumentException("Every kiosk_definition_id must be numeric.");
            }
            if (id <= 0) {
                throw new IllegalArgumentException("Every kiosk_definition_id must be positive.");
            }
            result.add(id);
        }
        return List.copyOf(result);
    }

    public List<Long> assignedToUser(long companyId, long userId) {
        return jdbcTemplate.query(
            """
                SELECT DISTINCT grant_row.kiosk_definition_id
                FROM kiosk_grants grant_row
                INNER JOIN kiosk_definitions definition
                    ON definition.id = grant_row.kiosk_definition_id
                WHERE definition.company_id = ?
                  AND definition.audience = 'EMPLOYEE'
                  AND definition.employee_center_enabled = 1
                  AND grant_row.identity_type = 'USER'
                  AND grant_row.identity_id = ?
                  AND grant_row.capability_key = '*'
                  AND grant_row.status = 'ACTIVE'
                ORDER BY grant_row.kiosk_definition_id
                """,
            (rs, rowNum) -> rs.getLong("kiosk_definition_id"),
            companyId, userId
        );
    }

    public List<Long> assignedToInvitation(long invitationId) {
        return jdbcTemplate.query(
            """
                SELECT kiosk_definition_id
                FROM user_invitation_kiosk_assignments
                WHERE invitation_id = ?
                ORDER BY kiosk_definition_id
                """,
            (rs, rowNum) -> rs.getLong("kiosk_definition_id"),
            invitationId
        );
    }

    public List<Map<String, Object>> catalog(long companyId) {
        return jdbcTemplate.query(
            """
                SELECT definition.id, definition.name, definition.owner_module,
                       definition.kiosk_type, definition.unit_id,
                       COALESCE(unit_ref.name, '') AS unit_name,
                       definition.business_id,
                       COALESCE(business_ref.name, '') AS business_name,
                       definition.access_level
                FROM kiosk_definitions definition
                LEFT JOIN units unit_ref ON unit_ref.id = definition.unit_id
                LEFT JOIN businesses business_ref ON business_ref.id = definition.business_id
                WHERE definition.company_id = ?
                  AND definition.audience = 'EMPLOYEE'
                  AND definition.employee_center_enabled = 1
                  AND definition.status = 'ACTIVE'
                  AND (definition.expires_at IS NULL OR definition.expires_at > CURRENT_TIMESTAMP)
                ORDER BY definition.owner_module, definition.name, definition.id
                """,
            this::catalogRow,
            companyId
        );
    }

    public void replaceUserAssignments(
            long companyId,
            long targetUserId,
            Set<String> targetModuleSlugs,
            Long targetUnitId,
            Long targetBusinessId,
            List<Long> requestedDefinitionIds,
            long actorUserId) {
        var validated = validateAssignments(
            companyId, targetModuleSlugs, targetUnitId, targetBusinessId, requestedDefinitionIds);
        var requested = Set.copyOf(validated);
        var existing = new LinkedHashSet<>(activeUserGrantIds(companyId, targetUserId));

        for (var definitionId : requested) {
            jdbcTemplate.update(
                """
                    INSERT INTO kiosk_grants (
                        kiosk_definition_id, identity_type, identity_id, capability_key,
                        status, source, granted_by, revoked_at
                    ) VALUES (?, 'USER', ?, '*', 'ACTIVE', 'ADMIN', ?, NULL)
                    ON DUPLICATE KEY UPDATE
                        status = 'ACTIVE', source = 'ADMIN', granted_by = VALUES(granted_by),
                        revoked_at = NULL
                    """,
                definitionId, targetUserId, actorUserId
            );
            if (!existing.contains(definitionId)) {
                auditAssignment(
                    companyId, definitionId, targetUserId, actorUserId,
                    "EMPLOYEE_KIOSK_ASSIGNED");
            }
        }

        var removed = existing.stream().filter(id -> !requested.contains(id)).toList();
        for (var definitionId : removed) {
            jdbcTemplate.update(
                """
                    UPDATE kiosk_grants
                    SET status = 'REVOKED', revoked_at = CURRENT_TIMESTAMP
                    WHERE kiosk_definition_id = ? AND identity_type = 'USER'
                      AND identity_id = ? AND capability_key = '*'
                    """,
                definitionId, targetUserId
            );
            auditAssignment(
                companyId, definitionId, targetUserId, actorUserId,
                "EMPLOYEE_KIOSK_REVOKED");
        }
        revokeRemovedSessions(companyId, targetUserId, removed);
    }

    public void replaceInvitationAssignments(
            long companyId,
            long invitationId,
            Set<String> moduleSlugs,
            Long unitId,
            Long businessId,
            List<Long> requestedDefinitionIds) {
        var validated = validateAssignments(
            companyId, moduleSlugs, unitId, businessId, requestedDefinitionIds);
        jdbcTemplate.update(
            "DELETE FROM user_invitation_kiosk_assignments WHERE invitation_id = ?",
            invitationId
        );
        for (var definitionId : validated) {
            jdbcTemplate.update(
                """
                    INSERT INTO user_invitation_kiosk_assignments (
                        invitation_id, kiosk_definition_id
                    ) VALUES (?, ?)
                    """,
                invitationId, definitionId
            );
        }
    }

    public void copyInvitationAssignments(
            long companyId,
            long invitationId,
            long userId,
            long actorUserId) {
        for (var definitionId : assignedToInvitation(invitationId)) {
            var wasActive = hasActiveUserGrant(companyId, definitionId, userId);
            jdbcTemplate.update(
                """
                    INSERT INTO kiosk_grants (
                        kiosk_definition_id, identity_type, identity_id, capability_key,
                        status, source, granted_by, revoked_at
                    )
                    SELECT definition.id, 'USER', ?, '*', 'ACTIVE', 'INVITATION', ?, NULL
                    FROM kiosk_definitions definition
                    WHERE definition.id = ? AND definition.company_id = ?
                      AND definition.audience = 'EMPLOYEE'
                      AND definition.employee_center_enabled = 1
                    ON DUPLICATE KEY UPDATE
                        status = 'ACTIVE', source = 'INVITATION',
                        granted_by = VALUES(granted_by), revoked_at = NULL
                    """,
                userId, actorUserId, definitionId, companyId
            );
            if (!wasActive) {
                auditAssignment(
                    companyId, definitionId, userId, actorUserId,
                    "EMPLOYEE_KIOSK_ASSIGNED_FROM_INVITATION");
            }
        }
    }

    public void revokeUserSessions(long companyId, long userId) {
        jdbcTemplate.update(
            """
                UPDATE kiosk_sessions
                SET revoked_at = COALESCE(revoked_at, CURRENT_TIMESTAMP)
                WHERE company_id = ? AND identity_type = 'USER' AND identity_id = ?
                  AND revoked_at IS NULL
                """,
            companyId, userId
        );
    }

    public boolean isEmployeeEligible(long companyId, long definitionId) {
        var count = jdbcTemplate.queryForObject(
            """
                SELECT COUNT(*) FROM kiosk_definitions
                WHERE id = ? AND company_id = ? AND audience = 'EMPLOYEE'
                  AND employee_center_enabled = 1 AND status = 'ACTIVE'
                  AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
                """,
            Integer.class, definitionId, companyId
        );
        return count != null && count > 0;
    }

    private List<Long> validateAssignments(
            long companyId,
            Set<String> targetModuleSlugs,
            Long targetUnitId,
            Long targetBusinessId,
            List<Long> requestedDefinitionIds) {
        if (requestedDefinitionIds == null || requestedDefinitionIds.isEmpty()) {
            return List.of();
        }
        var rows = new ArrayList<AssignableKiosk>();
        for (var id : requestedDefinitionIds) {
            rows.addAll(jdbcTemplate.query(
                """
                    SELECT id, owner_module, unit_id, business_id
                    FROM kiosk_definitions
                    WHERE id = ? AND company_id = ? AND audience = 'EMPLOYEE'
                      AND employee_center_enabled = 1 AND status = 'ACTIVE'
                      AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
                    LIMIT 1
                    """,
                (rs, rowNum) -> new AssignableKiosk(
                    rs.getLong("id"), rs.getString("owner_module"),
                    rs.getObject("unit_id", Long.class),
                    rs.getObject("business_id", Long.class)),
                id, companyId
            ));
        }
        if (rows.size() != requestedDefinitionIds.size()) {
            throw new IllegalArgumentException("One or more employee kiosks are unavailable.");
        }
        var normalizedModules = targetModuleSlugs == null ? Set.<String>of() : targetModuleSlugs.stream()
            .map(ModuleSlugNormalizer::normalize)
            .collect(java.util.stream.Collectors.toUnmodifiableSet());
        for (var row : rows) {
            if (!normalizedModules.contains(moduleSlug(row.ownerModule()))) {
                throw new IllegalArgumentException(
                    "A kiosk cannot be assigned without access to its owner module.");
            }
            var corporateScope = targetUnitId == null && targetBusinessId == null;
            if (!corporateScope) {
                if (row.unitId() != null && !row.unitId().equals(targetUnitId)) {
                    throw new IllegalArgumentException("A kiosk is outside the user's unit scope.");
                }
                if (targetBusinessId != null && row.businessId() != null
                        && !row.businessId().equals(targetBusinessId)) {
                    throw new IllegalArgumentException("A kiosk is outside the user's business scope.");
                }
            }
        }
        return rows.stream().map(AssignableKiosk::id).toList();
    }

    private void revokeRemovedSessions(long companyId, long userId, List<Long> removedDefinitionIds) {
        for (var definitionId : removedDefinitionIds) {
            jdbcTemplate.update(
                """
                    UPDATE kiosk_sessions
                    SET revoked_at = COALESCE(revoked_at, CURRENT_TIMESTAMP)
                    WHERE company_id = ? AND kiosk_definition_id = ?
                      AND identity_type = 'USER' AND identity_id = ?
                      AND revoked_at IS NULL
                    """,
                companyId, definitionId, userId
            );
        }
    }

    private List<Long> activeUserGrantIds(long companyId, long userId) {
        return jdbcTemplate.query(
            """
                SELECT DISTINCT grant_row.kiosk_definition_id
                FROM kiosk_grants grant_row
                INNER JOIN kiosk_definitions definition
                    ON definition.id = grant_row.kiosk_definition_id
                WHERE definition.company_id = ?
                  AND grant_row.identity_type = 'USER'
                  AND grant_row.identity_id = ?
                  AND grant_row.capability_key = '*'
                  AND grant_row.status = 'ACTIVE'
                ORDER BY grant_row.kiosk_definition_id
                """,
            (rs, rowNum) -> rs.getLong("kiosk_definition_id"),
            companyId, userId
        );
    }

    private boolean hasActiveUserGrant(long companyId, long definitionId, long userId) {
        var count = jdbcTemplate.queryForObject(
            """
                SELECT COUNT(*)
                FROM kiosk_grants grant_row
                INNER JOIN kiosk_definitions definition
                    ON definition.id = grant_row.kiosk_definition_id
                WHERE definition.company_id = ? AND definition.id = ?
                  AND grant_row.identity_type = 'USER'
                  AND grant_row.identity_id = ?
                  AND grant_row.capability_key = '*'
                  AND grant_row.status = 'ACTIVE'
                """,
            Integer.class,
            companyId, definitionId, userId
        );
        return count != null && count > 0;
    }

    private void auditAssignment(
            long companyId,
            long definitionId,
            long targetUserId,
            long actorUserId,
            String eventType) {
        jdbcTemplate.update(
            """
                INSERT INTO kiosk_audit_events (
                    event_id, kiosk_definition_id, historical_kiosk_id, company_id,
                    owner_module, event_type, outcome, actor_type, actor_id,
                    snapshot_json, retain_until
                )
                SELECT ?, definition.id, definition.id, definition.company_id,
                       definition.owner_module, ?, 'SUCCEEDED', 'USER', ?,
                       JSON_OBJECT('identity_type', 'USER', 'identity_id', ?,
                                   'capability_key', '*'),
                       TIMESTAMPADD(DAY, 365, CURRENT_TIMESTAMP)
                FROM kiosk_definitions definition
                WHERE definition.id = ? AND definition.company_id = ?
                """,
            UUID.randomUUID().toString(), eventType, actorUserId, targetUserId,
            definitionId, companyId
        );
    }

    private Map<String, Object> catalogRow(ResultSet rs, int rowNum) throws SQLException {
        var row = new LinkedHashMap<String, Object>();
        row.put("id", rs.getLong("id"));
        row.put("name", rs.getString("name"));
        row.put("owner_module", rs.getString("owner_module"));
        row.put("module_slug", moduleSlug(rs.getString("owner_module")));
        row.put("kiosk_type", rs.getString("kiosk_type"));
        row.put("unit_id", rs.getObject("unit_id", Long.class));
        row.put("unit_name", rs.getString("unit_name"));
        row.put("business_id", rs.getObject("business_id", Long.class));
        row.put("business_name", rs.getString("business_name"));
        row.put("access_level", rs.getString("access_level"));
        return row;
    }

    public static String moduleSlug(String ownerModule) {
        return switch (ownerModule == null ? "" : ownerModule) {
            case "PROCESS_TASKS" -> "processes";
            case "PETTY_CASH" -> "petty_cash";
            case "HUMAN_RESOURCES" -> "human_resources";
            case "EXPENSES" -> "expenses";
            default -> ModuleSlugNormalizer.normalize(ownerModule);
        };
    }

    private record AssignableKiosk(long id, String ownerModule, Long unitId, Long businessId) {
    }
}
