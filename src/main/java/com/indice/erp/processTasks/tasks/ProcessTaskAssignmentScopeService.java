package com.indice.erp.processTasks.tasks;

import java.text.Normalizer;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.NoSuchElementException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

@Service
public class ProcessTaskAssignmentScopeService {

    private final JdbcTemplate jdbcTemplate;

    public ProcessTaskAssignmentScopeService(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public AssignmentScope actorScope(long companyId, long userId) {
        var rows = jdbcTemplate.query(
                """
                        SELECT uc.id AS user_company_id,
                               uc.user_id,
                               wp.unit_id,
                               unit.name AS unit_name,
                               wp.business_id,
                               business.name AS business_name
                        FROM user_companies uc
                        LEFT JOIN user_work_profiles wp
                          ON wp.company_id = uc.company_id
                         AND wp.user_company_id = uc.id
                        LEFT JOIN units unit
                          ON unit.id = wp.unit_id
                         AND (unit.company_id = uc.company_id OR unit.company_id IS NULL)
                        LEFT JOIN businesses business
                          ON business.id = wp.business_id
                         AND (business.company_id = uc.company_id OR business.company_id IS NULL)
                        WHERE uc.company_id = ?
                          AND uc.user_id = ?
                          AND LOWER(COALESCE(uc.status, 'active')) IN ('active', 'activo')
                        ORDER BY CASE WHEN wp.id IS NULL THEN 1 ELSE 0 END, uc.id DESC
                        LIMIT 1
                        """,
                (rs, rowNum) -> resolveScope(
                        rs.getObject("user_company_id", Long.class),
                        rs.getObject("user_id", Long.class),
                        rs.getObject("unit_id", Long.class),
                        rs.getString("unit_name"),
                        rs.getObject("business_id", Long.class),
                        rs.getString("business_name")),
                companyId,
                userId);

        if (rows.isEmpty()) {
            return AssignmentScope.corporate(null, userId);
        }

        return rows.getFirst();
    }

    public AssignmentScope userCompanyScope(long companyId, Long userCompanyId) {
        if (userCompanyId == null) {
            return null;
        }

        var rows = jdbcTemplate.query(
                """
                        SELECT uc.id AS user_company_id,
                               uc.user_id,
                               wp.unit_id,
                               unit.name AS unit_name,
                               wp.business_id,
                               business.name AS business_name
                        FROM user_companies uc
                        LEFT JOIN user_work_profiles wp
                          ON wp.company_id = uc.company_id
                         AND wp.user_company_id = uc.id
                        LEFT JOIN units unit
                          ON unit.id = wp.unit_id
                         AND (unit.company_id = uc.company_id OR unit.company_id IS NULL)
                        LEFT JOIN businesses business
                          ON business.id = wp.business_id
                         AND (business.company_id = uc.company_id OR business.company_id IS NULL)
                        WHERE uc.company_id = ?
                          AND uc.id = ?
                          AND LOWER(COALESCE(uc.status, 'active')) IN ('active', 'activo')
                        LIMIT 1
                        """,
                (rs, rowNum) -> resolveScope(
                        rs.getObject("user_company_id", Long.class),
                        rs.getObject("user_id", Long.class),
                        rs.getObject("unit_id", Long.class),
                        rs.getString("unit_name"),
                        rs.getObject("business_id", Long.class),
                        rs.getString("business_name")),
                companyId,
                userCompanyId);

        if (rows.isEmpty()) {
            throw new NoSuchElementException("Assigned user not found.");
        }

        return rows.getFirst();
    }

    public TaskTargetScope targetScope(long companyId, Long unitId, Long businessId) {
        if (businessId == null) {
            return new TaskTargetScope(unitId, null);
        }

        var rows = jdbcTemplate.query(
                """
                        SELECT business.id,
                               business.unit_id
                        FROM businesses business
                        WHERE business.id = ?
                          AND (business.company_id = ? OR business.company_id IS NULL)
                        LIMIT 1
                        """,
                (rs, rowNum) -> new TaskTargetScope(
                        rs.getObject("unit_id", Long.class),
                        rs.getObject("id", Long.class)),
                businessId,
                companyId);

        if (rows.isEmpty()) {
            throw new NoSuchElementException("Business not found.");
        }

        var target = rows.getFirst();
        if (unitId != null && target.unitId() != null && !unitId.equals(target.unitId())) {
            throw new IllegalArgumentException("Business does not belong to selected unit.");
        }

        return new TaskTargetScope(unitId != null ? unitId : target.unitId(), target.businessId());
    }

    public void requireCanAssign(
            long companyId,
            long actorUserId,
            Long unitId,
            Long businessId,
            Long assignedUserCompanyId) {
        var actorScope = actorScope(companyId, actorUserId);
        var targetScope = targetScope(companyId, unitId, businessId);

        if (!canManageScope(actorScope, targetScope)) {
            throw new IllegalArgumentException("Current user cannot create or delegate tasks for this scope.");
        }

        if (assignedUserCompanyId == null) {
            return;
        }

        var receiverScope = userCompanyScope(companyId, assignedUserCompanyId);
        if (!canReceiveScope(receiverScope, targetScope)) {
            throw new IllegalArgumentException("Assigned user cannot receive tasks for this scope.");
        }
    }

    public void requireTaskAccess(long companyId, long actorUserId, long taskId) {
        var filter = taskVisibilityFilter(companyId, actorUserId, "task", "business");
        var params = new ArrayList<Object>();
        params.add(companyId);
        params.add(taskId);
        params.addAll(filter.params());

        Integer count = jdbcTemplate.queryForObject(
                """
                        SELECT COUNT(*)
                        FROM process_tasks task
                        LEFT JOIN businesses business
                          ON business.id = task.business_id
                         AND (business.company_id = task.company_id OR business.company_id IS NULL)
                        WHERE task.company_id = ?
                          AND task.id = ?
                          AND task.deleted_at IS NULL
                          AND %s
                        """.formatted(filter.condition()),
                Integer.class,
                params.toArray());

        if (count == null || count == 0) {
            throw new NoSuchElementException("Task not found.");
        }
    }

    public TaskVisibilityFilter taskVisibilityFilter(
            long companyId,
            long actorUserId,
            String taskAlias,
            String businessAlias) {
        var scope = actorScope(companyId, actorUserId);

        if (scope.level() == ScopeLevel.CORPORATE) {
            return new TaskVisibilityFilter("1 = 1", List.of());
        }

        if (scope.level() == ScopeLevel.UNIT && scope.unitId() != null) {
            return new TaskVisibilityFilter(
                    "(%s.unit_id = ? OR %s.unit_id = ?)".formatted(taskAlias, businessAlias),
                    List.of(scope.unitId(), scope.unitId()));
        }

        if (scope.level() == ScopeLevel.BUSINESS && scope.businessId() != null) {
            return new TaskVisibilityFilter(
                    "%s.business_id = ?".formatted(taskAlias),
                    List.of(scope.businessId()));
        }

        return new TaskVisibilityFilter("1 = 0", List.of());
    }

    private boolean canManageScope(AssignmentScope actorScope, TaskTargetScope targetScope) {
        if (actorScope == null || actorScope.level() == ScopeLevel.CORPORATE) {
            return true;
        }

        if (targetScope == null || targetScope.isCompanyWide()) {
            return false;
        }

        if (actorScope.level() == ScopeLevel.UNIT) {
            return actorScope.unitId() != null && actorScope.unitId().equals(targetScope.unitId());
        }

        return actorScope.businessId() != null && actorScope.businessId().equals(targetScope.businessId());
    }

    private boolean canReceiveScope(AssignmentScope receiverScope, TaskTargetScope targetScope) {
        if (receiverScope == null || receiverScope.level() == ScopeLevel.CORPORATE) {
            return true;
        }

        if (targetScope == null || targetScope.isCompanyWide()) {
            return false;
        }

        if (receiverScope.level() == ScopeLevel.UNIT) {
            return receiverScope.unitId() != null && receiverScope.unitId().equals(targetScope.unitId());
        }

        return receiverScope.businessId() != null && receiverScope.businessId().equals(targetScope.businessId());
    }

    private AssignmentScope resolveScope(
            Long userCompanyId,
            Long userId,
            Long unitId,
            String unitName,
            Long businessId,
            String businessName) {
        if (isCorporateName(unitName) || isCorporateName(businessName)) {
            return AssignmentScope.corporate(userCompanyId, userId);
        }

        if (unitId == null && businessId == null) {
            return AssignmentScope.corporate(userCompanyId, userId);
        }

        if (unitId != null && (businessId == null || isHeadquarterBusinessName(businessName))) {
            return AssignmentScope.unit(userCompanyId, userId, unitId);
        }

        if (businessId != null) {
            return AssignmentScope.business(userCompanyId, userId, unitId, businessId);
        }

        return AssignmentScope.corporate(userCompanyId, userId);
    }

    private boolean isCorporateName(String value) {
        var normalized = normalize(value);
        return normalized.equals("corporate office")
                || normalized.equals("corporate")
                || normalized.equals("head office")
                || normalized.equals("holding")
                || normalized.equals("oficina central")
                || normalized.equals("oficina corporativa")
                || normalized.equals("corporativo")
                || normalized.equals("sede principal");
    }

    private boolean isHeadquarterBusinessName(String value) {
        var normalized = normalize(value);
        return normalized.equals("headquarter")
                || normalized.equals("headquarters")
                || normalized.equals("headquater")
                || normalized.equals("hq")
                || normalized.endsWith(" headquarter")
                || normalized.endsWith(" headquarters")
                || normalized.endsWith(" hq")
                || normalized.startsWith("sede ")
                || normalized.contains(" sede")
                || normalized.startsWith("matriz ")
                || normalized.contains(" matriz");
    }

    private String normalize(String value) {
        if (value == null) {
            return "";
        }

        var normalized = Normalizer.normalize(value.trim(), Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9]+", " ")
                .trim();
        return normalized.replaceAll("\\s+", " ");
    }

    public enum ScopeLevel {
        CORPORATE,
        UNIT,
        BUSINESS
    }

    public record AssignmentScope(
            ScopeLevel level,
            Long userCompanyId,
            Long userId,
            Long unitId,
            Long businessId) {

        static AssignmentScope corporate(Long userCompanyId, Long userId) {
            return new AssignmentScope(ScopeLevel.CORPORATE, userCompanyId, userId, null, null);
        }

        static AssignmentScope unit(Long userCompanyId, Long userId, Long unitId) {
            return new AssignmentScope(ScopeLevel.UNIT, userCompanyId, userId, unitId, null);
        }

        static AssignmentScope business(Long userCompanyId, Long userId, Long unitId, Long businessId) {
            return new AssignmentScope(ScopeLevel.BUSINESS, userCompanyId, userId, unitId, businessId);
        }
    }

    public record TaskTargetScope(Long unitId, Long businessId) {
        boolean isCompanyWide() {
            return unitId == null && businessId == null;
        }
    }

    public record TaskVisibilityFilter(String condition, List<Object> params) {
    }
}
