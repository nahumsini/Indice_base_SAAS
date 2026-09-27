package com.indice.erp.pos.mercadopago;

import com.indice.erp.pos.terminal.PaymentTerminalRequestGuard;
import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/pos/mercado-pago/terminals")
public class MpTerminalController {
    private final PaymentTerminalRequestGuard guard;
    private final MpTerminalStore store;
    private final MpTerminalSync sync;
    private final MpTerminalConfigure configure;
    private final MpSecrets secrets;

    @GetMapping
    public ResponseEntity<?> list(HttpSession session) {
        var access = guard.adminSetupRead(session);
        if (access.denied()) return access.error();
        secrets.requireEnabled();
        return ResponseEntity.ok(store.list(access.context()).stream().map(MpTerminal::response).toList());
    }
    @PostMapping("/sync")
    public ResponseEntity<?> sync(HttpSession session, @RequestHeader(name="X-CSRF-Token", required=false) String csrf) {
        var access = guard.adminWrite(session, csrf);
        return access.denied() ? access.error() : ResponseEntity.ok(sync.sync(access.context()));
    }
    @PostMapping("/{terminalId}/configure")
    public ResponseEntity<?> configure(@PathVariable long terminalId, HttpSession session,
        @RequestHeader(name="X-CSRF-Token", required=false) String csrf) {
        var access = guard.adminWrite(session, csrf);
        return access.denied() ? access.error() : ResponseEntity.ok(configure.configure(access.context(), terminalId));
    }
}
