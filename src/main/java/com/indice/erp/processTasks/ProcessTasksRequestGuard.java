package com.indice.erp.processTasks;

import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.auth.SessionAuthService;
import com.indice.erp.auth.SessionCsrfService;
import jakarta.servlet.http.HttpSession;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;

@Component
public class ProcessTasksRequestGuard {

    private final SessionAuthService sessionAuthService;
    private final SessionCsrfService sessionCsrfService;
    private final ProcessTasksAccessService accessService;

    public ProcessTasksRequestGuard(
            SessionAuthService sessionAuthService,
            SessionCsrfService sessionCsrfService,
            ProcessTasksAccessService accessService) {
        this.sessionAuthService = sessionAuthService;
        this.sessionCsrfService = sessionCsrfService;
        this.accessService = accessService;
    }

    public Result requireRead(HttpSession session) {
        return require(session, null, false);
    }

    public Result requireWrite(HttpSession session, String csrfToken) {
        return require(session, csrfToken, true);
    }

    private Result require(HttpSession session, String csrfToken, boolean write) {
        var user = sessionAuthService.currentUser(session);
        if (user.isEmpty()) {
            return Result.error(HttpStatus.UNAUTHORIZED, "Unauthorized");
        }
        if (!accessService.canAccess(user.get())) {
            return Result.error(HttpStatus.FORBIDDEN, "Forbidden");
        }
        if (write) {
            try {
                sessionCsrfService.requireCsrf(session, csrfToken);
            } catch (IllegalArgumentException ex) {
                return Result.error(HttpStatus.FORBIDDEN, ex.getMessage());
            }
        }
        return Result.ok(user.get());
    }

    public record Result(AuthSessionUser user, ResponseEntity<?> error) {
        static Result ok(AuthSessionUser user) {
            return new Result(user, null);
        }

        static Result error(HttpStatus status, String message) {
            return new Result(null, ResponseEntity.status(status).body(Map.of("message", message)));
        }

        public boolean denied() {
            return error != null;
        }
    }
}
