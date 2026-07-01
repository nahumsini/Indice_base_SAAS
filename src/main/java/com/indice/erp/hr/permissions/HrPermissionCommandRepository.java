package com.indice.erp.hr.permissions;

import com.indice.erp.hr.permissions.HrPermissionPayloadSupport.PermissionDraft;
import com.indice.erp.hr.shared.HrPayloadUtils;
import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.List;
import java.util.NoSuchElementException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Repository;

@Repository
public class HrPermissionCommandRepository {

    private final JdbcTemplate jdbcTemplate;

    public HrPermissionCommandRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public PermissionUserSnapshot loadUserSnapshot(long companyId, long userCompanyId) {
        var rows = jdbcTemplate.query(
            """
                SELECT wp.user_company_id, wp.user_id, COALESCE(NULLIF(u.full_name, ''), u.email, CONCAT('User ', u.id)) AS user_name,
                       COALESCE(wp.position, '') AS position, COALESCE(wp.department, '') AS department
                FROM user_work_profiles wp
                JOIN users u ON u.id = wp.user_id
                WHERE wp.company_id = ?
                  AND wp.user_company_id = ?
                LIMIT 1
                """,
            (rs, rowNum) -> new PermissionUserSnapshot(rs.getLong("user_company_id"), rs.getLong("user_id"), HrPayloadUtils.safe(rs.getString("user_name")), HrPayloadUtils.safe(rs.getString("position")), HrPayloadUtils.safe(rs.getString("department"))),
            companyId,
            userCompanyId
        );
        if (rows.isEmpty()) {
            throw new NoSuchElementException("HR user not found.");
        }
        return rows.getFirst();
    }

    public long createRequest(long companyId, long actorUserId, PermissionUserSnapshot snapshot, PermissionDraft draft) {
        KeyHolder keyHolder = new GeneratedKeyHolder();
        jdbcTemplate.update(connection -> {
            var statement = connection.prepareStatement(
                """
                    INSERT INTO user_permission_requests
                    (company_id, user_company_id, user_id, user_name_snapshot, user_position_snapshot, user_department_snapshot,
                     permission_type, payroll_treatment, start_date, end_date, requested_days, is_half_day, status, reason, created_by_user_id, updated_by_user_id)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?)
                    """,
                new String[] {"id"}
            );
            statement.setLong(1, companyId);
            statement.setLong(2, snapshot.userCompanyId());
            statement.setLong(3, snapshot.userId());
            statement.setString(4, snapshot.userName());
            statement.setString(5, HrPayloadUtils.nullable(snapshot.position()));
            statement.setString(6, HrPayloadUtils.nullable(snapshot.department()));
            statement.setString(7, draft.type());
            statement.setString(8, draft.payrollTreatment());
            statement.setObject(9, draft.startDate());
            statement.setObject(10, draft.endDate());
            statement.setBigDecimal(11, draft.requestedDays());
            statement.setBoolean(12, draft.halfDay());
            statement.setString(13, draft.reason());
            statement.setLong(14, actorUserId);
            statement.setLong(15, actorUserId);
            return statement;
        }, keyHolder);
        return keyHolder.getKey() == null ? 0L : keyHolder.getKey().longValue();
    }

    public void updateRequestNumber(long companyId, long requestId, String requestNumber) {
        jdbcTemplate.update("UPDATE user_permission_requests SET request_number = ? WHERE company_id = ? AND id = ?", requestNumber, companyId, requestId);
    }

    public PermissionRequestState loadRequestState(long companyId, long requestId) {
        var rows = jdbcTemplate.query(
            """
                SELECT id, user_company_id, status
                FROM user_permission_requests
                WHERE company_id = ?
                  AND id = ?
                LIMIT 1
                """,
            (rs, rowNum) -> new PermissionRequestState(rs.getLong("id"), rs.getLong("user_company_id"), HrPayloadUtils.safe(rs.getString("status"))),
            companyId,
            requestId
        );
        if (rows.isEmpty()) {
            throw new NoSuchElementException("Permission request not found.");
        }
        return rows.getFirst();
    }

    public void updateStatus(long companyId, long actorUserId, long requestId, String status, String reviewNotes) {
        jdbcTemplate.update(
            """
                UPDATE user_permission_requests
                SET status = ?, review_notes = ?, reviewed_by_user_id = ?, reviewed_at = ?, updated_by_user_id = ?, updated_at = CURRENT_TIMESTAMP
                WHERE company_id = ?
                  AND id = ?
                """,
            status,
            HrPayloadUtils.nullable(reviewNotes),
            actorUserId,
            Timestamp.valueOf(LocalDateTime.now()),
            actorUserId,
            companyId,
            requestId
        );
    }

    public int updateStatusIfPending(long companyId, long actorUserId, long requestId, String status, String reviewNotes) {
        return jdbcTemplate.update(
            """
                UPDATE user_permission_requests
                SET status = ?, review_notes = ?, reviewed_by_user_id = ?, reviewed_at = ?, updated_by_user_id = ?, updated_at = CURRENT_TIMESTAMP
                WHERE company_id = ?
                  AND id = ?
                  AND LOWER(COALESCE(status, 'pending')) = 'pending'
                """,
            status,
            HrPayloadUtils.nullable(reviewNotes),
            actorUserId,
            Timestamp.valueOf(LocalDateTime.now()),
            actorUserId,
            companyId,
            requestId
        );
    }

    public record PermissionUserSnapshot(long userCompanyId, long userId, String userName, String position, String department) {
    }

    public record PermissionRequestState(long requestId, long userCompanyId, String status) {
    }
}
