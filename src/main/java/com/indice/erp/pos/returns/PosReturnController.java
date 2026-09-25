package com.indice.erp.pos.returns;

import com.indice.erp.entitlement.RequiresCapability;
import com.indice.erp.pos.terminal.PaymentTerminalRequestGuard;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiresCapability("pos")
@RequestMapping("/api/v1/pos/returns")
public record PosReturnController(PaymentTerminalRequestGuard guard, PosReturnService service,
        PosReturnReviewService reviews) {
    @GetMapping("/{reference}")
    public ResponseEntity<?> find(@PathVariable String reference, HttpSession session) {
        var access = guard.adminRead(session);
        return access.denied() ? access.error() : ResponseEntity.ok(service.find(access.context(), reference));
    }

    @PostMapping("/{reference}/refunds")
    public ResponseEntity<?> refund(@PathVariable String reference, HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrf,
            @Valid @RequestBody PosReturnRefundRequest request) {
        var access = guard.adminWrite(session, csrf);
        return access.denied() ? access.error()
            : ResponseEntity.ok(service.refund(access.context(), reference, request));
    }

    @PostMapping("/{reference}/refresh")
    public ResponseEntity<?> refresh(@PathVariable String reference, HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrf) {
        var access = guard.adminWrite(session, csrf);
        return access.denied() ? access.error()
            : ResponseEntity.ok(service.refresh(access.context(), reference));
    }

    @PostMapping("/{reference}/refunds/recheck")
    public ResponseEntity<?> recheck(@PathVariable String reference, HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrf,
            @Valid @RequestBody PosReturnReviewRequest request) {
        var access = guard.adminWrite(session, csrf);
        return access.denied() ? access.error()
            : ResponseEntity.ok(reviews.recheck(access.context(), reference, request));
    }
}
