package com.indice.erp.hr.announcements;

import com.indice.erp.hr.HrOperationalScope;
import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

@Service
public class HrAnnouncementScopeService {

    private final JdbcTemplate jdbcTemplate;
    private final HrAnnouncementTargetRepository targetRepository;

    public HrAnnouncementScopeService(
        JdbcTemplate jdbcTemplate,
        HrAnnouncementTargetRepository targetRepository
    ) {
        this.jdbcTemplate = jdbcTemplate;
        this.targetRepository = targetRepository;
    }

    public List<HrAnnouncementRow> filterManageable(HrAnnouncementActor actor, List<HrAnnouncementRow> rows) {
        var scope = actor.operationalScope();
        if (scope.isCorporateOffice() || rows.isEmpty()) {
            return rows;
        }

        var targetsByAnnouncement = targetRepository.loadByAnnouncement(
            actor.companyId(),
            rows.stream().map(HrAnnouncementRow::id).toList()
        );
        return rows.stream()
            .filter((row) -> canManageAudience(
                actor.companyId(),
                scope,
                row.audienceType(),
                toTargetMap(targetsByAnnouncement.getOrDefault(row.id(), List.of()))
            ))
            .toList();
    }

    public void requireManageable(HrAnnouncementActor actor, long announcementId) {
        var rows = jdbcTemplate.query(
            """
                SELECT id, COALESCE(audience_type, 'all') AS audience_type
                FROM hr_announcements
                WHERE company_id = ?
                  AND id = ?
                  AND deleted_at IS NULL
                LIMIT 1
                """,
            (rs, rowNum) -> Map.entry(rs.getLong("id"), rs.getString("audience_type")),
            actor.companyId(),
            announcementId
        );
        if (rows.isEmpty()) {
            throw new NoSuchElementException("Announcement not found.");
        }
        if (actor.operationalScope().isCorporateOffice()) {
            return;
        }
        var targets = targetRepository.loadByAnnouncement(actor.companyId(), List.of(announcementId));
        if (!canManageAudience(
            actor.companyId(),
            actor.operationalScope(),
            rows.getFirst().getValue(),
            toTargetMap(targets.getOrDefault(announcementId, List.of()))
        )) {
            throw forbidden();
        }
    }

    public void requireAudienceManageable(
        HrAnnouncementActor actor,
        String audienceType,
        Map<String, List<String>> targets
    ) {
        if (!canManageAudience(actor.companyId(), actor.operationalScope(), audienceType, targets)) {
            throw forbidden();
        }
    }

    private boolean canManageAudience(
        long companyId,
        HrOperationalScope scope,
        String audienceType,
        Map<String, List<String>> targets
    ) {
        if (scope.isCorporateOffice()) {
            return true;
        }
        return switch (HrAnnouncementPayload.normalizeAudienceType(audienceType)) {
            case "units" -> canManageUnitTargets(scope, targetValues(targets, "unit"));
            case "employees" -> canManageEmployeeTargets(companyId, scope, targetValues(targets, "employee"));
            default -> false;
        };
    }

    private boolean canManageUnitTargets(HrOperationalScope scope, List<String> unitIds) {
        if (!HrOperationalScope.Type.UNIT_HEADQUARTERS.equals(scope.type()) || unitIds.isEmpty()) {
            return false;
        }
        var scopeUnitId = String.valueOf(scope.unitId());
        return unitIds.stream().allMatch(scopeUnitId::equals);
    }

    private boolean canManageEmployeeTargets(long companyId, HrOperationalScope scope, List<String> userCompanyIds) {
        if (userCompanyIds.isEmpty()) {
            return false;
        }

        var parameters = new ArrayList<Object>();
        parameters.add(companyId);
        parameters.addAll(userCompanyIds);
        var sql = """
            SELECT COUNT(DISTINCT uc.id)
            FROM user_companies uc
            LEFT JOIN user_work_profiles wp
              ON wp.company_id = uc.company_id
             AND wp.user_company_id = uc.id
             AND LOWER(COALESCE(wp.status, 'active')) IN ('active', 'activo')
            WHERE uc.company_id = ?
              AND uc.id IN (%s)
              AND LOWER(COALESCE(uc.status, 'active')) IN ('active', 'activo')
            """.formatted(placeholders(userCompanyIds.size()));
        if (!scope.isCorporateOffice()) {
            sql += scope.assignmentPredicate("wp.unit_id", "wp.business_id", "wp.company_id");
            parameters.addAll(scope.assignmentParameters());
        }

        var count = jdbcTemplate.queryForObject(sql, Integer.class, parameters.toArray());
        return count != null && count == userCompanyIds.size();
    }

    private Map<String, List<String>> toTargetMap(List<HrAnnouncementTargetRow> targetRows) {
        var targets = new LinkedHashMap<String, List<String>>();
        for (var row : targetRows) {
            targets.computeIfAbsent(row.targetType(), ignored -> new ArrayList<>()).add(row.targetValue());
        }
        return targets;
    }

    private List<String> targetValues(Map<String, List<String>> targets, String targetType) {
        return new ArrayList<>(new LinkedHashSet<>(
            targets.getOrDefault(targetType, List.of()).stream()
                .map(value -> value == null ? "" : value.trim())
                .filter(value -> !value.isBlank())
                .toList()
        ));
    }

    private String placeholders(int count) {
        return String.join(", ", Collections.nCopies(count, "?"));
    }

    private HrAnnouncementApiException forbidden() {
        return new HrAnnouncementApiException(HttpStatus.FORBIDDEN, "Forbidden");
    }
}
