package com.indice.erp.pos.mercadopago;

import com.indice.erp.entitlement.RequiresCapability;
import com.indice.erp.pos.terminal.PaymentTerminalRequestGuard;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiresCapability("pos")
@RequestMapping("/api/v1/pos/mercado-pago/terminal-payments")
public record MpRefundReviewController(PaymentTerminalRequestGuard guard, MpRefundReviewService reviews) {
    @PostMapping("/{intentId}/refunds/{refundId}/recheck")
    public ResponseEntity<?> recheck(@PathVariable long intentId, @PathVariable long refundId,
            HttpSession session, @RequestHeader(name = "X-CSRF-Token", required = false) String csrf,
            @Valid @RequestBody MpRefundReviewRequest request) {
        var access = guard.adminWrite(session, csrf);
        return access.denied() ? access.error() : ResponseEntity.ok(MpRefundResponse.from(
            reviews.recheck(access.context(), intentId, refundId, request)));
    }
}
