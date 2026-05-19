package com.indice.erp.hr.permissions;

import com.indice.erp.auth.SessionCsrfService;
import com.indice.erp.auth.SessionAuthService;
import com.indice.erp.hr.shared.HrPayloadUtils;
import jakarta.servlet.http.HttpSession;
import java.util.List;
import java.util.Set;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

@Service
public class HrPermissionSecurityService {

    private static final Set<String> ADMIN_ROLES = Set.of("root", "superadmin", "admin", "owner", "dueno");
    private static final Set<String> MANAGER_ROLES = Set.of("manager", "approver");
    private static final String HR_MODULE = "human_resources";

    private final SessionAuthService sessionAuthService;
    private final SessionCsrfService sessionCsrfService;
    private final JdbcTemplate jdbcTemplate;

    public HrPermissionSecurityService(
        SessionAuthService sessionAuthService,
        SessionCsrfService sessionCsrfService,
        JdbcTemplate jdbcTemplate
    ) {
        this.sessionAuthService = sessionAuthService;
        this.sessionCsrfService = sessionCsrfService;
        this.jdbcTemplate = jdbcTemplate;
    }

    public PermissionActor requireSelfActor(HttpSession session) {
        return loadActor(session);
    }

    public PermissionActor requireSelfWriteActor(HttpSession session, String csrfToken) {
        var actor = loadActor(session);
        requireCsrf(session, csrfToken);
        return actor;
    }

    public PermissionActor requireManagementActor(HttpSession session) {
        var actor = loadActor(session);
        if (!hasHrModuleAccess(actor)) {
            throw new HrPermissionApiException(HttpStatus.FORBIDDEN, "Forbidden");
        }
        if (ADMIN_ROLES.contains(actor.role()) || MANAGER_ROLES.contains(actor.role())) {
            return actor;
        }
        throw new HrPermissionApiException(HttpStatus.FORBIDDEN, "Forbidden");
    }

    public PermissionActor requireManagementWriteActor(HttpSession session, String csrfToken) {
        var actor = requireManagementActor(session);
        requireCsrf(session, csrfToken);
        return actor;
    }

    private PermissionActor loadActor(HttpSession session) {
        var currentUser = sessionAuthService.currentUser(session)
            .orElseThrow(() -> new HrPermissionApiException(HttpStatus.UNAUTHORIZED, "Unauthorized"));
        var rows = jdbcTemplate.query(
            """
                SELECT uc.id AS user_company_id,
                       COALESCE(NULLIF(u.full_name, ''), u.email, CONCAT('User ', u.id)) AS user_name,
                       COALESCE(uc.role, 'user') AS role
                FROM user_companies uc
                JOIN users u ON u.id = uc.user_id
                WHERE uc.user_id = ?
                  AND uc.company_id = ?
                  AND LOWER(COALESCE(uc.status, 'active')) IN ('active', 'activo')
                LIMIT 1
                """,
            (rs, rowNum) -> new PermissionActor(
                currentUser.userId(),
                currentUser.companyId(),
                rs.getLong("user_company_id"),
                HrPayloadUtils.safe(rs.getString("user_name")),
                normalizeRole(rs.getString("role")),
                List.of()
            ),
            currentUser.userId(),
            currentUser.companyId()
        );
        if (rows.isEmpty()) {
            throw new HrPermissionApiException(HttpStatus.FORBIDDEN, "Forbidden");
        }
        var actor = rows.getFirst();
        return new PermissionActor(
            actor.userId(),
            actor.companyId(),
            actor.userCompanyId(),
            actor.userName(),
            actor.role(),
            listModuleSlugs(actor.userCompanyId())
        );
    }

    private List<String> listModuleSlugs(long userCompanyId) {
        return jdbcTemplate.query(
            "SELECT DISTINCT module_slug FROM user_company_module_roles WHERE user_company_id = ? ORDER BY module_slug ASC",
            (rs, rowNum) -> HrPayloadUtils.safe(rs.getString("module_slug")).toLowerCase(),
            userCompanyId
        );
    }

    private boolean hasHrModuleAccess(PermissionActor actor) {
        return actor.moduleSlugs().contains(HR_MODULE) || (actor.moduleSlugs().isEmpty() && ADMIN_ROLES.contains(actor.role()));
    }

    private void requireCsrf(HttpSession session, String csrfToken) {
        try {
            sessionCsrfService.requireCsrf(session, csrfToken);
        } catch (IllegalArgumentException ex) {
            throw new HrPermissionApiException(HttpStatus.FORBIDDEN, ex.getMessage());
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
