package com.indice.erp.kiosk.api;

import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.auth.SessionAuthService;
import com.indice.erp.auth.SessionCsrfService;
import jakarta.servlet.http.HttpSession;
import java.util.Locale;
import java.util.Set;
import org.springframework.stereotype.Component;

@Component
public class KioskInternalRequestGuard {

    private static final Set<String> CENTER_ROLES = Set.of("root", "superadmin");
    private final SessionAuthService sessionAuthService;
    private final SessionCsrfService csrfService;

    public KioskInternalRequestGuard(
            SessionAuthService sessionAuthService,
            SessionCsrfService csrfService) {
        this.sessionAuthService = sessionAuthService;
        this.csrfService = csrfService;
    }

    public AuthSessionUser requireAuthenticated(HttpSession session) {
        return sessionAuthService.currentUser(session)
            .orElseThrow(() -> new KioskInternalAccessException(false));
    }

    public AuthSessionUser requireCenterRead(HttpSession session) {
        var user = requireAuthenticated(session);
        if (!CENTER_ROLES.contains(normalizeRole(user.role()))) {
            throw new KioskInternalAccessException(true);
        }
        return user;
    }

    public AuthSessionUser requireCenterWrite(HttpSession session, String csrfToken) {
        var user = requireCenterRead(session);
        try {
            csrfService.requireCsrf(session, csrfToken);
        } catch (IllegalArgumentException failure) {
            throw new KioskInternalAccessException(true);
        }
        return user;
    }

    public AuthSessionUser requireAuthenticatedWrite(HttpSession session, String csrfToken) {
        var user = requireAuthenticated(session);
        try {
            csrfService.requireCsrf(session, csrfToken);
        } catch (IllegalArgumentException failure) {
            throw new KioskInternalAccessException(true);
        }
        return user;
    }

    private String normalizeRole(String role) {
        var normalized = role == null ? "" : role.trim().toLowerCase(Locale.ROOT);
        return switch (normalized) {
            case "super admin" -> "superadmin";
            case "dueño" -> "dueno";
            default -> normalized;
        };
    }
}
