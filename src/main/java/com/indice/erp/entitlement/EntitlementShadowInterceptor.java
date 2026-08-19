package com.indice.erp.entitlement;

import com.indice.erp.auth.SessionAuthService;
import com.indice.erp.tenant.TenantContextResolver;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
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
    private final ObjectProvider<EntitlementDecisionAuditService> auditService;
    private final ObjectProvider<CapabilityRouteClassifier> routeClassifier;
    private final boolean shadowEnabled;
    private final boolean enforcementEnabled;

    public EntitlementShadowInterceptor(
        ObjectProvider<SessionAuthService> sessionAuthService,
        ObjectProvider<TenantContextResolver> tenantContextResolver,
        ObjectProvider<CapabilityShadowDecisionService> decisionService,
        ObjectProvider<EntitlementDecisionAuditService> auditService,
        ObjectProvider<CapabilityRouteClassifier> routeClassifier,
        @Value("${app.entitlements.shadow-enabled:true}") boolean shadowEnabled,
        @Value("${app.entitlements.enforcement-enabled:false}") boolean enforcementEnabled
    ) {
        this.sessionAuthService = sessionAuthService;
        this.tenantContextResolver = tenantContextResolver;
        this.decisionService = decisionService;
        this.auditService = auditService;
        this.routeClassifier = routeClassifier;
        this.shadowEnabled = shadowEnabled;
        this.enforcementEnabled = enforcementEnabled;
    }

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        if ((!shadowEnabled && !enforcementEnabled) || !(handler instanceof HandlerMethod handlerMethod)) {
            return true;
        }
        var requirement = findRequirement(handlerMethod, request.getRequestURI());
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
        if (authService.isPublicDemoSession(httpSession)) {
            return true;
        }
        var session = authService.currentSession(httpSession);
        if (session.isEmpty()) {
            return true;
        }
        var tenant = contextResolver.resolve(session.get());
        var operation = resolveOperation(requirement.operation(), request.getMethod());
        CapabilityShadowDecision decision;
        try {
            decision = shadowDecisionService.evaluate(
                tenant,
                session.get(),
                requirement.capability(),
                operation
            );
        } catch (RuntimeException exception) {
            // Phase 4 is deliberately fail-open: a catalog, projection, or telemetry
            // incident must not interrupt the permission model that already protects
            // production traffic.
            LOGGER.error(
                "entitlement_shadow_evaluation_failed companyId={} userId={} capability={} method={} path={}",
                tenant.company_id(),
                tenant.user_id(),
                requirement.capability(),
                request.getMethod(),
                request.getRequestURI(),
                exception
            );
            return true;
        }
        var enforceDecision = enforcementEnabled
            && decision.policy_mode() == EntitlementPolicyMode.ENFORCE
            && !decision.shadow_allowed();
        var entitlementAudit = auditService.getIfAvailable();
        if (entitlementAudit != null) {
            try {
                entitlementAudit.record(tenant, decision, request, enforceDecision);
            } catch (RuntimeException exception) {
                LOGGER.error(
                    "entitlement_shadow_audit_failed companyId={} userId={} capability={} method={} path={}",
                    tenant.company_id(),
                    tenant.user_id(),
                    decision.capability(),
                    request.getMethod(),
                    request.getRequestURI(),
                    exception
                );
            }
        }
        LOGGER.info(
            "entitlement_shadow companyId={} userId={} scope={} policyMode={} capability={} operation={} legacyAllowed={} companyAllowed={} shadowAllowed={} matched={} enforced={} source={} method={} path={}",
            tenant.company_id(),
            tenant.user_id(),
            tenant.scope().type(),
            decision.policy_mode(),
            decision.capability(),
            decision.operation(),
            decision.legacy_allowed(),
            decision.company_allowed(),
            decision.shadow_allowed(),
            decision.matched(),
            enforceDecision,
            decision.source(),
            request.getMethod(),
            request.getRequestURI()
        );
        if (!enforceDecision) {
            return true;
        }
        writeDenied(response);
        return false;
    }

    private CapabilityRequirement findRequirement(HandlerMethod handlerMethod, String requestPath) {
        var methodRequirement = AnnotatedElementUtils.findMergedAnnotation(
            handlerMethod.getMethod(),
            RequiresCapability.class
        );
        if (methodRequirement != null) {
            return new CapabilityRequirement(methodRequirement.value(), methodRequirement.operation());
        }
        var typeRequirement = AnnotatedElementUtils.findMergedAnnotation(
            handlerMethod.getBeanType(),
            RequiresCapability.class
        );
        if (typeRequirement != null) {
            return new CapabilityRequirement(typeRequirement.value(), typeRequirement.operation());
        }
        var classifier = routeClassifier.getIfAvailable();
        if (classifier == null) {
            return null;
        }
        return classifier.classify(requestPath)
            .map(capability -> new CapabilityRequirement(capability, CapabilityOperation.AUTO))
            .orElse(null);
    }

    private CapabilityOperation resolveOperation(CapabilityOperation configured, String method) {
        if (configured != CapabilityOperation.AUTO) {
            return configured;
        }
        return "GET".equalsIgnoreCase(method) || "HEAD".equalsIgnoreCase(method)
            ? CapabilityOperation.READ
            : CapabilityOperation.WRITE;
    }

    private void writeDenied(HttpServletResponse response) {
        response.setStatus(HttpServletResponse.SC_FORBIDDEN);
        response.setCharacterEncoding("UTF-8");
        response.setContentType("application/json");
        try {
            response.getWriter().write(
                "{\"error\":\"CAPABILITY_NOT_ENTITLED\",\"message\":\"This capability is not enabled for the active company.\"}"
            );
        } catch (IOException exception) {
            LOGGER.warn("entitlement_denial_response_failed", exception);
        }
    }

    private record CapabilityRequirement(String capability, CapabilityOperation operation) {
    }
}
