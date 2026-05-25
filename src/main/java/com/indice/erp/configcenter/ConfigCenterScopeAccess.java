package com.indice.erp.configcenter;

import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.hr.HrOperationalScope;
import com.indice.erp.hr.HrOperationalScopeService;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

@Service
public class ConfigCenterScopeAccess {

    private final JdbcTemplate jdbcTemplate;
    private final HrOperationalScopeService hrOperationalScopeService;

    public ConfigCenterScopeAccess(
        JdbcTemplate jdbcTemplate,
        HrOperationalScopeService hrOperationalScopeService
    ) {
        this.jdbcTemplate = jdbcTemplate;
        this.hrOperationalScopeService = hrOperationalScopeService;
    }

    public HrOperationalScope resolve(AuthSessionUser currentUser) {
        return hrOperationalScopeService.resolve(currentUser);
    }

    public Map<String, Object> scopeEmpresa(AuthSessionUser currentUser, Map<String, Object> empresa) {
        return scopeEmpresa(currentUser.companyId(), resolve(currentUser), empresa);
    }

    public Map<String, Object> scopeEmpresa(long companyId, HrOperationalScope scope, Map<String, Object> empresa) {
        if (empresa == null || scope == null || scope.isCorporateOffice()) {
            return empresa;
        }

        var scoped = new LinkedHashMap<String, Object>(empresa);
        scoped.put("colaboradores", countScopedCollaborators(companyId, scope));
        scoped.put("map", scopeStructureMap(scope, castMapList(empresa.get("map"))));
        return scoped;
    }

    int countScopedCollaborators(long companyId, HrOperationalScope scope) {
        if (scope == null || scope.isCorporateOffice()) {
            var count = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM hr_users WHERE company_id = ?",
                Integer.class,
                companyId
            );
            return count == null ? 0 : count;
        }

        var sql = new StringBuilder(
            """
                SELECT COUNT(*)
                FROM hr_users e
                WHERE e.company_id = ?
                """
        );
        var parameters = new ArrayList<Object>();
        parameters.add(companyId);
        sql.append(scope.hrUserPredicate("e"));
        parameters.addAll(scope.hrUserParameters());

        var count = jdbcTemplate.queryForObject(sql.toString(), Integer.class, parameters.toArray());
        return count == null ? 0 : count;
    }

    List<Map<String, Object>> scopeStructureMap(HrOperationalScope scope, List<Map<String, Object>> units) {
        if (scope == null || scope.isCorporateOffice()) {
            return units;
        }

        var scopedUnits = new ArrayList<Map<String, Object>>();
        for (var unit : units) {
            if (unit == null || unit.isEmpty()) {
                continue;
            }

            var unitId = optionalLong(unit.get("legacy_unit_id"));
            var businesses = castMapList(unit.get("businesses"));

            if (HrOperationalScope.Type.UNIT_HEADQUARTERS.equals(scope.type())) {
                if (scope.unitId() == null || !scope.unitId().equals(unitId)) {
                    continue;
                }

                var scopedUnit = new LinkedHashMap<>(unit);
                scopedUnit.put("businesses", businesses);
                scopedUnits.add(scopedUnit);
                continue;
            }

            var scopedBusinesses = businesses.stream()
                .filter((business) -> {
                    var businessId = optionalLong(business.get("legacy_business_id"));
                    return scope.businessId() != null && scope.businessId().equals(businessId);
                })
                .map(LinkedHashMap::new)
                .map((business) -> (Map<String, Object>) business)
                .toList();

            if (scopedBusinesses.isEmpty()) {
                continue;
            }

            var scopedUnit = new LinkedHashMap<>(unit);
            scopedUnit.put("businesses", scopedBusinesses);
            scopedUnits.add(scopedUnit);
        }

        return scopedUnits;
    }

    private List<Map<String, Object>> castMapList(Object value) {
        if (!(value instanceof List<?> list)) {
            return List.of();
        }

        var result = new ArrayList<Map<String, Object>>();
        for (var item : list) {
            if (item instanceof Map<?, ?> rawMap) {
                var normalized = new LinkedHashMap<String, Object>();
                rawMap.forEach((key, rawValue) -> normalized.put(String.valueOf(key), rawValue));
                result.add(normalized);
            }
        }
        return result;
    }

    private Long optionalLong(Object value) {
        if (value instanceof Number number) {
            return number.longValue();
        }
        if (value instanceof String text && !text.isBlank()) {
            try {
                return Long.parseLong(text.trim());
            } catch (NumberFormatException ignored) {
                return null;
            }
        }
        return null;
    }
}
