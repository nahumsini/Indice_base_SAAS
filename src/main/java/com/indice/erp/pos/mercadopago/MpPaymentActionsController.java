package com.indice.erp.pos.mercadopago;

import com.indice.erp.entitlement.RequiresCapability;
import com.indice.erp.pos.terminal.PaymentTerminalRequestGuard;
import jakarta.servlet.http.HttpSession;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiresCapability("pos")
@RequestMapping("/api/v1/pos/mercado-pago/terminal-payments")
public record MpPaymentActionsController(PaymentTerminalRequestGuard guard, MpPaymentService payments) {
    @PostMapping("/{id}/recover")
    public ResponseEntity<?> recover(@PathVariable long id, HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrf) {
        var access = guard.write(session, csrf);
        return access.denied() ? access.error()
            : ResponseEntity.ok(payments.recover(access.context(), id));
    }

    @PostMapping("/{id}/cancel")
    public ResponseEntity<?> cancel(@PathVariable long id, HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrf) {
        var access = guard.write(session, csrf);
        return access.denied() ? access.error()
            : ResponseEntity.ok(payments.cancel(access.context(), id));
    }
}
