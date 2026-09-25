package com.indice.erp.pos.mercadopago;

import com.indice.erp.entitlement.RequiresCapability;
import com.indice.erp.pos.PosApiException;
import com.indice.erp.pos.terminal.PaymentTerminalRequestGuard;
import jakarta.servlet.http.HttpSession;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiresCapability("pos")
@RequestMapping("/api/v1/pos/mercado-pago/terminal-payments")
public record MpPaymentRequestQueryController(PaymentTerminalRequestGuard guard,
        MpIntentReader reader, MpPaymentResult result, MpPaymentAdmissionReader admissions) {
    @GetMapping("/by-request/{key}")
    public ResponseEntity<?> find(@PathVariable String key, @RequestParam long cashRegisterId,
            HttpSession session) {
        var access = guard.read(session);
        if (access.denied()) return access.error();
        var intent = reader.byKey(access.context(), key)
            .filter(value -> value.cashRegisterId() == cashRegisterId).orElse(null);
        if (intent == null) {
            var rejected = admissions.rejected(access.context(), key, cashRegisterId).orElse(null);
            if (rejected != null) throw rejected.rejection();
            throw PosApiException.notFound("Payment attempt was not found.");
        }
        return ResponseEntity.ok(result.response(intent));
    }
}
