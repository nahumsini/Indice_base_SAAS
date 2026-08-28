package com.indice.erp.sales;

import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.auth.SessionAuthService;
import com.indice.erp.auth.SessionCsrfService;
import com.indice.erp.entitlement.RequiresCapability;
import jakarta.servlet.http.HttpSession;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.Optional;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/sales/opportunity-flow")
@RequiresCapability("sales")
public class OpportunityFlowApiController {

    private final SessionAuthService sessionAuthService;
    private final SessionCsrfService sessionCsrfService;
    private final OpportunityFlowAccessService accessService;
    private final OpportunityFlowService flowService;

    public OpportunityFlowApiController(
            SessionAuthService sessionAuthService,
            SessionCsrfService sessionCsrfService,
            OpportunityFlowAccessService accessService,
            OpportunityFlowService flowService) {
        this.sessionAuthService = sessionAuthService;
        this.sessionCsrfService = sessionCsrfService;
        this.accessService = accessService;
        this.flowService = flowService;
    }

    @GetMapping
    public ResponseEntity<?> catalog(HttpSession session) {
        var user = currentUser(session);
        if (user.isEmpty()) {
            return unauthorized();
        }
        return ResponseEntity.ok(flowService.catalog(user.get().companyId(), accessService.canManage(user.get())));
    }

    @GetMapping("/{flowId}/positions")
    public ResponseEntity<?> positions(HttpSession session, @PathVariable long flowId) {
        var user = currentUser(session);
        if (user.isEmpty()) {
            return unauthorized();
        }
        try {
            return ResponseEntity.ok(flowService.positions(user.get().companyId(), flowId));
        } catch (NoSuchElementException ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", ex.getMessage()));
        }
    }

    @PostMapping
    public ResponseEntity<?> create(
            HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @RequestBody(required = false) OpportunityFlowDtos.SaveFlowRequest request) {
        var user = currentUser(session);
        if (user.isEmpty()) {
            return unauthorized();
        }
        try {
            sessionCsrfService.requireCsrf(session, csrfToken);
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", ex.getMessage()));
        }
        if (!accessService.canManage(user.get())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", "Forbidden"));
        }
        try {
            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(flowService.create(user.get().companyId(), user.get().userId(), request));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        }
    }

    @PutMapping("/{flowId}")
    public ResponseEntity<?> update(
            HttpSession session,
            @PathVariable long flowId,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @RequestBody(required = false) OpportunityFlowDtos.SaveFlowRequest request) {
        var user = currentUser(session);
        if (user.isEmpty()) {
            return unauthorized();
        }
        try {
            sessionCsrfService.requireCsrf(session, csrfToken);
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", ex.getMessage()));
        }
        if (!accessService.canManage(user.get())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", "Forbidden"));
        }
        try {
            return ResponseEntity.ok(flowService.update(
                    user.get().companyId(), flowId, user.get().userId(), request));
        } catch (NoSuchElementException ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", ex.getMessage()));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        }
    }

    private Optional<AuthSessionUser> currentUser(HttpSession session) {
        return sessionAuthService.currentUser(session);
    }

    private static ResponseEntity<Map<String, String>> unauthorized() {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
    }
}
