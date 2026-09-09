package com.indice.erp.platformadmin;

import com.indice.erp.auth.SessionAuthService;
import com.indice.erp.auth.LocalDevelopmentAuthPolicy;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.boot.autoconfigure.condition.ConditionalOnBean;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

@Component
@ConditionalOnBean({SessionAuthService.class, PlatformAdminAccessService.class})
public class PlatformAdminMfaInterceptor implements HandlerInterceptor {

    private final SessionAuthService sessionAuthService;
    private final PlatformAdminAccessService accessService;
    private final LocalDevelopmentAuthPolicy localDevelopmentAuthPolicy;

    public PlatformAdminMfaInterceptor(
        SessionAuthService sessionAuthService,
        PlatformAdminAccessService accessService,
        LocalDevelopmentAuthPolicy localDevelopmentAuthPolicy
    ) {
        this.sessionAuthService = sessionAuthService;
        this.accessService = accessService;
        this.localDevelopmentAuthPolicy = localDevelopmentAuthPolicy;
    }

    @Override
    public boolean preHandle(
        HttpServletRequest request,
        HttpServletResponse response,
        Object handler
    ) throws Exception {
        var session = request.getSession(false);
        if (session == null) {
            return true;
        }
        var rawUserId = session.getAttribute(SessionAuthService.SESSION_USER_ID);
        if (!(rawUserId instanceof Number userId)) {
            return true;
        }
        var access = accessService.find(userId.longValue());
        if (access == null || (!access.mfaRequired() && !"PLATFORM_ROOT".equals(access.role()))) {
            return true;
        }
        if (sessionAuthService.isMfaVerified(session) || localDevelopmentAuthPolicy.isMfaBypassed()) {
            return true;
        }

        session.invalidate();
        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setHeader("Cache-Control", "no-store");
        response.getWriter().write(
            "{\"code\":\"PLATFORM_REAUTHENTICATION_REQUIRED\","
                + "\"message\":\"Sign in again and complete multi-factor authentication to administer the platform.\"}"
        );
        return false;
    }
}
