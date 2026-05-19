package com.indice.erp.hr.permissions;

import com.indice.erp.hr.shared.HrPayloadUtils;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class HrPermissionDetailRepository {

    private final JdbcTemplate jdbcTemplate;

    public HrPermissionDetailRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public Map<String, Object> findRequest(long companyId, Long userCompanyId, long requestId) {
        var rows = jdbcTemplate.query(
            """
                SELECT r.id, r.request_number, r.user_company_id, r.user_name_snapshot, r.user_position_snapshot,
                       r.user_department_snapshot, r.permission_type, r.start_date, r.end_date, r.requested_days,
                       r.is_half_day, r.status, r.reason, r.review_notes, r.reviewed_by_user_id, r.reviewed_at,
                       r.created_at, r.updated_at, COALESCE(NULLIF(reviewer.full_name, ''), reviewer.email, '') AS reviewed_by_name
                FROM user_permission_requests r
                LEFT JOIN users reviewer ON reviewer.id = r.reviewed_by_user_id
                WHERE r.company_id = ?
                  AND r.id = ?
                """
                + (userCompanyId == null ? "" : " AND r.user_company_id = ?"),
            (rs, rowNum) -> mapRequest(rs),
            args(companyId, requestId, userCompanyId)
        );
        if (rows.isEmpty()) {
            throw new NoSuchElementException("Permission request not found.");
        }
        var permission = rows.getFirst();
        permission.put("attachments", attachments(companyId, requestId));
        return permission;
    }

    private List<Map<String, Object>> attachments(long companyId, long requestId) {
        return jdbcTemplate.query(
            """
                SELECT id, original_filename, mime_type, size_bytes, object_key, uploaded_by_user_id, created_at, updated_at
                FROM user_permission_attachments
                WHERE company_id = ?
                  AND permission_request_id = ?
                  AND deleted_at IS NULL
                ORDER BY id ASC
                """,
            (rs, rowNum) -> attachment(rs),
            companyId,
            requestId
        );
    }

    private Map<String, Object> mapRequest(ResultSet rs) throws SQLException {
        var body = new LinkedHashMap<String, Object>();
        body.put("id", rs.getLong("id"));
        body.put("folio", HrPayloadUtils.safe(rs.getString("request_number")));
        body.put("employee", Map.of("id", rs.getLong("user_company_id"), "name", HrPayloadUtils.safe(rs.getString("user_name_snapshot")), "initials", initials(rs.getString("user_name_snapshot")), "avatar", "", "position", HrPayloadUtils.safe(rs.getString("user_position_snapshot")), "department", HrPayloadUtils.safe(rs.getString("user_department_snapshot"))));
        body.put("type", HrPayloadUtils.safe(rs.getString("permission_type")));
        body.put("startDate", asDate(rs.getObject("start_date", LocalDate.class)));
        body.put("endDate", asDate(rs.getObject("end_date", LocalDate.class)));
        body.put("days", rs.getBigDecimal("requested_days"));
        body.put("halfDay", rs.getBoolean("is_half_day"));
        body.put("status", HrPayloadUtils.safe(rs.getString("status")));
        body.put("reason", HrPayloadUtils.safe(rs.getString("reason")));
        body.put("reviewNotes", HrPayloadUtils.safe(rs.getString("review_notes")));
        body.put("reviewedAt", asDateTime(rs.getTimestamp("reviewed_at")));
        body.put("reviewedBy", reviewedBy(nullableLong(rs.getObject("reviewed_by_user_id")), rs.getString("reviewed_by_name")));
        body.put("createdAt", asDateTime(rs.getTimestamp("created_at")));
        body.put("updatedAt", asDateTime(rs.getTimestamp("updated_at")));
        return body;
    }

    private Map<String, Object> attachment(ResultSet rs) throws SQLException {
        var body = new LinkedHashMap<String, Object>();
        body.put("id", rs.getLong("id"));
        body.put("fileName", HrPayloadUtils.safe(rs.getString("original_filename")));
        body.put("mimeType", HrPayloadUtils.safe(rs.getString("mime_type")));
        body.put("sizeBytes", rs.getLong("size_bytes"));
        body.put("objectKey", HrPayloadUtils.safe(rs.getString("object_key")));
        body.put("uploadedByUserId", rs.getLong("uploaded_by_user_id"));
        body.put("createdAt", asDateTime(rs.getTimestamp("created_at")));
        body.put("updatedAt", asDateTime(rs.getTimestamp("updated_at")));
        return body;
    }

    private Object[] args(long companyId, long requestId, Long userCompanyId) {
        return userCompanyId == null ? new Object[] {companyId, requestId} : new Object[] {companyId, requestId, userCompanyId};
    }

    private String initials(String name) {
        var parts = HrPayloadUtils.safe(name).trim().split("\\s+");
        return parts.length < 2 ? HrPayloadUtils.safe(name).substring(0, Math.min(2, HrPayloadUtils.safe(name).length())).toUpperCase() : (parts[0].substring(0, 1) + parts[1].substring(0, 1)).toUpperCase();
    }

    private Long nullableLong(Object value) {
        return value instanceof Number number ? number.longValue() : null;
    }

    private Map<String, Object> reviewedBy(Long userId, String name) {
        var body = new LinkedHashMap<String, Object>();
        body.put("id", userId);
        body.put("name", HrPayloadUtils.safe(name));
        return body;
    }

    private String asDate(LocalDate value) {
        return value == null ? null : value.toString();
    }

    private String asDateTime(Timestamp value) {
        return value == null ? null : value.toLocalDateTime().toString();
    }
}
