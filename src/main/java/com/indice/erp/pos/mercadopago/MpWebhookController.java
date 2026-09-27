package com.indice.erp.pos.mercadopago;

import jakarta.servlet.http.HttpServletRequest;
import java.io.IOException;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/pos/mercado-pago/webhook")
public record MpWebhookController(MpWebhookIngress ingress, MpWebhookRateLimit limits) {
    @PostMapping
    public ResponseEntity<?> receive(HttpServletRequest request,
            @RequestParam(name = "data.id", required = false) String id,
            @RequestHeader(name = "x-request-id", required = false) String requestId,
            @RequestHeader(name = "x-signature", required = false) String signature) throws IOException {
        limits.requireAllowed(request.getRemoteAddr());
        ingress.receive(id, requestId, signature, request.getInputStream());
        return ResponseEntity.ok(java.util.Map.of("received", true));
    }
}
