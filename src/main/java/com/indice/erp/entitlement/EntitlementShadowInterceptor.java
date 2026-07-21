package com.indice.erp.entitlement;

import com.indice.erp.auth.SessionAuthService;
import com.indice.erp.tenant.TenantContextResolver;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.annotation.AnnotatedElementUtils;
import org.springframework.stereotype.Component;
import org.springframework.web.method.HandlerMethod;
import org.springframework.web.servlet.HandlerInterceptor;

@Component
public class EntitlementShadowInterceptor implements HandlerInterceptor {

    private static final Logger LOGGER = LoggerFactory.getLogger(EntitlementShadowInterceptor.class);

    private final ObjectProvider<SessionAuthService> sessionAuthService;
    private final ObjectProvider<TenantContextResolver> tenantContextResolver;
    private final ObjectProvider<CapabilityShadowDecisionService> decisionService;
    private final boolean shadowEnabled;

    public EntitlementShadowInterceptor(
        ObjectProvider<SessionAuthService> sessionAuthService,
        ObjectProvider<TenantContextResolver> tenantContextResolver,
        ObjectProvider<CapabilityShadowDecisionService> decisionService,
        @Value("${app.entitlements.shadow-enabled:true}") boolean shadowEnabled
    ) {
        this.sessionAuthService = sessionAuthService;
        this.tenantContextResolver = tenantContextResolver;
        this.decisionService = decisionService;
        this.shadowEnabled = shadowEnabled;
    }

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        if (!shadowEnabled || !(handler instanceof HandlerMethod handlerMethod)) {
            return true;
        }
        var requirement = findRequirement(handlerMethod);
        if (requirement == null) {
            return true;
        }

        var httpSession = request.getSession(false);
        if (httpSession == null) {
            return true;
        }
        var authService = sessionAuthService.getIfAvailable();
        var contextResolver = tenantContextResolver.getIfAvailable();
        var shadowDecisionService = decisionService.getIfAvailable();
        if (authService == null || contextResolver == null || shadowDecisionService == null) {
            return true;
        }
        var session = authService.currentSession(httpSession);
        if (session.isEmpty()) {
            return true;
        }
        var tenant = contextResolver.resolve(session.get());
        var operation = resolveOperation(requirement.operation(), request.getMethod());
        var decision = shadowDecisionService.evaluate(tenant, session.get(), requirement.value(), operation);
        LOGGER.info(
            "entitlement_shadow companyId={} userId={} scope={} capability={} operation={} legacyAllowed={} shadowAllowed={} matched={} method={} path={}",
            tenant.company_id(),
            tenant.user_id(),
            tenant.scope().type(),
            decision.capability(),
            decision.operation(),
            decision.legacy_allowed(),
            decision.shadow_allowed(),
            decision.matched(),
            request.getMethod(),
            request.getRequestURI()
        );
        return true;
    }

    private RequiresCapability findRequirement(HandlerMethod handlerMethod) {
        var methodRequirement = AnnotatedElementUtils.findMergedAnnotation(
            handlerMethod.getMethod(),
            RequiresCapability.class
        );
        return methodRequirement != null
            ? methodRequirement
            : AnnotatedElementUtils.findMergedAnnotation(handlerMethod.getBeanType(), RequiresCapability.class);
    }

    private CapabilityOperation resolveOperation(CapabilityOperation configured, String method) {
        if (configured != CapabilityOperation.AUTO) {
            return configured;
        }
        return "GET".equalsIgnoreCase(method) || "HEAD".equalsIgnoreCase(method)
            ? CapabilityOperation.READ
            : CapabilityOperation.WRITE;
    }
}
