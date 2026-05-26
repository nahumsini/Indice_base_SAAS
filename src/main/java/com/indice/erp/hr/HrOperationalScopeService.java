package com.indice.erp.hr;

import com.indice.erp.auth.AuthSessionUser;
import java.util.NoSuchElementException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

@Service
public class HrOperationalScopeService {

    private final JdbcTemplate jdbcTemplate;

    public HrOperationalScopeService(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public HrOperationalScope resolve(AuthSessionUser currentUser) {
        var rows = jdbcTemplate.query(
            """
                SELECT wp.unit_id,
                       wp.business_id
                FROM user_companies uc
                LEFT JOIN user_work_profiles wp
                  ON wp.company_id = uc.company_id
                 AND wp.user_company_id = uc.id
                WHERE uc.user_id = ?
                  AND uc.company_id = ?
                  AND LOWER(COALESCE(uc.status, 'active')) IN ('active', 'activo')
                ORDER BY CASE WHEN wp.id IS NULL THEN 1 ELSE 0 END, uc.id ASC
                LIMIT 1
                """,
            (rs, rowNum) -> HrOperationalScope.businessOffice(
                getNullableLong(rs, "unit_id"),
                getNullableLong(rs, "business_id")
            ),
            currentUser.userId(),
            currentUser.companyId()
        );
        return rows.isEmpty() ? HrOperationalScope.corporateOffice() : rows.getFirst();
    }

    public void requireUserInScope(AuthSessionUser currentUser, long targetUserCompanyId) {
        requireUserInScope(currentUser.companyId(), resolve(currentUser), targetUserCompanyId);
    }

    public void requireUserInScope(long companyId, HrOperationalScope scope, long targetUserCompanyId) {
        if (scope.isCorporateOffice()) {
            return;
        }

        var rows = jdbcTemplate.query(
            """
                SELECT e.unit_id,
                       e.business_id
                FROM hr_users e
                WHERE e.company_id = ?
                  AND e.id = ?
                  AND e.work_profile_id IS NOT NULL
                LIMIT 1
                """,
            (rs, rowNum) -> new Assignment(
                getNullableLong(rs, "unit_id"),
                getNullableLong(rs, "business_id")
            ),
            companyId,
            targetUserCompanyId
        );

        if (rows.isEmpty()) {
            throw new NoSuchElementException("HR user not found.");
        }

        var target = rows.getFirst();
        requireAssignmentInScope(companyId, scope, target.unitId(), target.businessId());
    }

    public void requireAssignmentInScope(AuthSessionUser currentUser, Long unitId, Long businessId) {
        requireAssignmentInScope(currentUser.companyId(), resolve(currentUser), unitId, businessId);
    }

    public void requireAssignmentInScope(long companyId, HrOperationalScope scope, Long unitId, Long businessId) {
        if (!containsAssignment(companyId, scope, unitId, businessId)) {
            throw new HrAccessDeniedException("Forbidden");
        }
    }

    public boolean containsAssignment(long companyId, HrOperationalScope scope, Long unitId, Long businessId) {
        return switch (scope.type()) {
            case CORPORATE_OFFICE -> true;
            case UNIT_HEADQUARTERS -> unitMatches(scope.unitId(), unitId)
                || businessBelongsToUnit(companyId, businessId, scope.unitId());
            case BUSINESS_OFFICE -> businessId != null && businessId.equals(scope.businessId());
        };
    }

    private boolean unitMatches(Long scopeUnitId, Long targetUnitId) {
        return scopeUnitId != null && scopeUnitId.equals(targetUnitId);
    }

    private boolean businessBelongsToUnit(long companyId, Long businessId, Long unitId) {
        if (businessId == null || unitId == null) {
            return false;
        }
        var count = jdbcTemplate.queryForObject(
            """
                SELECT COUNT(*)
                FROM businesses
                WHERE id = ?
                  AND unit_id = ?
                  AND (company_id = ? OR company_id IS NULL)
                """,
            Long.class,
            businessId,
            unitId,
            companyId
        );
        return count != null && count > 0;
    }

    private Long getNullableLong(java.sql.ResultSet rs, String column) throws java.sql.SQLException {
        var value = rs.getLong(column);
        return rs.wasNull() ? null : value;
    }

    private record Assignment(Long unitId, Long businessId) {
    }
}
