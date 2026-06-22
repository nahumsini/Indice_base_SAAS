package com.indice.erp.dashboard;

import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.hr.HrOperationalScope;
import com.indice.erp.hr.HrOperationalScopeService;
import java.util.List;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

@Service
class OrganizationScopeAccess {

    private final JdbcTemplate jdbcTemplate;
    private final HrOperationalScopeService hrOperationalScopeService;

    OrganizationScopeAccess(
        JdbcTemplate jdbcTemplate,
        HrOperationalScopeService hrOperationalScopeService
    ) {
        this.jdbcTemplate = jdbcTemplate;
        this.hrOperationalScopeService = hrOperationalScopeService;
    }

    HrOperationalScope resolve(AuthSessionUser currentUser) {
        return hrOperationalScopeService.resolve(currentUser);
    }

    List<OrganizationService.UnitSummary> filterUnits(
        long companyId,
        HrOperationalScope scope,
        List<OrganizationService.UnitSummary> units
    ) {
        if (scope == null || scope.isCorporateOffice()) {
            return units;
        }

        Long scopedUnitId = switch (scope.type()) {
            case UNIT_HEADQUARTERS -> scope.unitId();
            case BUSINESS_OFFICE -> scope.unitId() != null
                ? scope.unitId()
                : resolveBusinessUnitId(companyId, scope.businessId());
            case CORPORATE_OFFICE -> null;
            case UNASSIGNED -> null;
        };
        if (scopedUnitId == null) {
            return List.of();
        }

        return units.stream()
            .filter((unit) -> unit.id() == scopedUnitId)
            .toList();
    }

    List<OrganizationService.BusinessSummary> filterBusinesses(
        HrOperationalScope scope,
        List<OrganizationService.BusinessSummary> businesses
    ) {
        if (scope == null || scope.isCorporateOffice()) {
            return businesses;
        }

        return switch (scope.type()) {
            case UNIT_HEADQUARTERS -> {
                if (scope.unitId() == null) {
                    yield List.of();
                }
                yield businesses.stream()
                    .filter((business) -> scope.unitId().equals(business.unitId()))
                    .toList();
            }
            case BUSINESS_OFFICE -> {
                if (scope.businessId() == null) {
                    yield List.of();
                }
                yield businesses.stream()
                    .filter((business) -> business.id() == scope.businessId())
                    .toList();
            }
            case CORPORATE_OFFICE -> businesses;
            case UNASSIGNED -> List.of();
        };
    }

    private Long resolveBusinessUnitId(long companyId, Long businessId) {
        if (businessId == null) {
            return null;
        }
        return jdbcTemplate.query(
            """
                SELECT unit_id
                FROM businesses
                WHERE id = ?
                  AND (company_id = ? OR company_id IS NULL)
                LIMIT 1
                """,
            (rs, rowNum) -> rs.getObject("unit_id", Long.class),
            businessId,
            companyId
        ).stream().findFirst().orElse(null);
    }
}
