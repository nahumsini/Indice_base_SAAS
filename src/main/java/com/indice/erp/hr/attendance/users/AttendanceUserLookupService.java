package com.indice.erp.hr.attendance.users;

import com.indice.erp.hr.attendance.application.AttendancePhotoService;
import com.indice.erp.hr.attendance.models.AttendanceHrUser;
import com.indice.erp.hr.attendance.models.AttendanceUser;
import com.indice.erp.hr.HrOperationalScope;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.NoSuchElementException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import static com.indice.erp.hr.attendance.support.AttendancePresentation.firstNonBlank;
import static com.indice.erp.hr.shared.HrPayloadUtils.isBlank;
import static com.indice.erp.hr.shared.HrPayloadUtils.safe;


@Service
public class AttendanceUserLookupService {

    private final JdbcTemplate jdbcTemplate;
    private final AttendancePhotoService attendancePhotoService;

    public AttendanceUserLookupService(JdbcTemplate jdbcTemplate, AttendancePhotoService attendancePhotoService) {
        this.jdbcTemplate = jdbcTemplate;
        this.attendancePhotoService = attendancePhotoService;
    }

    public AttendanceHrUser loadAttendanceUser(long companyId, long userCompanyId) {
        var users = jdbcTemplate.query(
            attendanceUserSql("e.id = ?"),
            (rs, rowNum) -> mapAttendanceUser(rs),
            companyId,
            userCompanyId
        );
        if (users.isEmpty()) {
            throw new NoSuchElementException("HR user not found.");
        }
        return users.getFirst();
    }

    public long loadUserIdForCompanyUser(long companyId, long userCompanyId) {
        var rows = jdbcTemplate.query(
            """
                SELECT user_id
                FROM user_companies
                WHERE company_id = ?
                  AND id = ?
                LIMIT 1
                """,
            (rs, rowNum) -> rs.getLong("user_id"),
            companyId,
            userCompanyId
        );
        if (rows.isEmpty()) {
            throw new NoSuchElementException("User company record not found.");
        }
        return rows.getFirst();
    }

    public AttendanceHrUser resolveLinkedAttendanceUser(long companyId, long userId) {
        var users = jdbcTemplate.query(
            """
                SELECT e.id,
                       COALESCE(e.user_code, '') AS user_code,
                       TRIM(CONCAT_WS(' ', COALESCE(e.first_name, ''), COALESCE(e.last_name, ''))) AS full_name,
                       COALESCE(e.position, '') AS position,
                       COALESCE(e.department, '') AS department,
                       e.hire_date AS hire_date,
                       COALESCE(LOWER(e.status), 'active') AS status,
                       u.id AS unit_id,
                       u.name AS unit_name,
                       b.id AS business_id,
                       b.name AS business_name
                FROM hr_users e
                LEFT JOIN units u ON u.id = e.unit_id
                LEFT JOIN businesses b ON b.id = e.business_id
                WHERE e.company_id = ?
                  AND e.user_id = ?
                  AND COALESCE(LOWER(e.status), 'active') <> 'terminated'
                ORDER BY e.id ASC
                LIMIT 1
                """,
            (rs, rowNum) -> mapAttendanceUser(rs),
            companyId,
            userId
        );
        if (users.isEmpty()) {
            throw new NoSuchElementException("No HR user profile is linked to this user.");
        }
        return users.getFirst();
    }

