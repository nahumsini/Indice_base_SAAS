package com.indice.erp.hr.permissions;

import com.indice.erp.hr.shared.HrPayloadUtils;
import java.math.BigDecimal;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class HrPermissionListRepository {

    private final JdbcTemplate jdbcTemplate;

    public HrPermissionListRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public PermissionListResult listRequests(long companyId, Long userCompanyId, Map<String, String> filters) {
        var spec = spec(companyId, userCompanyId, filters);
        var items = jdbcTemplate.query(
            """
                SELECT r.id, r.request_number, r.user_company_id, r.user_name_snapshot, r.user_position_snapshot,
                       r.user_department_snapshot, r.permission_type, r.start_date, r.end_date, r.requested_days,
                       r.is_half_day, r.status, r.reason, r.created_at, r.updated_at,
                       (
                         SELECT a.original_filename
                         FROM user_permission_attachments a
                         WHERE a.company_id = r.company_id
                           AND a.permission_request_id = r.id
                           AND a.deleted_at IS NULL
                         ORDER BY a.id ASC
                         LIMIT 1
                       ) AS attachment_name
                FROM user_permission_requests r
                """
                + spec.whereClause()
                + " ORDER BY CASE WHEN LOWER(COALESCE(r.status, 'pending')) = 'pending' THEN 0 ELSE 1 END, r.created_at DESC, r.id DESC",
            (rs, rowNum) -> mapRow(rs),
            spec.params().toArray()
        );
        var total = jdbcTemplate.queryForObject(
            "SELECT COUNT(*) FROM user_permission_requests r " + spec.whereClause(),
            Long.class,
            spec.params().toArray()
        );
        return new PermissionListResult(items, total == null ? 0L : total, summary(companyId, userCompanyId));
    }
    private Map<String, Object> summary(long companyId, Long userCompanyId) {
        var params = new ArrayList<Object>();
        params.add(companyId);
        var clause = new StringBuilder(" WHERE company_id = ?");
        if (userCompanyId != null) {
            clause.append(" AND user_company_id = ?");
            params.add(userCompanyId);
        }
        return jdbcTemplate.queryForObject(
            """
                SELECT COUNT(*) AS total_count,
                       SUM(CASE WHEN LOWER(COALESCE(status, 'pending')) = 'pending' THEN 1 ELSE 0 END) AS pending_count,
                       SUM(CASE WHEN LOWER(COALESCE(status, 'pending')) = 'approved' THEN 1 ELSE 0 END) AS approved_count,
                       SUM(CASE WHEN LOWER(COALESCE(status, 'pending')) = 'rejected' THEN 1 ELSE 0 END) AS rejected_count
                FROM user_permission_requests
                """
                + clause,
            (rs, rowNum) -> Map.of(
                "total", rs.getLong("total_count"),
                "pending", rs.getLong("pending_count"),
                "approved", rs.getLong("approved_count"),
                "rejected", rs.getLong("rejected_count")
            ),
            params.toArray()
        );
    }
    private QuerySpec spec(long companyId, Long userCompanyId, Map<String, String> filters) {
        var where = new StringBuilder(" WHERE r.company_id = ?");
        var params = new ArrayList<Object>();
        params.add(companyId);
        if (userCompanyId != null) {
            where.append(" AND r.user_company_id = ?");
            params.add(userCompanyId);
        }
        var search = HrPayloadUtils.safe(filters.get("search")).trim().toLowerCase();
        if (!search.isBlank()) {
            where.append(" AND (LOWER(COALESCE(r.user_name_snapshot, '')) LIKE ? OR LOWER(COALESCE(r.request_number, '')) LIKE ?)");
            params.add("%" + search + "%");
            params.add("%" + search + "%");
        }
        appendEqualsFilter(where, params, "status", HrPayloadUtils.safe(filters.get("status")));
        appendEqualsFilter(where, params, "permission_type", HrPayloadUtils.safe(filters.get("type")));
        var employee = HrPayloadUtils.safe(filters.get("employee")).trim();
        if (!employee.isBlank() && !"all".equalsIgnoreCase(employee)) {
            where.append(" AND r.user_name_snapshot = ?");
            params.add(employee);
        }
        return new QuerySpec(where.toString(), params);
    }
    private void appendEqualsFilter(StringBuilder where, List<Object> params, String column, String rawValue) {
        var value = rawValue.trim().toLowerCase();
        if (!value.isBlank() && !"all".equals(value)) {
            where.append(" AND LOWER(COALESCE(r.").append(column).append(", '')) = ?");
            params.add(value);
        }
    }
    private Map<String, Object> mapRow(ResultSet rs) throws SQLException {
        var item = new LinkedHashMap<String, Object>();
        item.put("id", rs.getLong("id"));
        item.put("folio", HrPayloadUtils.safe(rs.getString("request_number")));
        item.put("employee", employee(rs.getLong("user_company_id"), rs.getString("user_name_snapshot"), rs.getString("user_position_snapshot"), rs.getString("user_department_snapshot")));
        item.put("type", HrPayloadUtils.safe(rs.getString("permission_type")));
        item.put("startDate", asDate(rs.getObject("start_date", LocalDate.class)));
        item.put("endDate", asDate(rs.getObject("end_date", LocalDate.class)));
        item.put("days", rs.getBigDecimal("requested_days") == null ? BigDecimal.ZERO : rs.getBigDecimal("requested_days"));
        item.put("halfDay", rs.getBoolean("is_half_day"));
        item.put("status", HrPayloadUtils.safe(rs.getString("status")));
        item.put("reason", HrPayloadUtils.safe(rs.getString("reason")));
        item.put("attachmentName", HrPayloadUtils.safe(rs.getString("attachment_name")));
        item.put("createdAt", asDateTime(rs.getTimestamp("created_at")));
        item.put("updatedAt", asDateTime(rs.getTimestamp("updated_at")));
        return item;
    }
    private Map<String, Object> employee(long userCompanyId, String name, String position, String department) {
        return Map.of("id", userCompanyId, "name", HrPayloadUtils.safe(name), "initials", initials(name), "avatar", "", "position", HrPayloadUtils.safe(position), "department", HrPayloadUtils.safe(department));
    }
    private String initials(String name) {
        var parts = HrPayloadUtils.safe(name).trim().split("\\s+");
        return parts.length < 2 ? HrPayloadUtils.safe(name).substring(0, Math.min(2, HrPayloadUtils.safe(name).length())).toUpperCase() : (parts[0].substring(0, 1) + parts[1].substring(0, 1)).toUpperCase();
    }
    private String asDate(LocalDate value) {
        return value == null ? null : value.toString();
    }
    private String asDateTime(Timestamp value) {
        return value == null ? null : value.toLocalDateTime().toString();
    }

    private record QuerySpec(String whereClause, List<Object> params) {
    }

    public record PermissionListResult(List<Map<String, Object>> items, long totalCount, Map<String, Object> summary) {
    }
}
