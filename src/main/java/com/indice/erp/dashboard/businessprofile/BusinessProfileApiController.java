package com.indice.erp.dashboard.businessprofile;

import com.indice.erp.auth.SessionAuthService;
import com.indice.erp.auth.SessionCsrfService;
import com.indice.erp.configcenter.ConfigCenterAccessService;
import com.indice.erp.configcenter.ConfigCenterAccessService.ConfigCenterTab;
import jakarta.servlet.http.HttpSession;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/dashboard/business-profile")
public class BusinessProfileApiController {

    private final SessionAuthService sessionAuthService;
    private final SessionCsrfService sessionCsrfService;
    private final ConfigCenterAccessService accessService;
    private final BusinessProfileService businessProfileService;

    public BusinessProfileApiController(
        SessionAuthService sessionAuthService,
        SessionCsrfService sessionCsrfService,
        ConfigCenterAccessService accessService,
        BusinessProfileService businessProfileService
    ) {
        this.sessionAuthService = sessionAuthService;
        this.sessionCsrfService = sessionCsrfService;
        this.accessService = accessService;
        this.businessProfileService = businessProfileService;
    }

    @GetMapping
    public ResponseEntity<?> getBusinessProfile(
        HttpSession session,
        @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken
    ) {
        var currentUser = sessionAuthService.currentUser(session);
        if (currentUser.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        }
        if (!accessService.canAccess(currentUser.get(), ConfigCenterTab.BUSINESS_PROFILE)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", "Forbidden"));
        }
        var csrfFailure = requireCsrf(session, csrfToken);
        if (csrfFailure != null) {
            return csrfFailure;
        }

        return ResponseEntity.ok(businessProfileService.getBusinessProfile(currentUser.get().companyId(), currentUser.get().userId()));
    }

    @PostMapping("/restart")
    public ResponseEntity<?> restartBusinessProfile(HttpSession session, @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken) {
        var currentUser = sessionAuthService.currentUser(session);
        if (currentUser.isEmpty()) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        if (!accessService.canAccess(currentUser.get(), ConfigCenterTab.BUSINESS_PROFILE)) return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", "Forbidden"));
        var csrfFailure = requireCsrf(session, csrfToken);
        if (csrfFailure != null) return csrfFailure;
        return ResponseEntity.ok(businessProfileService.restartBusinessProfile(currentUser.get().companyId(), currentUser.get().userId()));
    }

    @PutMapping
    public ResponseEntity<?> saveBusinessProfile(
        HttpSession session,
        @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
        @RequestBody Map<String, Object> payload
    ) {
        var currentUser = sessionAuthService.currentUser(session);
        if (currentUser.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        }
        if (!accessService.canAccess(currentUser.get(), ConfigCenterTab.BUSINESS_PROFILE)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", "Forbidden"));
        }
        var csrfFailure = requireCsrf(session, csrfToken);
        if (csrfFailure != null) {
            return csrfFailure;
        }

        try {
            return ResponseEntity.ok(
                businessProfileService.saveBusinessProfile(
                    currentUser.get().companyId(),
                    currentUser.get().userId(),
                    payload
                )
            );
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        }
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
