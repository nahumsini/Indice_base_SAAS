package com.indice.erp.pos.square;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/pos/square")
public class SquarePublicController {

    private final SquareSetupService setup;
    private final SquareWebhookIngressService webhooks;

    public SquarePublicController(SquareSetupService setup, SquareWebhookIngressService webhooks) {
        this.setup = setup;
        this.webhooks = webhooks;
    }

    @GetMapping("/oauth/callback")
    public ResponseEntity<?> oauthCallback(
            @RequestParam(name = "code", required = false) String code,
            @RequestParam(name = "state", required = false) String state) {
        return ResponseEntity.ok(setup.completeOAuth(code, state));
    }

    @PostMapping("/webhook")
    public ResponseEntity<?> webhook(
            @RequestBody String rawPayload,
            @RequestHeader(name = "x-square-hmacsha256-signature", required = false) String signature,
            @RequestHeader(name = "Square-Environment", required = false) String environment) {
        return ResponseEntity.ok(webhooks.receive(rawPayload, signature, environment));
    }
}
