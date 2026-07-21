package com.indice.erp.billing.stripe;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/billing/stripe")
public class StripeWebhookController {

    private final StripeWebhookIngressService ingress;

    public StripeWebhookController(StripeWebhookIngressService ingress) {
        this.ingress = ingress;
    }

    @PostMapping("/webhook")
    public ResponseEntity<?> webhook(
        @RequestBody String rawPayload,
        @RequestHeader(name = "Stripe-Signature", required = false) String signature
    ) {
        return ResponseEntity.ok(ingress.receive(rawPayload, signature));
    }
}
