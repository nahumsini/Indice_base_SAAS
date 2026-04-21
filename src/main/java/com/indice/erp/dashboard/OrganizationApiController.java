package com.indice.erp.dashboard;

import com.indice.erp.auth.SessionAuthService;
import jakarta.servlet.http.HttpSession;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1")
public class OrganizationApiController {

    private final SessionAuthService sessionAuthService;
    private final OrganizationService organizationService;

    public OrganizationApiController(
        SessionAuthService sessionAuthService,
        OrganizationService organizationService
    ) {
        this.sessionAuthService = sessionAuthService;
        this.organizationService = organizationService;
    }

    @GetMapping("/modules")
    public ResponseEntity<?> listModules(HttpSession session) {
        var currentUser = sessionAuthService.currentUser(session);
        if (currentUser.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        }

        var user = currentUser.get();
        return ResponseEntity.ok(organizationService.listModules(user.userId(), user.companyId()));
    }

    @GetMapping("/org/units")
    public ResponseEntity<?> listUnits(HttpSession session) {
        var currentUser = sessionAuthService.currentUser(session);
        if (currentUser.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        }

        var units = organizationService.listUnits(currentUser.get().companyId());
        var body = new LinkedHashMap<String, Object>();
        body.put("ok", true);
        body.put("data", units);
        body.put("items", units);
        return ResponseEntity.ok(body);
    }

    @GetMapping("/org/businesses")
    public ResponseEntity<?> listBusinesses(HttpSession session) {
        var currentUser = sessionAuthService.currentUser(session);
        if (currentUser.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        }

        var businesses = organizationService.listBusinesses(currentUser.get().companyId());
        var body = new LinkedHashMap<String, Object>();
        body.put("ok", true);
        body.put("data", businesses);
        body.put("items", businesses);
        return ResponseEntity.ok(body);
    }
}
