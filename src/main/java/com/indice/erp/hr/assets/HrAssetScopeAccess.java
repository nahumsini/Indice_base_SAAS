package com.indice.erp.hr.assets;

import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.hr.HrAccessDeniedException;
import com.indice.erp.hr.HrOperationalScope;
import com.indice.erp.hr.HrOperationalScopeService;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.List;
import java.util.NoSuchElementException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

@Service
public class HrAssetScopeAccess {

    private final JdbcTemplate jdbcTemplate;
    private final HrOperationalScopeService hrOperationalScopeService;

    public HrAssetScopeAccess(
        JdbcTemplate jdbcTemplate,
        HrOperationalScopeService hrOperationalScopeService
    ) {
        this.jdbcTemplate = jdbcTemplate;
        this.hrOperationalScopeService = hrOperationalScopeService;
    }

    public HrOperationalScope resolve(AuthSessionUser currentUser) {
        return hrOperationalScopeService.resolve(currentUser);
    }

    public String assetCondition(HrOperationalScope scope) {
        return switch (scope.type()) {
            case CORPORATE_OFFICE -> "";
            case UNASSIGNED -> "1 = 0";
            case UNIT_HEADQUARTERS -> """
                (
                  a.unit_id = ?
                  OR e.unit_id = ?
                  OR EXISTS (
                    SELECT 1
                    FROM businesses scope_business
                    WHERE scope_business.id = e.business_id
                      AND scope_business.unit_id = ?
                      AND (scope_business.company_id = a.company_id OR scope_business.company_id IS NULL)
                  )
                )
                """;
            case BUSINESS_OFFICE -> "e.business_id = ?";
        };
    }

    public List<Object> assetParameters(HrOperationalScope scope) {
        return switch (scope.type()) {
            case CORPORATE_OFFICE -> List.of();
            case UNASSIGNED -> List.of();
            case UNIT_HEADQUARTERS -> List.of(scope.unitId(), scope.unitId(), scope.unitId());
            case BUSINESS_OFFICE -> List.of(scope.businessId());
        };
    }

    public void requireAssetInScope(long companyId, HrOperationalScope scope, long assetId) {
        if (scope.isCorporateOffice()) {
            return;
        }

        var rows = jdbcTemplate.query(
            """
                SELECT a.unit_id AS asset_unit_id,
                       e.unit_id AS responsible_unit_id,
                       e.business_id AS responsible_business_id
                FROM user_assets a
                LEFT JOIN hr_users e ON e.id = a.responsible_user_company_id
                WHERE a.company_id = ?
                  AND a.id = ?
                LIMIT 1
                """,
            (rs, rowNum) -> new AssetAssignment(
                getNullableLong(rs, "asset_unit_id"),
                getNullableLong(rs, "responsible_unit_id"),
                getNullableLong(rs, "responsible_business_id")
            ),
            companyId,
            assetId
        );

        if (rows.isEmpty()) {
            throw new NoSuchElementException("Asset not found.");
        }

        if (!containsAssetAssignment(companyId, scope, rows.getFirst())) {
            throw new HrAccessDeniedException("Forbidden");
        }
    }

    public void requireTargetInScope(
        long companyId,
        HrOperationalScope scope,
        Long unitId,
        Long responsibleUserCompanyId
    ) {
        if (scope.isCorporateOffice()) {
            return;
        }

        if (responsibleUserCompanyId != null) {
            hrOperationalScopeService.requireUserInScope(companyId, scope, responsibleUserCompanyId);
            if (HrOperationalScope.Type.UNIT_HEADQUARTERS.equals(scope.type()) && unitId != null) {
                hrOperationalScopeService.requireAssignmentInScope(companyId, scope, unitId, null);
            }
            return;
        }

        hrOperationalScopeService.requireAssignmentInScope(companyId, scope, unitId, null);
    }

    private boolean containsAssetAssignment(long companyId, HrOperationalScope scope, AssetAssignment assignment) {
        if (assignment.responsibleUnitId() != null || assignment.responsibleBusinessId() != null) {
            var responsibleInScope = hrOperationalScopeService.containsAssignment(
                companyId,
                scope,
                assignment.responsibleUnitId(),
                assignment.responsibleBusinessId()
            );
            if (responsibleInScope) {
                return true;
            }
        }

        return hrOperationalScopeService.containsAssignment(companyId, scope, assignment.assetUnitId(), null);
    }

    private Long getNullableLong(ResultSet rs, String column) throws SQLException {
        var value = rs.getLong(column);
        return rs.wasNull() ? null : value;
    }

    private record AssetAssignment(Long assetUnitId, Long responsibleUnitId, Long responsibleBusinessId) {
    }
}
