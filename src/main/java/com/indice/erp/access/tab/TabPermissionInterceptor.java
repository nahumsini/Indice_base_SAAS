package com.indice.erp.access.tab;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.indice.erp.auth.SessionAuthService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.util.Map;
import org.springframework.boot.autoconfigure.condition.ConditionalOnBean;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

@Component
@ConditionalOnBean({TabPermissionRouteClassifier.class, TabPermissionAccessService.class})
public class TabPermissionInterceptor implements HandlerInterceptor {

    private final SessionAuthService sessionAuthService;
    private final TabPermissionRouteClassifier routeClassifier;
    private final TabPermissionAccessService accessService;
    private final ObjectMapper objectMapper;

    public TabPermissionInterceptor(
        SessionAuthService sessionAuthService,
        TabPermissionRouteClassifier routeClassifier,
        TabPermissionAccessService accessService,
        ObjectMapper objectMapper
    ) {
        this.sessionAuthService = sessionAuthService;
        this.routeClassifier = routeClassifier;
        this.accessService = accessService;
        this.objectMapper = objectMapper;
    }

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws Exception {
        var requirement = routeClassifier.classify(request);
        if (requirement.isEmpty()) {
            return true;
        }

        var session = request.getSession(false);
        if (session == null) {
            return true;
        }
        var currentUser = sessionAuthService.currentUser(session);
        if (currentUser.isEmpty()) {
            return true;
        }
        if (accessService.canAccess(currentUser.get(), requirement.get())) {
            return true;
        }

        response.setStatus(HttpStatus.FORBIDDEN.value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        objectMapper.writeValue(response.getWriter(), Map.of(
            "message", "You do not have access to this module tab.",
            "code", "tab_permission_required",
            "required_permissions", requirement.get().anyOf()
        ));
        return false;
    }
}
