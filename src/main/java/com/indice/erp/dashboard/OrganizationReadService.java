package com.indice.erp.dashboard;

import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.hr.HrOperationalScope;
import com.indice.erp.hr.HrOperationalScopeService;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.List;
import java.util.NoSuchElementException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class OrganizationReadService {

    private final JdbcTemplate jdbcTemplate;
    private final HrOperationalScopeService scopeService;

    public OrganizationReadService(JdbcTemplate jdbcTemplate, HrOperationalScopeService scopeService) {
        this.jdbcTemplate = jdbcTemplate;
        this.scopeService = scopeService;
    }

    @Transactional(readOnly = true)
    public BusinessContext currentContext(AuthSessionUser user) {
        var rows = jdbcTemplate.query(
            """
                SELECT company.name AS company_name,
                       unit_row.id AS unit_id,
                       unit_row.name AS unit_name,
                       business_row.id AS business_id,
                       business_row.name AS business_name
                FROM companies company
                INNER JOIN user_companies membership
                  ON membership.id = ?
                 AND membership.user_id = ?
                 AND membership.company_id = company.id
                 AND LOWER(COALESCE(membership.status, 'active')) IN ('active', 'activo')
                LEFT JOIN user_work_profiles profile
                  ON profile.company_id = company.id
                 AND profile.user_company_id = membership.id
                LEFT JOIN units unit_row
                  ON unit_row.id = profile.unit_id
                 AND (unit_row.company_id = company.id OR unit_row.company_id IS NULL)
                LEFT JOIN businesses business_row
                  ON business_row.id = profile.business_id
                 AND (business_row.company_id = company.id OR business_row.company_id IS NULL)
                WHERE company.id = ?
                ORDER BY profile.id DESC
                LIMIT 1
                """,
            (rs, rowNum) -> contextRow(rs),
            user.userCompanyId(),
            user.userId(),
            user.companyId()
        );
        if (rows.isEmpty()) {
            throw new NoSuchElementException("Active company membership not found.");
        }
        var row = rows.getFirst();
        var scope = scopeService.resolve(user);
        return new BusinessContext(
            user.companyId(), row.companyName(), user.userId(), user.userCompanyId(), user.userName(), user.role(),
            scope.type().name(), row.unitId(), row.unitName(), row.businessId(), row.businessName()
        );
    }

    @Transactional(readOnly = true)
    public OrganizationStructure visibleStructure(AuthSessionUser user) {
        var scope = scopeService.resolve(user);
        var units = jdbcTemplate.query(
            """
                SELECT id, name, status
                FROM units
                WHERE (company_id = ? OR company_id IS NULL)
                  AND (status = 'active' OR status IS NULL OR status = '')
                ORDER BY name ASC, id ASC
                """,
            (rs, rowNum) -> new UnitReference(rs.getLong("id"), rs.getString("name"), activeStatus(rs.getString("status"))),
            user.companyId()
        );
        var businesses = jdbcTemplate.query(
            """
                SELECT business.id, business.unit_id, business.name, business.status, unit_row.name AS unit_name
                FROM businesses business
                LEFT JOIN units unit_row
                  ON unit_row.id = business.unit_id
                 AND (unit_row.company_id = ? OR unit_row.company_id IS NULL)
                WHERE (business.company_id = ? OR business.company_id IS NULL)
                  AND (business.status = 'active' OR business.status IS NULL OR business.status = '')
                ORDER BY business.name ASC, business.id ASC
                """,
            (rs, rowNum) -> new BusinessReference(
                rs.getLong("id"), getNullableLong(rs, "unit_id"), rs.getString("name"),
                rs.getString("unit_name"), activeStatus(rs.getString("status"))
            ),
            user.companyId(),
            user.companyId()
        );
        return restrict(scope, units, businesses);
    }

    OrganizationStructure restrict(
        HrOperationalScope scope,
        List<UnitReference> units,
        List<BusinessReference> businesses
    ) {
        return switch (scope.type()) {
            case CORPORATE_OFFICE -> new OrganizationStructure(units, businesses, scope.type().name());
            case UNIT_HEADQUARTERS -> new OrganizationStructure(
                units.stream().filter(unit -> unit.id() == nullSafe(scope.unitId())).toList(),
                businesses.stream().filter(business -> scope.unitId() != null && scope.unitId().equals(business.unitId())).toList(),
                scope.type().name()
            );
            case BUSINESS_OFFICE -> {
                var visibleBusinesses = businesses.stream()
                    .filter(business -> business.id() == nullSafe(scope.businessId()))
                    .toList();
                var unitId = scope.unitId() != null
                    ? scope.unitId()
                    : visibleBusinesses.stream().map(BusinessReference::unitId).findFirst().orElse(null);
                yield new OrganizationStructure(
                    units.stream().filter(unit -> unit.id() == nullSafe(unitId)).toList(),
                    visibleBusinesses,
                    scope.type().name()
                );
            }
            case UNASSIGNED -> new OrganizationStructure(List.of(), List.of(), scope.type().name());
        };
    }

    private ContextRow contextRow(ResultSet rs) throws SQLException {
        return new ContextRow(
            rs.getString("company_name"),
            getNullableLong(rs, "unit_id"),
            rs.getString("unit_name"),
            getNullableLong(rs, "business_id"),
            rs.getString("business_name")
        );
    }

    private Long getNullableLong(ResultSet rs, String column) throws SQLException {
        var value = rs.getLong(column);
        return rs.wasNull() ? null : value;
    }

    private String activeStatus(String value) {
        return value == null || value.isBlank() ? "active" : value;
    }

    private long nullSafe(Long value) {
        return value == null ? Long.MIN_VALUE : value;
    }

    public record BusinessContext(
        Long companyId,
        String companyName,
        Long userId,
        Long userCompanyId,
        String userName,
        String role,
        String scopeType,
        Long assignedUnitId,
        String assignedUnitName,
        Long assignedBusinessId,
        String assignedBusinessName
    ) {
    }

    public record OrganizationStructure(
        List<UnitReference> units,
        List<BusinessReference> businesses,
        String scopeType
    ) {
    }

    public record UnitReference(long id, String name, String status) {
    }

    public record BusinessReference(long id, Long unitId, String name, String unitName, String status) {
    }

    private record ContextRow(
        String companyName,
        Long unitId,
        String unitName,
        Long businessId,
        String businessName
    ) {
    }
}
