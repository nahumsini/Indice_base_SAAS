package com.indice.erp.pos.checkout;

import com.indice.erp.entitlement.RequiresCapability;
import com.indice.erp.pos.PosRequestGuard;
import com.indice.erp.pos.checkout.dto.PosCheckoutRequest;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/pos/sales")
@RequiresCapability("pos")
public class CheckoutController {

    private final PosRequestGuard guard;
    private final CheckoutExecutionService service;

    public CheckoutController(PosRequestGuard guard, CheckoutExecutionService service) {
        this.guard = guard;
        this.service = service;
    }

    @PostMapping("/checkout")
    public ResponseEntity<?> checkout(
            HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @RequestHeader(name = "Idempotency-Key", required = false) String requestKey,
            @Valid @RequestBody PosCheckoutRequest request) {
        var access = guard.requireWriteAccess(session, csrfToken);
        if (access.denied()) {
            return access.error();
        }
        return ResponseEntity.status(HttpStatus.CREATED).body(service.execute(access.context(), requestKey, request));
    }

    @GetMapping("/checkout/{requestKey}")
    public ResponseEntity<?> recover(HttpSession session, @PathVariable String requestKey) {
        var access = guard.requireReadAccess(session);
        return access.denied() ? access.error() : ResponseEntity.ok(service.recover(access.context(), requestKey));
    }
}
