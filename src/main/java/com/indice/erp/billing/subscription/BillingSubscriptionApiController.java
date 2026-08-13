package com.indice.erp.billing.subscription;

import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.auth.SessionAuthService;
import com.indice.erp.auth.SessionCsrfService;
import jakarta.servlet.http.HttpSession;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/billing/subscription")
public class BillingSubscriptionApiController {

    private final SessionAuthService sessionAuthService;
    private final SessionCsrfService csrfService;
    private final BillingSubscriptionManagementService subscriptionService;
    private final BillingProductSelectionService selectionService;
    private final BillingActivationService activationService;
    private final BillingInvoiceHistoryService invoiceHistoryService;

    public BillingSubscriptionApiController(
        SessionAuthService sessionAuthService,
        SessionCsrfService csrfService,
        BillingSubscriptionManagementService subscriptionService,
        BillingProductSelectionService selectionService,
        BillingActivationService activationService,
        BillingInvoiceHistoryService invoiceHistoryService
    ) {
        this.sessionAuthService = sessionAuthService;
        this.csrfService = csrfService;
        this.subscriptionService = subscriptionService;
        this.selectionService = selectionService;
        this.activationService = activationService;
        this.invoiceHistoryService = invoiceHistoryService;
    }

    @GetMapping("/selection")
    public ResponseEntity<?> selection(HttpSession session) {
        var user = sessionAuthService.currentUser(session);
        if (user.isEmpty()) return unauthorized();
        try {
            return ResponseEntity.ok(selectionService.current(user.get().companyId()));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(message(ex.getMessage()));
        } catch (IllegalStateException ex) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(message(ex.getMessage()));
        }
    }

    @PostMapping("/selection/preview")
    public ResponseEntity<?> previewSelection(
        HttpSession session,
        @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
        @RequestBody BillingSelectionRequest request
    ) {
        return manage(session, csrfToken, user -> selectionService.preview(user.companyId(), request));
    }

    @PutMapping("/selection")
    public ResponseEntity<?> updateSelection(
        HttpSession session,
        @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
        @RequestHeader(name = "Idempotency-Key", required = false) String idempotencyKey,
        @RequestBody BillingSelectionRequest request
    ) {
        return manage(session, csrfToken, user -> selectionService.update(
            user.companyId(),
            user.userId(),
            idempotencyKey,
            request
        ));
    }

    @PostMapping("/activate")
    public ResponseEntity<?> activate(
        HttpSession session,
        @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
        @RequestHeader(name = "Idempotency-Key", required = false) String idempotencyKey,
        @RequestBody BillingSelectionRequest request
    ) {
        return manage(session, csrfToken, user -> activationService.createCheckout(
            user.companyId(), user.userId(), idempotencyKey, request
        ));
    }

    @GetMapping
    public ResponseEntity<?> current(HttpSession session) {
        var user = sessionAuthService.currentUser(session);
        if (user.isEmpty()) {
            return unauthorized();
        }
        return subscriptionService.current(user.get().companyId())
            .<ResponseEntity<?>>map(ResponseEntity::ok)
            .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND).body(message("Subscription not found.")));
    }

    @GetMapping("/invoices")
    public ResponseEntity<?> invoices(HttpSession session) {
        var user = sessionAuthService.currentUser(session);
        if (user.isEmpty()) {
            return unauthorized();
        }
        if (!canManage(user.get())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(message("Invoice history requires an owner or admin."));
        }
        return ResponseEntity.ok(invoiceHistoryService.current(user.get().companyId()));
    }

    @PostMapping("/cancel")
    public ResponseEntity<?> cancel(
        HttpSession session,
        @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken
    ) {
        return manage(session, csrfToken, (user) -> subscriptionService.cancel(user.companyId()));
    }

    @PostMapping("/resume")
    public ResponseEntity<?> resume(
        HttpSession session,
        @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken
    ) {
        return manage(session, csrfToken, (user) -> subscriptionService.resume(user.companyId()));
    }

    @PostMapping("/portal")
    public ResponseEntity<?> portal(
        HttpSession session,
        @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken
    ) {
        return manage(session, csrfToken, (user) -> subscriptionService.portal(user.companyId()));
    }

    private ResponseEntity<?> manage(HttpSession session, String csrfToken, Action action) {
        var user = sessionAuthService.currentUser(session);
        if (user.isEmpty()) {
            return unauthorized();
        }
        if (!canManage(user.get())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(message("Billing management requires an owner or admin."));
        }
        try {
            csrfService.requireCsrf(session, csrfToken);
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(message(ex.getMessage()));
        }
        try {
            return ResponseEntity.ok(action.run(user.get()));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(message(ex.getMessage()));
        } catch (IllegalStateException ex) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(message(ex.getMessage()));
        }
    }

    private boolean canManage(AuthSessionUser user) {
        return switch (user.role() == null ? "" : user.role()) {
            case "root", "superadmin", "owner", "dueno", "admin" -> true;
            default -> false;
        };
    }

    private ResponseEntity<?> unauthorized() {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(message("Authentication is required."));
    }

    private Map<String, String> message(String message) {
        return Map.of("message", message);
    }

    private interface Action {
        Object run(AuthSessionUser user);
    }
}
