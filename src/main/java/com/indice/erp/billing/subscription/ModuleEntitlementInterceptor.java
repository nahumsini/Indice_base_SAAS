package com.indice.erp.billing.subscription;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.indice.erp.auth.BasicModuleCatalog;
import com.indice.erp.auth.ManagedCompanyContextService;
import com.indice.erp.auth.SessionAuthService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.util.LinkedHashMap;
import java.util.List;
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
        var requirement = requiredModules(request.getMethod(), path);
        if (requirement.isEmpty()) {
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
        if (requirement.get().candidates().stream()
            .anyMatch(module -> entitlementService.hasActiveEntitlement(companyId, module))) {
            return true;
        }
        response.setStatus(HttpStatus.FORBIDDEN.value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        var body = new LinkedHashMap<String, Object>();
        body.put("message", "This company plan does not include the requested module.");
        body.put("code", "module_not_entitled");
        body.put("module", requirement.get().primary());
        if (requirement.get().candidates().size() > 1) {
            body.put("modules", requirement.get().candidates());
        }
        objectMapper.writeValue(response.getWriter(), body);
        return false;
    }

    private Optional<ModuleRequirement> requiredModules(String method, String path) {
        if (!path.startsWith("/api/v1/") || isExcluded(path)) {
            return Optional.empty();
        }
        if (path.startsWith("/api/v1/hr/")) {
            return one("human_resources");
        }
        if (path.startsWith("/api/v1/finance/petty-cash")) {
            return one("petty_cash");
        }
        if (path.startsWith("/api/v1/finance/")) {
            return one("expenses");
        }
        if (path.startsWith("/api/v1/pos")) {
            return one("pos");
        }
        if (isGet(method) && isSalesProductReadPath(path)) {
            return any("inventory", "crm");
        }
        if (isGet(method) && isPathOrDescendant(path, "/api/v1/sales/inventory-warehouses")) {
            return any("inventory", "crm");
        }
        if (isSalesInventoryPath(path)) {
            return one("inventory");
        }
        if (path.startsWith("/api/v1/sales")) {
            return one("crm");
        }
        if (path.startsWith("/api/v1/process-task-kpis")) {
            return one("kpis");
        }
        if (path.startsWith("/api/v1/processes") || path.startsWith("/api/v1/process-tasks")
            || path.startsWith("/api/v1/projects") || path.startsWith("/api/v1/agenda")) {
            return one("processes");
        }
        if (path.startsWith("/api/v1/config-center") || path.startsWith("/api/v1/invitations")
            || path.startsWith("/api/v1/dashboard")) {
            return one(BasicModuleCatalog.CORE_MODULE);
        }
        return Optional.empty();
    }

    private Optional<ModuleRequirement> one(String module) {
        return Optional.of(new ModuleRequirement(List.of(module)));
    }

    private Optional<ModuleRequirement> any(String... modules) {
        return Optional.of(new ModuleRequirement(List.of(modules)));
    }

    private boolean isGet(String method) {
        return "GET".equalsIgnoreCase(method);
    }

    private boolean isSalesProductReadPath(String path) {
        var collectionPath = "/api/v1/sales/products";
        if (path.equals(collectionPath)) {
            return true;
        }
        var itemPrefix = collectionPath + "/";
        if (!path.startsWith(itemPrefix)) {
            return false;
        }
        var itemId = path.substring(itemPrefix.length());
        return !itemId.isBlank()
            && itemId.indexOf('/') < 0
            && itemId.chars().allMatch(Character::isDigit);
    }

    private boolean isSalesInventoryPath(String path) {
        return isPathOrDescendant(path, "/api/v1/sales/products")
            || isPathOrDescendant(path, "/api/v1/sales/public-catalogs")
            || isPathOrDescendant(path, "/api/v1/sales/inventory-operations")
            || isPathOrDescendant(path, "/api/v1/sales/inventory-warehouses")
            || isPathOrDescendant(path, "/api/v1/sales/inventory-balances")
            || isPathOrDescendant(path, "/api/v1/sales/inventory-movements");
    }

    private boolean isPathOrDescendant(String path, String prefix) {
        return path.equals(prefix) || path.startsWith(prefix + "/");
    }

    private boolean isExcluded(String path) {
        return path.startsWith("/api/v1/auth/")
            || path.startsWith("/api/v1/billing/")
            || path.contains("/public-kiosk");
    }

    private record ModuleRequirement(List<String> candidates) {

        private ModuleRequirement {
            candidates = List.copyOf(candidates);
            if (candidates.isEmpty()) {
                throw new IllegalArgumentException("At least one module candidate is required.");
            }
        }

        private String primary() {
            return candidates.getFirst();
        }
    }
}
