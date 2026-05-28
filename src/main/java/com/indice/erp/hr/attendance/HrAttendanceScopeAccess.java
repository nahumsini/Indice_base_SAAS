package com.indice.erp.hr.attendance;

import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.hr.HrOperationalScope;
import com.indice.erp.hr.HrOperationalScopeService;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.NoSuchElementException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

@Service
public class HrAttendanceScopeAccess {

    private final JdbcTemplate jdbcTemplate;
    private final HrOperationalScopeService hrOperationalScopeService;

    public HrAttendanceScopeAccess(
        JdbcTemplate jdbcTemplate,
        HrOperationalScopeService hrOperationalScopeService
    ) {
        this.jdbcTemplate = jdbcTemplate;
        this.hrOperationalScopeService = hrOperationalScopeService;
    }

    public HrOperationalScope resolve(AuthSessionUser currentUser) {
        return hrOperationalScopeService.resolve(currentUser);
    }

    public boolean isCorporateOffice(HrOperationalScope scope) {
        return scope == null || scope.isCorporateOffice();
    }

    public void requireUserInScope(long companyId, HrOperationalScope scope, long userCompanyId) {
        hrOperationalScopeService.requireUserInScope(companyId, normalizeScope(scope), userCompanyId);
    }

    public void requireAssignmentInScope(long companyId, HrOperationalScope scope, Long unitId, Long businessId) {
        hrOperationalScopeService.requireAssignmentInScope(companyId, normalizeScope(scope), unitId, businessId);
    }

    public void requireLocationInScope(long companyId, HrOperationalScope scope, long locationId) {
        if (isCorporateOffice(scope)) {
            return;
        }

        var rows = jdbcTemplate.query(
            """
                SELECT unit_id,
                       business_id
                FROM attendance_locations
                WHERE company_id = ?
                  AND id = ?
                LIMIT 1
                """,
            (rs, rowNum) -> new ScopedAssignment(
                getNullableLong(rs, "unit_id"),
                getNullableLong(rs, "business_id")
            ),
            companyId,
            locationId
        );

        if (rows.isEmpty()) {
            throw new NoSuchElementException("Attendance location not found.");
        }

        var assignment = rows.getFirst();
        requireAssignmentInScope(companyId, scope, assignment.unitId(), assignment.businessId());
    }

    public void requireKioskDeviceInScope(long companyId, HrOperationalScope scope, long kioskDeviceId) {
        if (isCorporateOffice(scope)) {
            return;
        }

        var rows = jdbcTemplate.query(
            """
                SELECT COALESCE(d.unit_id, l.unit_id) AS unit_id,
                       COALESCE(d.business_id, l.business_id) AS business_id
                FROM attendance_kiosk_devices d
                LEFT JOIN attendance_locations l ON l.id = d.location_id
                WHERE d.company_id = ?
                  AND d.id = ?
                LIMIT 1
                """,
            (rs, rowNum) -> new ScopedAssignment(
                getNullableLong(rs, "unit_id"),
                getNullableLong(rs, "business_id")
            ),
            companyId,
            kioskDeviceId
        );

        if (rows.isEmpty()) {
            throw new NoSuchElementException("Kiosk device not found.");
        }

        var assignment = rows.getFirst();
        requireAssignmentInScope(companyId, scope, assignment.unitId(), assignment.businessId());
    }

    public void requireFaceVerificationSessionInScope(long companyId, HrOperationalScope scope, long sessionId) {
        if (isCorporateOffice(scope)) {
            return;
        }

        var rows = jdbcTemplate.query(
            """
                SELECT user_company_id
                FROM user_face_verification_sessions
                WHERE company_id = ?
                  AND id = ?
                LIMIT 1
                """,
            (rs, rowNum) -> rs.getLong("user_company_id"),
            companyId,
            sessionId
        );

        if (rows.isEmpty()) {
            throw new NoSuchElementException("Face verification session not found.");
        }

        requireUserInScope(companyId, scope, rows.getFirst());
    }

    private HrOperationalScope normalizeScope(HrOperationalScope scope) {
        return scope == null ? HrOperationalScope.corporateOffice() : scope;
    }

    private Long getNullableLong(ResultSet rs, String column) throws SQLException {
        var value = rs.getLong(column);
        return rs.wasNull() ? null : value;
    }

    private record ScopedAssignment(Long unitId, Long businessId) {
    }
}
