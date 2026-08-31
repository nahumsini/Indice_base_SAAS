package com.indice.erp.billing.subscription;

import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.auth.ManagedCompanyContextForbiddenException;
import com.indice.erp.auth.ManagedCompanyContextService;
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
    private final ManagedCompanyContextService managedCompanies;
    private final BillingAccountAuthorityService billingAuthority;

    public BillingSubscriptionApiController(
        SessionAuthService sessionAuthService,
        SessionCsrfService csrfService,
        BillingSubscriptionManagementService subscriptionService,
        BillingProductSelectionService selectionService,
        BillingActivationService activationService,
        BillingInvoiceHistoryService invoiceHistoryService,
        ManagedCompanyContextService managedCompanies,
        BillingAccountAuthorityService billingAuthority
    ) {
        this.sessionAuthService = sessionAuthService;
        this.csrfService = csrfService;
        this.subscriptionService = subscriptionService;
        this.selectionService = selectionService;
        this.activationService = activationService;
        this.invoiceHistoryService = invoiceHistoryService;
        this.managedCompanies = managedCompanies;
        this.billingAuthority = billingAuthority;
    }

    @GetMapping("/selection")
    public ResponseEntity<?> selection(HttpSession session) {
        var user = sessionAuthService.currentActor(session);
        if (user.isEmpty()) return unauthorized();
        try {
            var context = managedCompanies.resolveBillingContext(user.get(), session);
            return ResponseEntity.ok(selectionService.current(context.companyId(), user.get().userId()));
        } catch (ManagedCompanyContextForbiddenException ex) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(message(ex.getMessage()));
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
        return readWithCsrf(session, csrfToken, context -> selectionService.preview(context.companyId(), request));
    }

    @PutMapping("/selection")
    public ResponseEntity<?> updateSelection(
        HttpSession session,
        @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
        @RequestHeader(name = "Idempotency-Key", required = false) String idempotencyKey,
        @RequestBody BillingSelectionRequest request
    ) {
        return manage(session, csrfToken, context -> selectionService.update(
            context.billing().companyId(),
            context.actor().userId(),
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
        return manage(session, csrfToken, context -> {
            billingAuthority.requireOwner(context.billing().companyId(), context.actor().userId());
            return activationService.createCheckout(
                context.billing().companyId(), context.actor().userId(), idempotencyKey, request
            );
        });
    }

    @GetMapping
    public ResponseEntity<?> current(HttpSession session) {
        var user = sessionAuthService.currentActor(session);
        if (user.isEmpty()) {
            return unauthorized();
        }
        try {
            var context = managedCompanies.resolveBillingContext(user.get(), session);
            return subscriptionService.current(context.companyId())
                .<ResponseEntity<?>>map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND).body(message("Subscription not found.")));
        } catch (ManagedCompanyContextForbiddenException ex) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(message(ex.getMessage()));
        }
    }

    @GetMapping("/invoices")
    public ResponseEntity<?> invoices(HttpSession session) {
        var user = sessionAuthService.currentActor(session);
        if (user.isEmpty()) {
            return unauthorized();
        }
        try {
            var context = managedCompanies.resolveBillingContext(user.get(), session);
            if (!context.delegated() && !canManage(user.get())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(message("Invoice history requires an owner or admin."));
            }
            return ResponseEntity.ok(invoiceHistoryService.current(context.companyId()));
        } catch (ManagedCompanyContextForbiddenException ex) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(message(ex.getMessage()));
        }
    }

    @PostMapping("/cancel")
    public ResponseEntity<?> cancel(
        HttpSession session,
        @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken
    ) {
        return manage(session, csrfToken, context -> subscriptionService.cancel(context.billing().companyId()));
    }

    @PostMapping("/resume")
    public ResponseEntity<?> resume(
        HttpSession session,
        @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken
    ) {
        return manage(session, csrfToken, context -> subscriptionService.resume(context.billing().companyId()));
    }

    @PostMapping("/portal")
    public ResponseEntity<?> portal(
        HttpSession session,
        @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken
    ) {
        return manage(session, csrfToken, context -> {
            billingAuthority.requireOwner(context.billing().companyId(), context.actor().userId());
            return subscriptionService.portal(context.billing().companyId());
        });
    }

    private ResponseEntity<?> manage(HttpSession session, String csrfToken, Action action) {
        var user = sessionAuthService.currentActor(session);
        if (user.isEmpty()) {
            return unauthorized();
        }
        final ManagedCompanyContextService.BillingContext billing;
        try {
            billing = managedCompanies.resolveBillingContext(user.get(), session);
        } catch (ManagedCompanyContextForbiddenException ex) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(message(ex.getMessage()));
        }
        if (billing.readOnly()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(message("Delegated billing access is read-only."));
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
            return ResponseEntity.ok(action.run(new BillingActorContext(user.get(), billing)));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(message(ex.getMessage()));
        } catch (BillingAccountAuthorityService.BillingOwnerRequiredException ex) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(message(ex.getMessage()));
        } catch (IllegalStateException ex) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(message(ex.getMessage()));
        }
    }

    private ResponseEntity<?> readWithCsrf(HttpSession session, String csrfToken, ReadAction action) {
        var user = sessionAuthService.currentActor(session);
        if (user.isEmpty()) return unauthorized();
        try {
            csrfService.requireCsrf(session, csrfToken);
            var billing = managedCompanies.resolveBillingContext(user.get(), session);
            return ResponseEntity.ok(action.run(billing));
        } catch (ManagedCompanyContextForbiddenException ex) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(message(ex.getMessage()));
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
        Object run(BillingActorContext context);
    }

    private interface ReadAction {
        Object run(ManagedCompanyContextService.BillingContext context);
    }

    private record BillingActorContext(
        AuthSessionUser actor,
        ManagedCompanyContextService.BillingContext billing
    ) {
    }
}
