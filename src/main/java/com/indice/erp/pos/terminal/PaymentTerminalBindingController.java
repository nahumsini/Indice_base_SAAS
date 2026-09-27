package com.indice.erp.pos.terminal;

import com.indice.erp.pos.cashregister.CashRegisterService;
import com.indice.erp.entitlement.RequiresCapability;
import jakarta.servlet.http.HttpSession;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.http.ResponseEntity;

@RestController
@RequestMapping("/api/v1/pos/payment-terminals")
@RequiresCapability("pos")
public class PaymentTerminalBindingController {
    private final PaymentTerminalRequestGuard guard;
    private final CashRegisterService registers;
    private final TerminalBindingRepository bindings;
    public PaymentTerminalBindingController(PaymentTerminalRequestGuard guard,
            CashRegisterService registers, TerminalBindingRepository bindings) {
        this.guard = guard;
        this.registers = registers;
        this.bindings = bindings;
    }
    @GetMapping("/registers/{registerId}")
    public ResponseEntity<?> binding(@PathVariable long registerId, HttpSession session) {
        var access = guard.read(session);
        if (access.denied()) return access.error();
        var context = access.context();
        registers.requireOperationalRegister(context, registerId);
        return ResponseEntity.ok(bindings.find(context, registerId));
    }
}
