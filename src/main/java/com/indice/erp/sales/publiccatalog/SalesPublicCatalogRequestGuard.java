package com.indice.erp.sales.publiccatalog;

import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.auth.SessionAuthService;
import com.indice.erp.auth.SessionCsrfService;
import jakarta.servlet.http.HttpSession;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;

@Component
public class SalesPublicCatalogRequestGuard {

    private final SessionAuthService auth;
    private final SessionCsrfService csrf;
    private final SalesPublicCatalogAdminAccess adminAccess;

    public SalesPublicCatalogRequestGuard(
            SessionAuthService auth,
            SessionCsrfService csrf,
            SalesPublicCatalogAdminAccess adminAccess) {
        this.auth = auth;
        this.csrf = csrf;
        this.adminAccess = adminAccess;
    }

    public Result read(HttpSession session) {
        return access(session, null, false);
    }

    public Result write(HttpSession session, String csrfToken) {
        return access(session, csrfToken, true);
    }

    private Result access(HttpSession session, String csrfToken, boolean mutation) {
        var user = auth.currentUser(session);
        if (user.isEmpty()) {
            return new Result(null, null, ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(Map.of("message", "Unauthorized")));
        }
        if (mutation) {
            try {
                csrf.requireCsrf(session, csrfToken);
            } catch (IllegalArgumentException failure) {
                return new Result(null, null, ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("message", "Browser validation failed.")));
            }
        }
        try {
            return new Result(user.get(), adminAccess.require(user.get()), null);
        } catch (SecurityException failure) {
            return new Result(user.get(), null, ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(Map.of("message", "Sales catalog administration is unavailable.")));
        }
    }

    public record Result(
            AuthSessionUser user,
            SalesPublicCatalogAdminAccess.AdminContext context,
            ResponseEntity<?> error) {
        public boolean denied() {
            return error != null;
        }
    }
}
