package com.indice.erp.pos.mercadopago;

import com.indice.erp.entitlement.RequiresCapability;
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
public record MpPaymentQueriesController(PaymentTerminalRequestGuard guard,
        MpIntentReader reader, MpPaymentResult result) {
    @GetMapping("/{id}")
    public ResponseEntity<?> status(@PathVariable long id, HttpSession session) {
        var access = guard.read(session);
        return access.denied() ? access.error() : ResponseEntity.ok(result.read(access.context(), id));
    }

    @GetMapping("/recoverable")
    public ResponseEntity<?> recoverable(HttpSession session,
            @RequestParam(required = false) Long cashRegisterId,
            @RequestParam(required = false) Long shiftId,
            @RequestParam(defaultValue = "25") int limit) {
        var access = guard.read(session);
        if (access.denied()) return access.error();
        return ResponseEntity.ok(new Items(reader.pending(access.context(), cashRegisterId, shiftId, limit)
            .stream().map(result::response).toList()));
    }

    public record Items(java.util.List<MpPaymentResponse> items) {
    }
}
