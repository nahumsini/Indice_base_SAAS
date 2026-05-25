package com.indice.erp.dashboard.businessprofile;

import com.indice.erp.auth.SessionAuthService;
import com.indice.erp.configcenter.ConfigCenterAccessService;
import com.indice.erp.configcenter.ConfigCenterAccessService.ConfigCenterTab;
import jakarta.servlet.http.HttpSession;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/dashboard/business-profile")
public class BusinessProfileApiController {

    private final SessionAuthService sessionAuthService;
    private final ConfigCenterAccessService accessService;
    private final BusinessProfileService businessProfileService;

    public BusinessProfileApiController(
        SessionAuthService sessionAuthService,
        ConfigCenterAccessService accessService,
        BusinessProfileService businessProfileService
    ) {
        this.sessionAuthService = sessionAuthService;
        this.accessService = accessService;
        this.businessProfileService = businessProfileService;
    }

    @GetMapping
    public ResponseEntity<?> getBusinessProfile(HttpSession session) {
        var currentUser = sessionAuthService.currentUser(session);
        if (currentUser.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        }
        if (!accessService.canAccess(currentUser.get(), ConfigCenterTab.BUSINESS_PROFILE)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", "Forbidden"));
        }

        return ResponseEntity.ok(businessProfileService.getBusinessProfile(currentUser.get().companyId()));
    }

    @PutMapping
    public ResponseEntity<?> saveBusinessProfile(HttpSession session, @RequestBody Map<String, Object> payload) {
        var currentUser = sessionAuthService.currentUser(session);
        if (currentUser.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        }
        if (!accessService.canAccess(currentUser.get(), ConfigCenterTab.BUSINESS_PROFILE)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", "Forbidden"));
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
}
