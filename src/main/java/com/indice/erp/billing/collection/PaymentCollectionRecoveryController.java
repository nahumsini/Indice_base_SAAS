package com.indice.erp.billing.collection;

import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.auth.SessionAuthService;
import com.indice.erp.auth.SessionCsrfService;
import jakarta.servlet.http.HttpSession;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/v1/billing/payment-request")
public class PaymentCollectionRecoveryController {
    private final SessionAuthService auth;
    private final SessionCsrfService csrf;
    private final PaymentCollectionService service;
    public PaymentCollectionRecoveryController(SessionAuthService auth, SessionCsrfService csrf, PaymentCollectionService service) {
        this.auth = auth; this.csrf = csrf; this.service = service;
    }
    @GetMapping
    public PaymentCollectionContracts.Recovery get(HttpSession session) {
        var user = user(session);
        return service.recovery(user.companyId(), user.userId());
    }
    @PostMapping("/pay")
    public PaymentCollectionPaymentService.PaymentLink pay(HttpSession session,
            @RequestHeader(value = "X-CSRF-Token", required = false) String token,
            @RequestHeader(value = "Idempotency-Key", required = false) String key,
            @RequestBody PaymentCollectionContracts.Pay request) {
        var user = user(session);
        csrf.requireCsrf(session, token);
        return service.pay(user.companyId(), user.userId(), key, request);
    }
    @PostMapping("/refresh")
    public PaymentCollectionContracts.Recovery refresh(HttpSession session,
            @RequestHeader(value = "X-CSRF-Token", required = false) String token) {
        var user = user(session);
        csrf.requireCsrf(session, token);
        return service.refresh(user.companyId(), user.userId());
    }
    private AuthSessionUser user(HttpSession session) {
        return auth.currentUser(session).orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED));
    }
}
