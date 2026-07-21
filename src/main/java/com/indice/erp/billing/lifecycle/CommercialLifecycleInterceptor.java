package com.indice.erp.billing.lifecycle;

import com.indice.erp.auth.SessionAuthService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.boot.autoconfigure.condition.ConditionalOnBean;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

@Component
@ConditionalOnBean(CommercialLifecycleAccessService.class)
public class CommercialLifecycleInterceptor implements HandlerInterceptor {

    private final SessionAuthService auth;
    private final CommercialLifecycleAccessService access;

    public CommercialLifecycleInterceptor(SessionAuthService auth, CommercialLifecycleAccessService access) {
        this.auth = auth;
        this.access = access;
    }

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        if (isRecoverySurface(request.getRequestURI())) return true;
        var session = request.getSession(false);
        if (session == null) return true;
        var user = auth.currentUser(session).orElse(null);
        if (user == null) return true;
        try {
            if (isRead(request.getMethod())) access.requireRead(user.companyId());
            else access.requireWrite(user.companyId());
            return true;
        } catch (CommercialAccessRestrictedException restricted) {
            writeRestricted(response, restricted);
            return false;
        }
    }

    private boolean isRecoverySurface(String path) {
        return path.startsWith("/api/v1/auth")
            || path.startsWith("/api/v1/billing")
            || path.startsWith("/api/v1/account/ownership")
            || path.startsWith("/api/v1/platform-admin")
            || path.equals("/api/v1/health")
            || path.startsWith("/actuator");
    }

    private boolean isRead(String method) {
        return "GET".equalsIgnoreCase(method) || "HEAD".equalsIgnoreCase(method)
            || "OPTIONS".equalsIgnoreCase(method);
    }

    private void writeRestricted(HttpServletResponse response, CommercialAccessRestrictedException failure) {
        response.setStatus(HttpServletResponse.SC_PAYMENT_REQUIRED);
        response.setCharacterEncoding("UTF-8");
        response.setContentType("application/json");
        try {
            response.getWriter().write("{\"error\":\"COMMERCIAL_ACCESS_RESTRICTED\",\"state\":\""
                + failure.state().name() + "\",\"message\":\""
                + (failure.writeOnly()
                    ? "La cuenta está temporalmente en modo de solo lectura."
                    : "La cuenta requiere regularizar su facturación para continuar.")
                + "\",\"recoveryPath\":\"/billing\"}");
        } catch (IOException ignored) {
            // The response has already been classified; no secondary failure is useful here.
        }
    }
}
