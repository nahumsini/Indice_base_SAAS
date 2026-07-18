package com.indice.erp.pos;

import com.indice.erp.auth.SessionAuthService;
import com.indice.erp.auth.SessionCsrfService;
import jakarta.servlet.http.HttpSession;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;

@Component
public class PosRequestGuard {

    private final SessionAuthService sessionAuthService;
    private final SessionCsrfService sessionCsrfService;
    private final PosAccessService accessService;

    public PosRequestGuard(
            SessionAuthService sessionAuthService,
            SessionCsrfService sessionCsrfService,
            PosAccessService accessService) {
        this.sessionAuthService = sessionAuthService;
        this.sessionCsrfService = sessionCsrfService;
        this.accessService = accessService;
    }

    public Result requireReadAccess(HttpSession session) {
        return requireAccess(session, null, false);
    }

    public Result requireWriteAccess(HttpSession session, String csrfToken) {
        return requireAccess(session, csrfToken, true);
    }

    public Result requireAdminReadAccess(HttpSession session) {
        return requireAdmin(requireAccess(session, null, false));
    }

    public Result requireAdminWriteAccess(HttpSession session, String csrfToken) {
        return requireAdmin(requireAccess(session, csrfToken, true));
    }

    private Result requireAdmin(Result access) {
        if (access.denied() || access.context() == null) {
            return access;
        }
        return access.context().canManageOtherUsers()
            ? access : Result.error(HttpStatus.FORBIDDEN, "Administrative access is required.");
    }

    private Result requireAccess(HttpSession session, String csrfToken, boolean write) {
        var user = sessionAuthService.currentUser(session);
        if (user.isEmpty()) {
            return Result.error(HttpStatus.UNAUTHORIZED, "Unauthorized");
        }
        var context = accessService.resolveContext(user.get());
        if (context.isEmpty()) {
            return Result.error(HttpStatus.FORBIDDEN, "Forbidden");
        }
        if (write) {
            try {
                sessionCsrfService.requireCsrf(session, csrfToken);
            } catch (IllegalArgumentException ex) {
                return Result.error(HttpStatus.FORBIDDEN, ex.getMessage());
            }
        }
        return Result.ok(context.get());
    }

    public record Result(PosContext context, ResponseEntity<?> error) {
        static Result ok(PosContext context) {
            return new Result(context, null);
        }

        static Result error(HttpStatus status, String message) {
            return new Result(null, ResponseEntity.status(status).body(Map.of("message", message)));
        }

        public boolean denied() {
            return error != null;
        }
    }
}
