package com.indice.erp.auth;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.boot.autoconfigure.condition.ConditionalOnBean;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

@Component
@ConditionalOnBean(SessionAuthService.class)
public class AuthSessionTimeoutInterceptor implements HandlerInterceptor {

    private final SessionAuthService sessionAuthService;

    public AuthSessionTimeoutInterceptor(SessionAuthService sessionAuthService) {
        this.sessionAuthService = sessionAuthService;
    }

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws Exception {
        var session = request.getSession(false);
        if (session == null) {
            return true;
        }
        if (sessionAuthService.enforceSessionTimeout(session, LoginAuditContext.from(request, session))) {
            return true;
        }
        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.getWriter().write("{\"message\":\"Your session expired. Please sign in again.\"}");
        return false;
    }
}
