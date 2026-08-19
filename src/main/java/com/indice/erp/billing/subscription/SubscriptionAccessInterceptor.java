package com.indice.erp.billing.subscription;

import com.indice.erp.auth.SessionAuthService;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.util.Map;
import org.springframework.boot.autoconfigure.condition.ConditionalOnBean;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

@Component
@ConditionalOnBean(CompanySubscriptionStatusProvider.class)
public class SubscriptionAccessInterceptor implements HandlerInterceptor {

    private final CompanySubscriptionStatusProvider subscriptionStatusProvider;
    private final ObjectMapper objectMapper;

    public SubscriptionAccessInterceptor(
        CompanySubscriptionStatusProvider subscriptionStatusProvider,
        ObjectMapper objectMapper
    ) {
        this.subscriptionStatusProvider = subscriptionStatusProvider;
        this.objectMapper = objectMapper;
    }

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws Exception {
        var path = request.getRequestURI();
        if (!path.startsWith("/api/v1/") || isExcluded(path)) {
            return true;
        }
        var session = request.getSession(false);
        if (session != null && Boolean.TRUE.equals(session.getAttribute(SessionAuthService.SESSION_PUBLIC_DEMO))) {
            return true;
        }
        var companyId = session == null
            ? null
            : session.getAttribute(SessionAuthService.SESSION_COMPANY_ID);
        if (!(companyId instanceof Number companyIdNumber)) {
            return true;
        }
        var status = subscriptionStatusProvider.currentStatus(companyIdNumber.longValue());
        if (status.accessAllowed()) {
            return true;
        }
        response.setStatus(HttpStatus.PAYMENT_REQUIRED.value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        objectMapper.writeValue(response.getWriter(), Map.of(
            "message", "Company subscription is required to access this module.",
            "code", "subscription_required",
            "subscription", Map.of(
                "status", status.status(),
                "access_allowed", false,
                "lock_reason", status.lockReason()
            )
        ));
        return false;
    }

    private boolean isExcluded(String path) {
        return path.startsWith("/api/v1/auth/")
            || path.startsWith("/api/v1/billing/")
            || path.startsWith("/api/v1/distributor-portal/")
            || path.contains("/public-kiosk");
    }
}
