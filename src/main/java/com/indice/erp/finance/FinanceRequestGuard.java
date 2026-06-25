package com.indice.erp.finance;

import com.indice.erp.auth.SessionAuthService;
import com.indice.erp.auth.SessionCsrfService;
import com.indice.erp.finance.shared.FinanceContext;
import jakarta.servlet.http.HttpSession;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;

@Component
public class FinanceRequestGuard {

    private final SessionAuthService sessionAuthService;
    private final SessionCsrfService sessionCsrfService;
    private final FinanceAccessService accessService;

    public FinanceRequestGuard(
            SessionAuthService sessionAuthService,
            SessionCsrfService sessionCsrfService,
            FinanceAccessService accessService) {
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

    public record Result(FinanceContext context, ResponseEntity<?> error) {
        static Result ok(FinanceContext context) {
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
