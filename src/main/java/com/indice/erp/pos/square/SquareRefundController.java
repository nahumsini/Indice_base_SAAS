package com.indice.erp.pos.square;

import com.indice.erp.entitlement.RequiresCapability;
import com.indice.erp.pos.terminal.PaymentTerminalRequestGuard;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiresCapability("pos")
@RequestMapping("/api/v1/pos/square/terminal-payments")
public record SquareRefundController(PaymentTerminalRequestGuard guard,
        SquareRefundService refunds, SquareRefundReviewService reviews) {
    @PostMapping("/{intentId}/refunds")
    public ResponseEntity<?> refund(@PathVariable long intentId, HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrf,
            @Valid @RequestBody SquareRefundRequest request) {
        var access = guard.adminWrite(session, csrf);
        return access.denied() ? access.error() : ResponseEntity.ok(SquareRefundResponse.from(
            refunds.refund(access.context(), intentId, request)));
    }
    @PostMapping("/{intentId}/refunds/{refundId}/recheck")
    public ResponseEntity<?> recheck(@PathVariable long intentId, @PathVariable long refundId,
            HttpSession session, @RequestHeader(name = "X-CSRF-Token", required = false) String csrf,
            @Valid @RequestBody SquareRefundReviewRequest request) {
        var access = guard.adminWrite(session, csrf);
        return access.denied() ? access.error() : ResponseEntity.ok(SquareRefundResponse.from(
            reviews.recheck(access.context(), intentId, refundId, request)));
    }
}
