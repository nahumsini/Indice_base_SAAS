package com.indice.erp.pos.mercadopago;

import com.indice.erp.pos.terminal.PaymentTerminalRequestGuard;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/pos/mercado-pago")
public class MpConnectionController {
    private final PaymentTerminalRequestGuard guard;
    private final MpSetupStatus status;
    private final MpOAuthService oauth;

    @GetMapping("/status")
    public ResponseEntity<?> status(HttpSession session) {
        var access = guard.setupRead(session);
        return access.denied() ? access.error() : ResponseEntity.ok(status.get(access.context()));
    }
    @PostMapping("/oauth/start")
    public ResponseEntity<?> start(HttpSession session, @RequestHeader(name="X-CSRF-Token", required=false) String csrf) {
        var access = guard.adminWrite(session, csrf);
        return access.denied() ? access.error() : ResponseEntity.ok(oauth.start(access.context()));
    }
    @PostMapping("/oauth/complete")
    public ResponseEntity<?> complete(HttpSession session, @RequestHeader(name="X-CSRF-Token", required=false) String csrf,
        @Valid @RequestBody MpSetupDtos.OAuthComplete request) {
        var access = guard.adminWrite(session, csrf);
        if (access.denied()) return access.error();
        oauth.complete(access.context(), request);
        return ResponseEntity.ok(status.get(access.context()));
    }
}
