package com.indice.erp.pos.square;

import com.indice.erp.entitlement.RequiresCapability;
import com.indice.erp.pos.terminal.PaymentTerminalRequestGuard;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiresCapability("pos")
@RequestMapping("/api/v1/pos/square/webhooks/dead-letters")
public class SquareWebhookOperationsController {
    private final PaymentTerminalRequestGuard guard; private final SquareWebhookOperations operations;
    public SquareWebhookOperationsController(PaymentTerminalRequestGuard guard,SquareWebhookOperations operations) {
        this.guard=guard; this.operations=operations;
    }
    @GetMapping
    public ResponseEntity<?> list(HttpSession session,@RequestParam(defaultValue="50") int limit) {
        var access=guard.adminRead(session); return access.denied()?access.error():ResponseEntity.ok(
            Map.of("items",operations.deadLetters(access.context(),limit)));
    }
    @PostMapping("/{eventId}/replay")
    public ResponseEntity<?> replay(HttpSession session,@PathVariable long eventId,
            @RequestHeader(name="X-CSRF-Token",required=false) String csrf,
            @Valid @RequestBody SquareWebhookDtos.ReplayRequest request) {
        var access=guard.adminWrite(session,csrf);
        if (access.denied()) return access.error();
        operations.replay(access.context(),eventId,request.reason()); return ResponseEntity.accepted().build();
    }
}
