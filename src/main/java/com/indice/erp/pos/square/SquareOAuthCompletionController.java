package com.indice.erp.pos.square;

import com.indice.erp.entitlement.RequiresCapability;
import com.indice.erp.pos.terminal.PaymentTerminalRequestGuard;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequiresCapability("pos")
public class SquareOAuthCompletionController {
    private final PaymentTerminalRequestGuard guard;
    private final SquareOAuthCompletion oauth;

    @PostMapping("/api/v1/pos/square/oauth/complete")
    public ResponseEntity<?> complete(HttpSession session,
        @RequestHeader(name="X-CSRF-Token", required=false) String csrf,
        @Valid @RequestBody SquareOAuthComplete request) {
        var access = guard.adminWrite(session, csrf);
        return access.denied() ? access.error() : ResponseEntity.ok(oauth.complete(access.context(), request));
    }
}
