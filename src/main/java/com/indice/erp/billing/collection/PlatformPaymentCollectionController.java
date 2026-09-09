package com.indice.erp.billing.collection;

import com.indice.erp.auth.SessionAuthService;
import com.indice.erp.auth.SessionCsrfService;
import jakarta.servlet.http.HttpSession;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/v1/platform-admin/companies/{companyId}/payment-request")
public class PlatformPaymentCollectionController {
    private final SessionAuthService auth;
    private final SessionCsrfService csrf;
    private final PaymentCollectionService service;
    public PlatformPaymentCollectionController(SessionAuthService auth, SessionCsrfService csrf, PaymentCollectionService service) {
        this.auth = auth; this.csrf = csrf; this.service = service;
    }
    @GetMapping
    public PaymentCollectionContracts.Workspace get(HttpSession session, @PathVariable long companyId) {
        return service.workspace(companyId, actor(session));
    }
    @PostMapping
    public PaymentCollectionContracts.Workspace start(HttpSession session, @PathVariable long companyId,
            @RequestHeader(value = "X-CSRF-Token", required = false) String csrfToken,
            @RequestHeader(value = "Idempotency-Key", required = false) String key,
            @RequestBody PaymentCollectionContracts.Start request) {
        var actor = actor(session);
        csrf.requireCsrf(session, csrfToken);
        return service.start(companyId, actor, key, request);
    }
    @PostMapping("/extend")
    public PaymentCollectionContracts.Workspace extend(HttpSession session, @PathVariable long companyId,
            @RequestHeader(value = "X-CSRF-Token", required = false) String csrfToken,
            @RequestHeader(value = "Idempotency-Key", required = false) String key,
            @RequestBody PaymentCollectionContracts.Extend request) {
        var actor = actor(session);
        csrf.requireCsrf(session, csrfToken);
        return service.extend(companyId, actor, key, request);
    }
    private long actor(HttpSession session) {
        return auth.currentActor(session).orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED)).userId();
    }
}
