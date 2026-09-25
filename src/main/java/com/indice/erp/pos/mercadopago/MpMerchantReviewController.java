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
public record MpMerchantReviewController(PaymentTerminalRequestGuard guard,
        MpMerchantReviewService reviews) {
    @PostMapping("/{id}/merchant-review")
    public ResponseEntity<?> review(@PathVariable long id, HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrf,
            @Valid @RequestBody MpMerchantReviewRequest request) {
        var access = guard.adminWrite(session, csrf);
        return access.denied() ? access.error()
            : ResponseEntity.ok(reviews.review(access.context(), id, request));
    }
}
