package com.indice.erp.pos.square;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/pos/square")
public class SquarePublicController {

    private final SquareWebhookIngressService webhooks;
    private final SquareWebhookBodyReader bodies;
    private final SquareWebhookRateLimit rateLimit;

    public SquarePublicController(SquareWebhookIngressService webhooks, SquareWebhookBodyReader bodies,
            SquareWebhookRateLimit rateLimit) {
        this.webhooks = webhooks;
        this.bodies = bodies;
        this.rateLimit = rateLimit;
    }

    @PostMapping("/webhook")
    public ResponseEntity<?> webhook(
            HttpServletRequest request,
            @RequestHeader(name = "x-square-hmacsha256-signature", required = false) String signature,
            @RequestHeader(name = "Square-Environment", required = false) String environment) {
        rateLimit.require(request);
        var outcome = webhooks.receive(bodies.read(request), signature, environment);
        return "failed".equals(outcome.status()) ? ResponseEntity.status(503).body(outcome) : ResponseEntity.ok(outcome);
    }
}
