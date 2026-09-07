package com.indice.erp.auth;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.indice.erp.platformadmin.PlatformAuditService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.util.Map;
import java.util.Set;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

/** Blocks client mutations while a Root or distributor consultation is active. */
@Component
public class ManagedCompanyReadOnlyInterceptor implements HandlerInterceptor {

    private static final Set<String> READ_METHODS = Set.of("GET", "HEAD", "OPTIONS");
    private static final Set<String> READ_QUERY_PATHS = Set.of(
        "/api/v1/kpis/monetary-aggregate/query",
        "/api/v1/kpis/monetary-aggregate/batch",
        "/api/v1/sales/commission-summary"
    );

    private final ObjectMapper objectMapper;
    private final ObjectProvider<PlatformAuditService> auditProvider;

    public ManagedCompanyReadOnlyInterceptor(
        ObjectMapper objectMapper,
        ObjectProvider<PlatformAuditService> auditProvider
    ) {
        this.objectMapper = objectMapper;
        this.auditProvider = auditProvider;
    }

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws Exception {
        var session = request.getSession(false);
        if (session == null || ManagedCompanyContextService.effectiveCompanyId(session) == null
            || session.getAttribute(ManagedCompanyContextService.SESSION_MANAGED_COMPANY_ID) == null) {
            return true;
        }
        var method = request.getMethod().toUpperCase();
        var path = request.getRequestURI();
        if (READ_METHODS.contains(method) || isConsultationControl(method, path)) {
            return true;
        }

        recordBlockedWrite(session, method, path);
        response.setStatus(HttpStatus.FORBIDDEN.value());
        response.setCharacterEncoding("UTF-8");
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        objectMapper.writeValue(response.getWriter(), Map.of(
            "message", "La consulta del cliente es de solo lectura.",
            "code", "managed_company_read_only"
        ));
        return false;
    }

    private boolean isConsultationControl(String method, String path) {
        // These owner contracts accept filters by POST and never mutate business state.
        if ("POST".equals(method) && READ_QUERY_PATHS.contains(path)) {
            return true;
        }
        if ("/api/v1/auth/managed-company".equals(path)) {
            return "POST".equals(method) || "DELETE".equals(method);
        }
        if ("/api/v1/auth/logout".equals(path) && "POST".equals(method)) {
            return true;
        }
        return "/api/v1/billing/subscription/selection/preview".equals(path) && "POST".equals(method);
    }

    private void recordBlockedWrite(jakarta.servlet.http.HttpSession session, String method, String path) {
        var userId = session.getAttribute(SessionAuthService.SESSION_USER_ID);
        var companyId = session.getAttribute(ManagedCompanyContextService.SESSION_MANAGED_COMPANY_ID);
        if (!(userId instanceof Number userNumber) || !(companyId instanceof Number companyNumber)) {
            return;
        }
        var audit = auditProvider.getIfAvailable();
        if (audit == null) return;
        try {
            audit.record(
                userNumber.longValue(),
                "DELEGATED_COMPANY_WRITE_BLOCKED",
                "COMPANY",
                Long.toString(companyNumber.longValue()),
                companyNumber.longValue(),
                "DENIED",
                Map.of("method", method, "path", path)
            );
        } catch (RuntimeException ignored) {
            // The security denial must remain effective even if audit persistence is unavailable.
        }
    }
}
