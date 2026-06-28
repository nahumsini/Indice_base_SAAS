package com.indice.erp.configcenter.users;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.List;
import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;

public final class ConfigCenterUserAccessAudit {

    private final JdbcTemplate jdbcTemplate;
    private final ObjectMapper objectMapper;

    public ConfigCenterUserAccessAudit(JdbcTemplate jdbcTemplate, ObjectMapper objectMapper) {
        this.jdbcTemplate = jdbcTemplate;
        this.objectMapper = objectMapper;
    }

    public void recordUserChange(
        long companyId,
        long actorUserId,
        Long targetUserId,
        Long userCompanyId,
        String eventType,
        Snapshot before,
        Snapshot after
    ) {
        record(companyId, actorUserId, targetUserId, userCompanyId, null, eventType, before, after);
    }

    public void recordInvitationChange(
        long companyId,
        long actorUserId,
        Long invitationId,
        String eventType,
        Snapshot before,
        Snapshot after
    ) {
        record(companyId, actorUserId, null, null, invitationId, eventType, before, after);
    }

    private void record(
        long companyId,
        long actorUserId,
        Long targetUserId,
        Long userCompanyId,
        Long invitationId,
        String eventType,
        Snapshot before,
        Snapshot after
    ) {
        try {
            jdbcTemplate.update(
                """
                    INSERT INTO user_access_audit
                        (company_id, actor_user_id, target_user_id, target_user_company_id, target_invitation_id,
                         event_type, old_role, new_role, old_status, new_status, old_unit_id, new_unit_id,
                         old_business_id, new_business_id, old_modules_json, new_modules_json,
                         old_tab_permissions_json, new_tab_permissions_json)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                companyId,
                actorUserId,
                targetUserId,
                userCompanyId,
                invitationId,
                clean(eventType, 64),
                before == null ? null : clean(before.role(), 64),
                after == null ? null : clean(after.role(), 64),
                before == null ? null : clean(before.status(), 64),
                after == null ? null : clean(after.status(), 64),
                before == null ? null : before.unitId(),
                after == null ? null : after.unitId(),
                before == null ? null : before.businessId(),
                after == null ? null : after.businessId(),
                json(before == null ? List.of() : before.modules()),
                json(after == null ? List.of() : after.modules()),
                json(before == null ? List.of() : before.tabPermissions()),
                json(after == null ? List.of() : after.tabPermissions())
            );
        } catch (DataAccessException ignored) {
            // Audit must not block user administration in older local schemas.
        }
    }

    private String json(List<String> values) {
        try {
            return objectMapper.writeValueAsString(values == null ? List.of() : values);
        } catch (JsonProcessingException ex) {
            return "[]";
        }
    }

    private String clean(String value, int maxLength) {
        var cleaned = value == null ? "" : value.replaceAll("[\\r\\n\\t]+", " ").trim();
        return cleaned.length() <= maxLength ? cleaned : cleaned.substring(0, maxLength);
    }

    public record Snapshot(
        String role,
        String status,
        Long unitId,
        Long businessId,
        List<String> modules,
        List<String> tabPermissions
    ) {
    }
}
