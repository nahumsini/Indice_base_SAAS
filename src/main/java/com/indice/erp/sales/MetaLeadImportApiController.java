package com.indice.erp.sales;

import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.auth.SessionAuthService;
import com.indice.erp.auth.SessionCsrfService;
import com.indice.erp.entitlement.RequiresCapability;
import jakarta.servlet.http.HttpSession;
import java.util.Map;
import java.util.Optional;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/sales/meta-leads")
@RequiresCapability("sales")
public class MetaLeadImportApiController {

    private final SessionAuthService sessionAuthService;
    private final SessionCsrfService sessionCsrfService;
    private final MetaLeadImportService importService;

    public MetaLeadImportApiController(
            SessionAuthService sessionAuthService,
            SessionCsrfService sessionCsrfService,
            MetaLeadImportService importService) {
        this.sessionAuthService = sessionAuthService;
        this.sessionCsrfService = sessionCsrfService;
        this.importService = importService;
    }

    @PostMapping("/import")
    public ResponseEntity<?> importLeads(
            HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @RequestBody(required = false) MetaLeadImportDtos.ImportRequest request) {
        var user = currentUser(session);
        if (user.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("code", "UNAUTHORIZED", "message", "Unauthorized"));
        }
        try {
            sessionCsrfService.requireCsrf(session, csrfToken);
        } catch (IllegalArgumentException exception) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("code", "INVALID_CSRF", "message", exception.getMessage()));
        }

        try {
            return ResponseEntity.ok(importService.importLeads(user.get(), request));
        } catch (MetaLeadIntegrationException exception) {
            return ResponseEntity.status(exception.status())
                    .body(Map.of("code", exception.code(), "message", exception.getMessage()));
        } catch (IllegalArgumentException exception) {
            return ResponseEntity.badRequest()
                    .body(Map.of("code", "INVALID_REQUEST", "message", exception.getMessage()));
        }
    }

    private Optional<AuthSessionUser> currentUser(HttpSession session) {
        return sessionAuthService.currentUser(session);
    }
}
