package com.indice.erp.dashboard;

import com.indice.erp.auth.SessionAuthService;
import com.indice.erp.auth.SessionCsrfService;
import com.indice.erp.entitlement.RequiresCapability;
import jakarta.servlet.http.HttpSession;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1")
public class OrganizationApiController {

    private final SessionAuthService sessionAuthService;
    private final SessionCsrfService sessionCsrfService;
    private final OrganizationService organizationService;

    public OrganizationApiController(
        SessionAuthService sessionAuthService,
        SessionCsrfService sessionCsrfService,
        OrganizationService organizationService
    ) {
        this.sessionAuthService = sessionAuthService;
        this.sessionCsrfService = sessionCsrfService;
        this.organizationService = organizationService;
    }

    @GetMapping("/modules")
    @RequiresCapability("dashboard")
    public ResponseEntity<?> listModules(
        HttpSession session,
        @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken
    ) {
        var currentUser = sessionAuthService.currentUser(session);
        if (currentUser.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        }
        var csrfFailure = requireCsrf(session, csrfToken);
        if (csrfFailure != null) {
            return csrfFailure;
        }

        var user = currentUser.get();
        if (sessionAuthService.isPublicDemoSession(session)) {
            return ResponseEntity.ok(organizationService.listPublicDemoModules(user.userId()));
        }
        return ResponseEntity.ok(organizationService.listModules(user.userId(), user.companyId(), user.role()));
    }

    @GetMapping("/org/units")
    @RequiresCapability("config_center")
    public ResponseEntity<?> listUnits(
        HttpSession session,
        @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken
    ) {
        var currentUser = sessionAuthService.currentUser(session);
        if (currentUser.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        }
        var csrfFailure = requireCsrf(session, csrfToken);
        if (csrfFailure != null) {
            return csrfFailure;
        }

        var units = organizationService.listUnits(currentUser.get());
        var body = new LinkedHashMap<String, Object>();
        body.put("ok", true);
        body.put("data", units);
        body.put("items", units);
        return ResponseEntity.ok(body);
    }

    @GetMapping("/org/businesses")
    @RequiresCapability("config_center")
    public ResponseEntity<?> listBusinesses(
        HttpSession session,
        @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken
    ) {
        var currentUser = sessionAuthService.currentUser(session);
        if (currentUser.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        }
        var csrfFailure = requireCsrf(session, csrfToken);
        if (csrfFailure != null) {
            return csrfFailure;
        }

        var businesses = organizationService.listBusinesses(currentUser.get());
        var body = new LinkedHashMap<String, Object>();
        body.put("ok", true);
        body.put("data", businesses);
        body.put("items", businesses);
        return ResponseEntity.ok(body);
    }

    private ResponseEntity<?> requireCsrf(HttpSession session, String csrfToken) {
        try {
            sessionCsrfService.requireCsrf(session, csrfToken);
            return null;
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", ex.getMessage()));
        }
    }
}
