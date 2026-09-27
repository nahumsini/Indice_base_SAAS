package com.indice.erp.pos.mercadopago;

import com.indice.erp.entitlement.RequiresCapability;
import com.indice.erp.pos.terminal.PaymentTerminalRequestGuard;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiresCapability("pos")
@RequestMapping("/api/v1/pos/mercado-pago/terminal-payments")
public record MpRefundController(PaymentTerminalRequestGuard guard, MpRefundService refunds) {
    @PostMapping("/{id}/refunds")
    public ResponseEntity<?> refund(@PathVariable long id, HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrf,
            @Valid @RequestBody MpRefundRequest request) {
        var access = guard.adminWrite(session, csrf);
        return access.denied() ? access.error()
            : ResponseEntity.ok(MpRefundResponse.from(refunds.refund(access.context(), id, request)));
    }
}
