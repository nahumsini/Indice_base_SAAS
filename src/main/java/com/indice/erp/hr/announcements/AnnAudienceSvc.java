package com.indice.erp.hr.announcements;

import com.indice.erp.hr.HrOperationalScope;
import com.indice.erp.hr.shared.HrPayloadUtils;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

@Service
public class AnnAudienceSvc {

    private static final List<String> DEPARTMENTS = List.of(
        "Operations", "Administration", "Sales", "Customer Service", "Finance",
        "Human Resources", "Marketing", "Logistics", "Purchasing", "IT",
        "Management", "Production", "Kitchen", "Maintenance", "Security",
        "Cleaning", "Field Operations", "Construction", "Medical", "Legal"
    );

    private final JdbcTemplate jdbcTemplate;

    public AnnAudienceSvc(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public Map<String, Object> options(HrAnnouncementActor actor) {
        if (!actor.managementAccess()) {
            throw new HrAnnouncementApiException(HttpStatus.FORBIDDEN, "Forbidden");
        }
        var scope = actor.operationalScope();
        var body = new LinkedHashMap<String, Object>();
        body.put("departments", scope.isCorporateOffice() ? departments(actor.companyId()) : List.of());
        body.put("units", units(actor.companyId(), scope));
        body.put("employees", employees(actor.companyId(), scope));
        return body;
    }

    private List<Map<String, Object>> departments(long companyId) {
        var labels = new LinkedHashMap<String, String>();
        var counts = new LinkedHashMap<String, Integer>();
        DEPARTMENTS.forEach(name -> labels.put(normalize(name), name));
        jdbcTemplate.query(
            """
                SELECT MIN(TRIM(wp.department)) AS name,
                       COUNT(DISTINCT wp.user_company_id) AS active_user_count
                FROM user_work_profiles wp
                JOIN user_companies uc
                  ON uc.id = wp.user_company_id
                 AND uc.company_id = wp.company_id
                 AND LOWER(COALESCE(uc.status, 'active')) IN ('active', 'activo')
                WHERE wp.company_id = ?
                  AND LOWER(COALESCE(wp.status, 'active')) IN ('active', 'activo')
                  AND NULLIF(TRIM(wp.department), '') IS NOT NULL
                GROUP BY LOWER(TRIM(wp.department))
                """,
            rs -> {
                var name = clean(rs.getString("name"));
                if (name != null) {
                    var key = normalize(name);
                    labels.putIfAbsent(key, name);
                    counts.put(key, rs.getInt("active_user_count"));
                }
            },
            companyId
        );
        return labels.values().stream().map(name -> option(name, counts.getOrDefault(normalize(name), 0))).toList();
    }

    private List<Map<String, Object>> units(long companyId) {
        return units(companyId, null);
    }

    private List<Map<String, Object>> units(long companyId, HrOperationalScope scope) {
        if (scope != null && HrOperationalScope.Type.BUSINESS_OFFICE.equals(scope.type())) {
            return List.of();
        }
        var parameters = new ArrayList<Object>();
        parameters.add(companyId);
        var sql = """
            SELECT u.id, u.name, COUNT(DISTINCT uc.id) AS active_user_count
            FROM units u
            LEFT JOIN user_work_profiles wp
              ON wp.company_id = u.company_id
             AND wp.unit_id = u.id
             AND LOWER(COALESCE(wp.status, 'active')) IN ('active', 'activo')
            LEFT JOIN user_companies uc
              ON uc.id = wp.user_company_id
             AND uc.company_id = wp.company_id
             AND LOWER(COALESCE(uc.status, 'active')) IN ('active', 'activo')
            WHERE u.company_id = ?
              AND LOWER(COALESCE(u.status, 'active')) IN ('active', 'activo')
            """;
        if (scope != null && !scope.isCorporateOffice()) {
            sql += " AND u.id = ?";
            parameters.add(scope.unitId());
        }
        sql += " GROUP BY u.id, u.name ORDER BY u.name ASC";
        return jdbcTemplate.query(
            sql,
            (rs, rowNum) -> {
                var count = rs.getInt("active_user_count");
                var item = new LinkedHashMap<String, Object>();
                item.put("id", rs.getLong("id"));
                item.put("name", clean(rs.getString("name")));
                item.put("active_user_count", count);
                item.put("is_available", count > 0);
                return item;
            },
            parameters.toArray()
        );
    }

    private List<Map<String, Object>> employees(long companyId) {
        return employees(companyId, null);
    }

    private List<Map<String, Object>> employees(long companyId, HrOperationalScope scope) {
        var parameters = new ArrayList<Object>();
        parameters.add(companyId);
        var sql = """
            SELECT COALESCE(e.user_company_id, e.id) AS id, e.full_name, e.position,
                   e.unit_id, u.name AS unit_name, e.department
            FROM hr_users e
            LEFT JOIN units u
              ON u.id = e.unit_id
             AND u.company_id = e.company_id
            WHERE e.company_id = ?
              AND e.work_profile_id IS NOT NULL
              AND LOWER(COALESCE(e.status, 'active')) IN ('active', 'activo')
            """;
        if (scope != null && !scope.isCorporateOffice()) {
            sql += scope.hrUserPredicate("e");
            parameters.addAll(scope.hrUserParameters());
        }
        sql += " ORDER BY e.full_name ASC, id ASC";
        return jdbcTemplate.query(
            sql,
            (rs, rowNum) -> {
                var item = new LinkedHashMap<String, Object>();
                item.put("id", rs.getLong("id"));
                item.put("name", clean(rs.getString("full_name")));
                item.put("position", clean(rs.getString("position")));
                item.put("unit_id", rs.getObject("unit_id"));
                item.put("unit_name", clean(rs.getString("unit_name")));
                item.put("department", clean(rs.getString("department")));
                return item;
            },
            parameters.toArray()
        );
    }

    private Map<String, Object> option(String name, int count) {
        return Map.of("name", name, "active_user_count", count, "is_available", count > 0);
    }

    private String clean(String value) {
        var trimmed = HrPayloadUtils.safe(value).trim();
        return trimmed.isBlank() ? null : trimmed;
    }

    private String normalize(String value) {
        return HrPayloadUtils.safe(value).trim().toLowerCase(Locale.ROOT);
    }
}
