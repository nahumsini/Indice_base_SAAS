package com.indice.erp.access.module;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.indice.erp.auth.SessionAuthService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.util.Map;
import org.springframework.boot.autoconfigure.condition.ConditionalOnBean;
import org.springframework.core.annotation.AnnotatedElementUtils;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.method.HandlerMethod;
import org.springframework.web.servlet.HandlerInterceptor;

@Component
@ConditionalOnBean(ModuleAccessService.class)
public class ModuleAccessInterceptor implements HandlerInterceptor {

    private final SessionAuthService sessionAuthService;
    private final ModuleAccessService accessService;
    private final ObjectMapper objectMapper;

    public ModuleAccessInterceptor(
        SessionAuthService sessionAuthService,
        ModuleAccessService accessService,
        ObjectMapper objectMapper
    ) {
        this.sessionAuthService = sessionAuthService;
        this.accessService = accessService;
        this.objectMapper = objectMapper;
    }

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws Exception {
        if (!(handler instanceof HandlerMethod handlerMethod)) {
            return true;
        }
        var requirement = AnnotatedElementUtils.findMergedAnnotation(
            handlerMethod.getMethod(),
            RequiresModuleAccess.class
        );
        if (requirement == null) {
            requirement = AnnotatedElementUtils.findMergedAnnotation(
                handlerMethod.getBeanType(),
                RequiresModuleAccess.class
            );
        }
        if (requirement == null) {
            return true;
        }

        var session = request.getSession(false);
        if (session == null) {
            return true;
        }
        if (sessionAuthService.isPublicDemoSession(session)) {
            return true;
        }
        var currentUser = sessionAuthService.currentUser(session);
        if (currentUser.isEmpty()) {
            return true;
        }
        if (accessService.canAccess(currentUser.get(), requirement.value())) {
            return true;
        }

        response.setStatus(HttpStatus.FORBIDDEN.value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        objectMapper.writeValue(response.getWriter(), Map.of(
            "message", "You do not have access to this module.",
            "code", "module_access_required",
            "module", requirement.value()
        ));
        return false;
    }
}
