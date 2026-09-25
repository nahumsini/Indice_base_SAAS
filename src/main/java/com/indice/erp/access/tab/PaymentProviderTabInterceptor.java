package com.indice.erp.access.tab;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.indice.erp.auth.SessionAuthService;
import jakarta.servlet.http.*;
import java.util.Map;
import org.springframework.boot.autoconfigure.condition.ConditionalOnBean;
import org.springframework.http.*;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerMapping;
import org.springframework.web.servlet.HandlerInterceptor;
import org.springframework.web.util.UrlPathHelper;

@Component
@ConditionalOnBean({SessionAuthService.class, TabPermissionAccessService.class})
class PaymentProviderTabInterceptor implements HandlerInterceptor {
    private final SessionAuthService auth; private final TabPermissionAccessService access;
    private final PaymentProviderTabPolicy policy; private final ObjectMapper mapper;
    PaymentProviderTabInterceptor(SessionAuthService auth, TabPermissionAccessService access,
            PaymentProviderTabPolicy policy, ObjectMapper mapper) {
        this.auth = auth; this.access = access; this.policy = policy; this.mapper = mapper;
    }
    @Override public boolean preHandle(HttpServletRequest request, HttpServletResponse response,
            Object handler) throws Exception {
        var matched = request.getAttribute(HandlerMapping.BEST_MATCHING_PATTERN_ATTRIBUTE);
        var path = matched instanceof String value ? value
            : UrlPathHelper.defaultInstance.getLookupPathForRequest(request);
        var requirement = policy.classify(request.getMethod(), path);
        if (requirement.isEmpty()) return true;
        var session = request.getSession(false);
        var user = session == null ? null : auth.currentUser(session).orElse(null);
        if (user == null || access.canAccess(user, requirement.orElseThrow())) return true;
        response.setStatus(HttpStatus.FORBIDDEN.value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        mapper.writeValue(response.getWriter(), Map.of("message",
            "You do not have access to this payment operation.", "code",
            "tab_permission_required", "required_permissions", requirement.orElseThrow().anyOf()));
        return false;
    }
}
