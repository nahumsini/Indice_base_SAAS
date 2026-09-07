package com.indice.erp.platformadmin;

import com.indice.erp.auth.SessionAuthService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnBean;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

@Component
@ConditionalOnBean({SessionAuthService.class, PlatformAuditService.class})
public class PlatformAdminFailureAuditInterceptor implements HandlerInterceptor {

    private static final Logger log = LoggerFactory.getLogger(PlatformAdminFailureAuditInterceptor.class);
    private static final String ACTOR_ATTRIBUTE = PlatformAdminFailureAuditInterceptor.class.getName() + ".actor";

    private final PlatformAuditService auditService;

    public PlatformAdminFailureAuditInterceptor(PlatformAuditService auditService) {
        this.auditService = auditService;
    }

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        var session = request.getSession(false);
        if (session != null) {
            var rawUserId = session.getAttribute(SessionAuthService.SESSION_USER_ID);
            if (rawUserId instanceof Number userId) {
                request.setAttribute(ACTOR_ATTRIBUTE, userId.longValue());
            }
        }
        return true;
    }

    @Override
    public void afterCompletion(
        HttpServletRequest request,
        HttpServletResponse response,
        Object handler,
        Exception exception
    ) {
        if (response.getStatus() < 400) {
            return;
        }
        var actor = request.getAttribute(ACTOR_ATTRIBUTE);
        if (!(actor instanceof Long actorUserId)) {
            return;
        }
        var path = request.getRequestURI();
        if (path.length() > 160) {
            path = path.substring(0, 160);
        }
        try {
            auditService.record(
                actorUserId,
                "PLATFORM_HTTP_REQUEST_REJECTED",
                "API_ROUTE",
                path,
                null,
                "FAILURE",
                Map.of(
                    "method", request.getMethod(),
                    "status", response.getStatus(),
                    "exception", exception == null ? "" : exception.getClass().getSimpleName()
                )
            );
        } catch (RuntimeException auditFailure) {
            log.error("Could not record rejected platform administration request", auditFailure);
        }
    }
}
