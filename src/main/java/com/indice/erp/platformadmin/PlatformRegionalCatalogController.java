package com.indice.erp.platformadmin;

import com.indice.erp.auth.SessionAuthService;
import com.indice.erp.auth.SessionCsrfService;
import jakarta.servlet.http.HttpSession;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class PlatformRegionalCatalogController {
    private final SessionAuthService auth;
    private final SessionCsrfService csrf;
    private final PlatformRegionalCatalogService catalog;

    public PlatformRegionalCatalogController(SessionAuthService auth, SessionCsrfService csrf, PlatformRegionalCatalogService catalog) {
        this.auth = auth; this.csrf = csrf; this.catalog = catalog;
    }

    @PostMapping("/api/v1/platform-admin/catalog/regional-draft")
    public ResponseEntity<?> prepare(HttpSession session,
        @RequestHeader(name = "X-CSRF-Token", required = false) String token) {
        var actor = auth.currentUser(session).orElse(null);
        if (actor == null) return ResponseEntity.status(401).body(Map.of("code", "AUTHENTICATION_REQUIRED"));
        try { csrf.requireCsrf(session, token); }
        catch (IllegalArgumentException ex) { return ResponseEntity.status(403).body(Map.of("code", "CSRF_REQUIRED")); }
        try { return ResponseEntity.ok(catalog.prepare(actor.userId())); }
        catch (PlatformAdminForbiddenException ex) { return ResponseEntity.status(403).body(Map.of("code", "PLATFORM_ROOT_REQUIRED")); }
        catch (IllegalArgumentException | IllegalStateException ex) { return ResponseEntity.status(409).body(Map.of("code", "REGIONAL_DRAFT_UNAVAILABLE")); }
    }
}
