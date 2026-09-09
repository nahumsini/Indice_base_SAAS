package com.indice.erp.billing.subscription;

import com.indice.erp.auth.ManagedCompanyContextForbiddenException;
import com.indice.erp.auth.ManagedCompanyContextService;
import com.indice.erp.auth.SessionAuthService;
import jakarta.servlet.http.HttpSession;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/billing/subscription/payment-method")
public class BillingPaymentMethodApiController {
    private final SessionAuthService auth;
    private final ManagedCompanyContextService managedCompanies;
    private final BillingPaymentMethodService service;

    public BillingPaymentMethodApiController(SessionAuthService auth, ManagedCompanyContextService managedCompanies,
        BillingPaymentMethodService service) {
        this.auth = auth;
        this.managedCompanies = managedCompanies;
        this.service = service;
    }

    @GetMapping
    public ResponseEntity<?> current(HttpSession session) {
        var actor = auth.currentActor(session);
        if (actor.isEmpty()) return failure(401, "AUTHENTICATION_REQUIRED");
        if (auth.isPublicDemoSession(session)) return failure(403, "BILLING_OWNER_REQUIRED");
        try {
            var context = managedCompanies.resolveBillingContext(actor.get(), session);
            if (context.delegated() || context.readOnly()) return failure(403, "BILLING_OWNER_REQUIRED");
            return ResponseEntity.ok().cacheControl(CacheControl.noStore())
                .body(service.current(context.companyId(), actor.get().userId()));
        } catch (ManagedCompanyContextForbiddenException | BillingAccountAuthorityService.BillingOwnerRequiredException ex) {
            return failure(403, "BILLING_OWNER_REQUIRED");
        }
    }

    private ResponseEntity<ErrorResponse> failure(int status, String code) {
        return ResponseEntity.status(status).cacheControl(CacheControl.noStore()).body(new ErrorResponse(code));
    }

    public record ErrorResponse(String code) {}
}