    public AttendanceUser loadAttendanceSessionUser(long companyId, long userId) {
        var rows = jdbcTemplate.query(
            """
                SELECT u.id,
                       uc.id AS user_company_id,
                       LOWER(TRIM(COALESCE(u.email, ''))) AS email,
                       COALESCE(NULLIF(TRIM(u.full_name), ''), TRIM(u.email), CONCAT('User ', u.id)) AS full_name,
                       COALESCE(LOWER(uc.role), 'user') AS role,
                       COALESCE(LOWER(uc.status), 'active') AS status,
                       COALESCE(p.avatar_url, '') AS avatar_url,
                       COALESCE(p.avatar_object_key, '') AS avatar_object_key
                FROM users u
                JOIN user_companies uc ON uc.user_id = u.id
                LEFT JOIN user_profiles p ON p.user_id = u.id
                WHERE u.id = ?
                  AND uc.company_id = ?
                  AND LOWER(COALESCE(uc.status, 'active')) IN ('active', 'activo')
                LIMIT 1
                """,
            (rs, rowNum) -> new AttendanceUser(
                rs.getLong("id"),
                rs.getLong("user_company_id"),
                safe(rs.getString("email")),
                safe(rs.getString("full_name")),
                safe(rs.getString("role")),
                safe(rs.getString("status")),
                firstNonBlank(
                    safe(attendancePhotoService.signedProfileAvatarUrl(rs.getString("avatar_object_key"))),
                    safe(rs.getString("avatar_url"))
                )
            ),
            userId,
            companyId
        );
        if (rows.isEmpty()) {
            throw new NoSuchElementException("No active company user was found for the current session.");
        }
        var sessionUser = rows.getFirst();
        if (sessionUser.email().isBlank()) {
            throw new IllegalArgumentException("Your user account must have an email address to use Attendance.");
        }
        return sessionUser;
    }

    public List<AttendanceHrUser> listAttendanceUsers(long companyId) {
        return listAttendanceUsers(companyId, HrOperationalScope.corporateOffice());
    }

    public List<AttendanceHrUser> listAttendanceUsers(long companyId, HrOperationalScope scope) {
        var normalizedScope = scope == null ? HrOperationalScope.corporateOffice() : scope;
        var extraWhere = new StringBuilder("COALESCE(LOWER(e.status), 'active') <> 'terminated'");
        var parameters = new ArrayList<Object>();
        parameters.add(companyId);
        if (!normalizedScope.isCorporateOffice()) {
            extraWhere.append(normalizedScope.hrUserPredicate("e"));
            parameters.addAll(normalizedScope.hrUserParameters());
        }
        return jdbcTemplate.query(
            attendanceUserSql(extraWhere.toString()) + " ORDER BY full_name ASC, e.id ASC",
            (rs, rowNum) -> mapAttendanceUser(rs),
            parameters.toArray()
        );
    }

    public AttendanceHrUser mapAttendanceUser(ResultSet rs) throws SQLException {
        return new AttendanceHrUser(
            rs.getLong("id"),
            safe(rs.getString("user_code")),
            safe(rs.getString("full_name")),
            safe(rs.getString("position")),
            safe(rs.getString("department")),
            rs.getObject("hire_date", LocalDate.class),
            safe(rs.getString("status")),
            getNullableLong(rs, "unit_id"),
            safe(rs.getString("unit_name")),
            getNullableLong(rs, "business_id"),
            safe(rs.getString("business_name"))
        );
    }

    private String attendanceUserSql(String extraWhere) {
        return """
            SELECT e.id,
                   COALESCE(e.user_code, '') AS user_code,
                   TRIM(CONCAT_WS(' ', COALESCE(e.first_name, ''), COALESCE(e.last_name, ''))) AS full_name,
                   COALESCE(e.position, '') AS position,
                   COALESCE(e.department, '') AS department,
                   e.hire_date AS hire_date,
                   COALESCE(LOWER(e.status), 'active') AS status,
                   u.id AS unit_id,
                   u.name AS unit_name,
                   b.id AS business_id,
                   b.name AS business_name
            FROM hr_users e
            LEFT JOIN units u ON u.id = e.unit_id
            LEFT JOIN businesses b ON b.id = e.business_id
            WHERE e.company_id = ?
              AND %s
            """.formatted(extraWhere);
    }

    private Long getNullableLong(ResultSet rs, String column) throws SQLException {
        var value = rs.getLong(column);
        return rs.wasNull() ? null : value;
    }
}
