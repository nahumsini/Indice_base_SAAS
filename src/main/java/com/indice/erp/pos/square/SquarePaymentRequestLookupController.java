package com.indice.erp.pos.square;

import com.indice.erp.entitlement.RequiresCapability;
import com.indice.erp.pos.terminal.PaymentTerminalRequestGuard;
import jakarta.servlet.http.HttpSession;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/pos/square/terminal-payments")
@RequiresCapability("pos")
public class SquarePaymentRequestLookupController {
    private final PaymentTerminalRequestGuard guard;
    private final SquarePaymentRequestLookup lookup;
    public SquarePaymentRequestLookupController(PaymentTerminalRequestGuard guard,
            SquarePaymentRequestLookup lookup) {
        this.guard = guard;
        this.lookup = lookup;
    }
    @GetMapping("/by-request-key")
    public ResponseEntity<?> find(@RequestParam String requestKey, HttpSession session) {
        var access = guard.read(session);
        return access.denied() ? access.error()
            : ResponseEntity.ok(lookup.find(access.context(), requestKey));
    }
}
