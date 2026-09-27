package com.indice.erp.pos.mercadopago;

import com.indice.erp.entitlement.RequiresCapability;
import com.indice.erp.pos.terminal.PaymentTerminalRequestGuard;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiresCapability("pos")
@RequestMapping("/api/v1/pos/mercado-pago/terminal-payments")
public record MpPaymentCreationController(PaymentTerminalRequestGuard guard, MpPaymentService payments) {
    @PostMapping
    public ResponseEntity<?> create(HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrf,
            @Valid @RequestBody MpCreatePayment request) {
        var access = guard.write(session, csrf);
        return access.denied() ? access.error()
            : ResponseEntity.ok(payments.create(access.context(), request));
    }
}
