package com.indice.erp.face;

import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.hr.HrAccessDeniedException;
import com.indice.erp.hr.HrAccessService;
import com.indice.erp.hr.HrAccessService.HrTab;
import com.indice.erp.hr.HrOperationalScopeService;
import java.util.NoSuchElementException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

@Service
public class HrFaceAccessService {

    private final JdbcTemplate jdbcTemplate;
    private final HrAccessService hrAccessService;
    private final HrOperationalScopeService hrOperationalScopeService;

    public HrFaceAccessService(
        JdbcTemplate jdbcTemplate,
        HrAccessService hrAccessService,
        HrOperationalScopeService hrOperationalScopeService
    ) {
        this.jdbcTemplate = jdbcTemplate;
        this.hrAccessService = hrAccessService;
        this.hrOperationalScopeService = hrOperationalScopeService;
    }

    public void requireControlManagement(AuthSessionUser currentUser) {
        if (!hrAccessService.canAccessManagementTab(currentUser, HrTab.CONTROL)) {
            throw new HrAccessDeniedException("Forbidden");
        }
    }

    public void requireEnrollmentTargetInScope(AuthSessionUser currentUser, long userCompanyId) {
        requireControlManagement(currentUser);
        hrOperationalScopeService.requireUserInScope(currentUser, userCompanyId);
    }

    public void requireEnrollmentSessionInScope(AuthSessionUser currentUser, long enrollmentId) {
        requireControlManagement(currentUser);

        var rows = jdbcTemplate.query(
            """
                SELECT user_company_id
                FROM user_face_enrollments
                WHERE company_id = ?
                  AND id = ?
                LIMIT 1
                """,
            (rs, rowNum) -> rs.getLong("user_company_id"),
            currentUser.companyId(),
            enrollmentId
        );

        if (rows.isEmpty()) {
            throw new NoSuchElementException("Enrollment session not found.");
        }

        hrOperationalScopeService.requireUserInScope(currentUser, rows.getFirst());
    }
}
