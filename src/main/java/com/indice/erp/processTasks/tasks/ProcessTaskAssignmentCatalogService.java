package com.indice.erp.processTasks.tasks;

import com.indice.erp.processTasks.tasks.ProcessTaskAssignmentScopeService.AssignmentScope;
import com.indice.erp.processTasks.tasks.ProcessTaskAssignmentScopeService.ScopeLevel;
import java.util.Objects;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

@Service
public class ProcessTaskAssignmentCatalogService {

    private final JdbcTemplate jdbcTemplate;
    private final ProcessTaskAssignmentScopeService assignmentScopeService;

    public ProcessTaskAssignmentCatalogService(
            JdbcTemplate jdbcTemplate,
            ProcessTaskAssignmentScopeService assignmentScopeService) {
        this.jdbcTemplate = jdbcTemplate;
        this.assignmentScopeService = assignmentScopeService;
    }

    public ProcessTaskAssignmentCatalogResponse list(long companyId, long actorUserId) {
        var actorScope = assignmentScopeService.actorScope(companyId, actorUserId);
        var candidates = jdbcTemplate.query(
            """
                SELECT user_company.id AS user_company_id,
                       user_company.user_id,
                       COALESCE(
                           NULLIF(TRIM(user_profile.full_name), ''),
                           NULLIF(TRIM(user.full_name), ''),
                           'Usuario'
                       ) AS display_name,
                       work_profile.unit_id,
                       COALESCE(unit.name, '') AS unit_name,
                       work_profile.business_id,
                       COALESCE(business.name, '') AS business_name
                FROM user_companies user_company
                INNER JOIN users user ON user.id = user_company.user_id
                LEFT JOIN user_profiles user_profile ON user_profile.user_id = user.id
                LEFT JOIN user_work_profiles work_profile
                  ON work_profile.company_id = user_company.company_id
                 AND work_profile.user_company_id = user_company.id
                LEFT JOIN units unit
                  ON unit.id = work_profile.unit_id
                 AND (unit.company_id = user_company.company_id OR unit.company_id IS NULL)
                LEFT JOIN businesses business
                  ON business.id = work_profile.business_id
                 AND (business.company_id = user_company.company_id OR business.company_id IS NULL)
                WHERE user_company.company_id = ?
                  AND LOWER(COALESCE(user_company.status, 'active')) IN ('active', 'activo')
                ORDER BY display_name ASC, user_company.id ASC
                """,
            (rs, rowNum) -> new ProcessTaskAssignmentOption(
                rs.getLong("user_company_id"),
                rs.getLong("user_id"),
                rs.getString("display_name"),
                rs.getObject("unit_id", Long.class),
                rs.getString("unit_name"),
                rs.getObject("business_id", Long.class),
                rs.getString("business_name")
            ),
            companyId
        );

        var visibleCandidates = candidates.stream()
            .filter(candidate -> isVisibleToActor(actorScope, candidate))
            .toList();
        return new ProcessTaskAssignmentCatalogResponse(visibleCandidates);
    }

    boolean isVisibleToActor(AssignmentScope actorScope, ProcessTaskAssignmentOption candidate) {
        if (actorScope == null) {
            return false;
        }
        if (actorScope.level() == ScopeLevel.CORPORATE) {
            return true;
        }
        if (actorScope.level() == ScopeLevel.UNIT) {
            return actorScope.unitId() != null && Objects.equals(actorScope.unitId(), candidate.unitId());
        }
        return actorScope.businessId() != null
            && Objects.equals(actorScope.businessId(), candidate.businessId());
    }
}
