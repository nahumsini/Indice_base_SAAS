package com.indice.erp.distributorportal;

import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.auth.SessionAuthService;
import jakarta.servlet.http.HttpSession;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/distributor-portal")
public class DistributorPortalApiController {

    private final SessionAuthService auth;
    private final DistributorPortalService service;

    public DistributorPortalApiController(SessionAuthService auth, DistributorPortalService service) {
        this.auth = auth;
        this.service = service;
    }

    @GetMapping("/context")
    public ResponseEntity<?> context(HttpSession session) {
        return withUser(session, service::context);
    }

    @GetMapping("/contracts-access")
    public ResponseEntity<?> contractsAccess(
        HttpSession session,
        @RequestParam(name = "q", defaultValue = "") String query,
        @RequestParam(name = "stage", defaultValue = "ALL") String stage
    ) {
        return withUser(session, actor -> service.portfolio(actor, query, stage));
    }

    private ResponseEntity<?> withUser(HttpSession session, UserAction action) {
        var actor = auth.currentUser(session).orElse(null);
        if (actor == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        }
        try {
            return ResponseEntity.ok(action.apply(actor));
        } catch (DistributorPortalForbiddenException exception) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", exception.getMessage()));
        }
    }

    @FunctionalInterface
    private interface UserAction {
        Object apply(AuthSessionUser actor);
    }
}
