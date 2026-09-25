package com.indice.erp.pos.mercadopago;

import com.indice.erp.entitlement.RequiresCapability;
import com.indice.erp.pos.terminal.PaymentTerminalRequestGuard;
import jakarta.servlet.http.HttpSession;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiresCapability("pos")
@RequestMapping("/api/v1/pos/mercado-pago/terminal-payments/by-request")
public record MpPaymentRequestClosureController(PaymentTerminalRequestGuard guard,
        MpPaymentRequestClosure closure, MpPaymentResult result) {
    @PostMapping("/{key}/close")
    public ResponseEntity<?> close(@PathVariable String key, @RequestParam long cashRegisterId,
            HttpSession session, @RequestHeader(name="X-CSRF-Token", required=false) String csrf) {
        var access = guard.write(session, csrf);
        if (access.denied()) return access.error();
        var outcome = closure.close(access.context(), key, cashRegisterId);
        return ResponseEntity.ok(outcome.intent() == null ? outcome.rejection() : result.response(outcome.intent()));
    }
}
