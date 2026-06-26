package com.indice.erp.hr.announcements;

import com.indice.erp.auth.SessionAuthService;
import com.indice.erp.auth.SessionCsrfService;
import com.indice.erp.hr.HrAccessService;
import com.indice.erp.hr.HrAccessService.HrTab;
import com.indice.erp.hr.shared.HrPayloadUtils;
import jakarta.servlet.http.HttpSession;
import java.util.List;
import java.util.Set;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

@Service
public class HrAnnouncementSecurityService {

    private static final Set<String> ADMIN_ROLES = Set.of("root", "superadmin", "admin", "owner", "dueno");
    private static final Set<String> MANAGER_ROLES = Set.of("manager", "approver");

    private final SessionAuthService sessionAuthService;
    private final SessionCsrfService sessionCsrfService;
    private final JdbcTemplate jdbcTemplate;
    private final HrAccessService hrAccessService;

    public HrAnnouncementSecurityService(
        SessionAuthService sessionAuthService,
        SessionCsrfService sessionCsrfService,
        JdbcTemplate jdbcTemplate,
        HrAccessService hrAccessService
    ) {
        this.sessionAuthService = sessionAuthService;
        this.sessionCsrfService = sessionCsrfService;
        this.jdbcTemplate = jdbcTemplate;
        this.hrAccessService = hrAccessService;
    }

    public HrAnnouncementActor requireReadActor(HttpSession session) {
        return loadActor(session);
    }

    public HrAnnouncementActor requireReadWriteActor(HttpSession session, String csrfToken) {
        var actor = loadActor(session);
        requireCsrf(session, csrfToken);
        return actor;
    }

    public HrAnnouncementActor requireManagementWriteActor(HttpSession session, String csrfToken) {
        var actor = requireManagementActor(session);
        requireCsrf(session, csrfToken);
        return actor;
    }

    private HrAnnouncementActor requireManagementActor(HttpSession session) {
        var actor = loadActor(session);
        if (!actor.managementAccess()) {
            throw new HrAnnouncementApiException(HttpStatus.FORBIDDEN, "Forbidden");
        }
        return actor;
    }

    private HrAnnouncementActor loadActor(HttpSession session) {
        var currentUser = sessionAuthService.currentUser(session)
            .orElseThrow(() -> new HrAnnouncementApiException(HttpStatus.UNAUTHORIZED, "Unauthorized"));
        var rows = jdbcTemplate.query(
            """
                SELECT uc.id AS user_company_id,
                       COALESCE(NULLIF(u.full_name, ''), u.email, CONCAT('User ', u.id)) AS user_name,
                       COALESCE(uc.role, 'user') AS role,
                       wp.unit_id,
                       wp.business_id,
                       COALESCE(wp.department, '') AS department
                FROM user_companies uc
                JOIN users u ON u.id = uc.user_id
                LEFT JOIN user_work_profiles wp
                  ON wp.user_company_id = uc.id
                 AND wp.company_id = uc.company_id
                 AND LOWER(COALESCE(wp.status, 'active')) IN ('active', 'activo')
                WHERE uc.user_id = ?
                  AND uc.company_id = ?
                  AND LOWER(COALESCE(uc.status, 'active')) IN ('active', 'activo')
                ORDER BY CASE WHEN wp.id IS NULL THEN 1 ELSE 0 END, wp.id DESC
                LIMIT 1
                """,
            (rs, rowNum) -> new HrAnnouncementActor(
                currentUser.userId(),
                currentUser.companyId(),
                rs.getLong("user_company_id"),
                HrPayloadUtils.safe(rs.getString("user_name")),
                normalizeRole(rs.getString("role")),
                (Long) rs.getObject("unit_id"),
                (Long) rs.getObject("business_id"),
                HrPayloadUtils.safe(rs.getString("department")),
                List.of(),
                false
            ),
            currentUser.userId(),
            currentUser.companyId()
        );
        if (rows.isEmpty()) {
            throw new HrAnnouncementApiException(HttpStatus.FORBIDDEN, "Forbidden");
        }
        return withAccess(rows.getFirst());
    }

    private HrAnnouncementActor withAccess(HrAnnouncementActor actor) {
        var moduleSlugs = listModuleSlugs(actor.userCompanyId());
        var withModules = new HrAnnouncementActor(
            actor.userId(),
            actor.companyId(),
            actor.userCompanyId(),
            actor.userName(),
            actor.role(),
            actor.unitId(),
            actor.businessId(),
            actor.department(),
            moduleSlugs,
            false
        );
        return withModules.withManagementAccess(canManage(withModules));
    }

    private List<String> listModuleSlugs(long userCompanyId) {
        return jdbcTemplate.query(
            "SELECT DISTINCT module_slug FROM user_company_module_roles WHERE user_company_id = ? ORDER BY module_slug ASC",
            (rs, rowNum) -> HrPayloadUtils.safe(rs.getString("module_slug")).toLowerCase(),
            userCompanyId
        );
    }

    private boolean canManage(HrAnnouncementActor actor) {
        return (ADMIN_ROLES.contains(actor.role()) || MANAGER_ROLES.contains(actor.role()))
            && hrAccessService.canAccessManagementTab(actor.userCompanyId(), actor.role(), HrTab.ANNOUNCEMENTS);
    }

    private void requireCsrf(HttpSession session, String csrfToken) {
        try {
            sessionCsrfService.requireCsrf(session, csrfToken);
        } catch (IllegalArgumentException ex) {
            throw new HrAnnouncementApiException(HttpStatus.FORBIDDEN, ex.getMessage());
        }
    }

    private String normalizeRole(String rawRole) {
        var normalized = HrPayloadUtils.safe(rawRole).trim().toLowerCase();
        return switch (normalized) {
            case "super admin", "superadmin", "root" -> "superadmin";
            case "owner", "dueno" -> "owner";
            default -> normalized.isBlank() ? "user" : normalized;
        };
    }
}
