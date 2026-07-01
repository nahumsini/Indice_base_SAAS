package com.indice.erp.hr.permissions;

import java.time.LocalDate;
import java.util.NoSuchElementException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class HrPermissionAttendanceSyncRepository {

    private final JdbcTemplate jdbcTemplate;

    public HrPermissionAttendanceSyncRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public ApprovedPermissionWindow loadApprovedWindow(long companyId, long requestId) {
        var rows = jdbcTemplate.query(
            """
                SELECT user_company_id, start_date, end_date, payroll_treatment
                FROM user_permission_requests
                WHERE company_id = ?
                  AND id = ?
                LIMIT 1
                """,
            (rs, rowNum) -> new ApprovedPermissionWindow(
                rs.getLong("user_company_id"),
                rs.getObject("start_date", LocalDate.class),
                rs.getObject("end_date", LocalDate.class),
                rs.getString("payroll_treatment")
            ),
            companyId,
            requestId
        );
        if (rows.isEmpty()) {
            throw new NoSuchElementException("Permission request not found.");
        }
        return rows.getFirst();
    }

    public record ApprovedPermissionWindow(long userCompanyId, LocalDate startDate, LocalDate endDate, String payrollTreatment) {
    }
}
