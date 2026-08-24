package com.indice.erp.billing.subscription;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.indice.erp.auth.BasicModuleCatalog;
import com.indice.erp.auth.ManagedCompanyContextService;
import com.indice.erp.auth.SessionAuthService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.util.Map;
import java.util.Optional;
import org.springframework.boot.autoconfigure.condition.ConditionalOnBean;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

@Component
@ConditionalOnBean(CompanyModuleEntitlementService.class)
public class ModuleEntitlementInterceptor implements HandlerInterceptor {

    private final CompanyModuleEntitlementService entitlementService;
    private final ObjectMapper objectMapper;

    public ModuleEntitlementInterceptor(CompanyModuleEntitlementService entitlementService, ObjectMapper objectMapper) {
        this.entitlementService = entitlementService;
        this.objectMapper = objectMapper;
    }

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws Exception {
        var path = request.getRequestURI();
        var requiredModule = requiredModule(path);
        if (requiredModule.isEmpty()) {
            return true;
        }
        var session = request.getSession(false);
        if (session != null && Boolean.TRUE.equals(session.getAttribute(SessionAuthService.SESSION_PUBLIC_DEMO))) {
            return true;
        }
        var companyId = ManagedCompanyContextService.effectiveCompanyId(session);
        if (companyId == null) {
            return true;
        }
        if (entitlementService.hasActiveEntitlement(companyId, requiredModule.get())) {
            return true;
        }
        response.setStatus(HttpStatus.FORBIDDEN.value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        objectMapper.writeValue(response.getWriter(), Map.of(
            "message", "This company plan does not include the requested module.",
            "code", "module_not_entitled",
            "module", requiredModule.get()
        ));
        return false;
    }

    private Optional<String> requiredModule(String path) {
        if (!path.startsWith("/api/v1/") || isExcluded(path)) {
            return Optional.empty();
        }
        if (path.startsWith("/api/v1/hr/")) {
            return Optional.of("human_resources");
        }
        if (path.startsWith("/api/v1/finance/petty-cash")) {
            return Optional.of("petty_cash");
        }
        if (path.startsWith("/api/v1/finance/")) {
            return Optional.of("expenses");
        }
        if (path.startsWith("/api/v1/pos")) {
            return Optional.of("pos");
        }
        if (path.startsWith("/api/v1/sales")) {
            return Optional.of("crm");
        }
        if (path.startsWith("/api/v1/process-task-kpis")) {
            return Optional.of("kpis");
        }
        if (path.startsWith("/api/v1/processes") || path.startsWith("/api/v1/process-tasks")
            || path.startsWith("/api/v1/projects") || path.startsWith("/api/v1/agenda")) {
            return Optional.of("processes");
        }
        if (path.startsWith("/api/v1/config-center") || path.startsWith("/api/v1/invitations")
            || path.startsWith("/api/v1/dashboard")) {
            return Optional.of(BasicModuleCatalog.CORE_MODULE);
        }
        return Optional.empty();
    }

    private boolean isExcluded(String path) {
        return path.startsWith("/api/v1/auth/")
            || path.startsWith("/api/v1/billing/")
            || path.contains("/public-kiosk");
    }
}
