package com.indice.erp.hr.permissions;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class HrPermissionDeleteRepository {

    private final JdbcTemplate jdbcTemplate;

    public HrPermissionDeleteRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public int deletePendingOwnRequest(long companyId, long userCompanyId, long requestId) {
        return jdbcTemplate.update(
            """
                DELETE FROM user_permission_requests
                WHERE company_id = ?
                  AND user_company_id = ?
                  AND id = ?
                  AND LOWER(COALESCE(status, 'pending')) = 'pending'
                """,
            companyId,
            userCompanyId,
            requestId
        );
    }
}
