package com.indice.erp.auth;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.util.List;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

@Component
public class PublicDemoSessionInterceptor implements HandlerInterceptor {

    private static final List<String> BLOCKED_PREFIXES = List.of(
        "/api/v1/platform-admin",
        "/api/v1/distributor-portal",
        "/api/v1/config-center",
        "/api/v1/invitations",
        "/api/v1/account/ownership",
        "/api/v1/billing",
        "/api/v1/platform"
    );

    private final SessionAuthService auth;

    public PublicDemoSessionInterceptor(SessionAuthService auth) {
        this.auth = auth;
    }

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws Exception {
        var session = request.getSession(false);
        if (session == null || !auth.isPublicDemoSession(session)) {
            return true;
        }
        var path = request.getRequestURI();
        if (BLOCKED_PREFIXES.stream().noneMatch(path::startsWith)
            && !path.equals("/api/v1/auth/company")) {
            return true;
        }
        response.setStatus(HttpServletResponse.SC_FORBIDDEN);
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.getWriter().write("{\"message\":\"Esta acción no está disponible en el modo demo público.\"}");
        return false;
    }
}
