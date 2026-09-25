package com.indice.erp.pos.square;

import org.springframework.stereotype.Service;

@Service
public class SquareWebhookIngressService {
    private final SquareWebhookSignatureVerifier verifier;
    private final SquareWebhookPayloadParser parser;
    private final SquareWebhookEventRepository events;
    private final SquareWebhookEventClaims claims;
    private final SquareWebhookProcessor processor;
    public SquareWebhookIngressService(SquareWebhookSignatureVerifier verifier, SquareWebhookPayloadParser parser,
            SquareWebhookEventRepository events, SquareWebhookEventClaims claims, SquareWebhookProcessor processor) {
        this.verifier = verifier;
        this.parser = parser;
        this.events = events;
        this.claims = claims;
        this.processor = processor;
    }
    public Response receive(String raw, String signature, String environment) {
        verifier.verify(raw, signature);
        var payload = parser.parse(raw, environment);
        var stored = events.ingest(new SquareWebhookEventRepository.SquareWebhookEnvelope(payload.eventId(), payload.eventType(),
            payload.environment(), payload.merchantId(), payload.objectId(), SquareHashing.sha256(raw), parser.persisted(payload)));
        var lease = claims.claim(stored.id());
        if (lease == null) return new Response(payload.eventId(), stored.duplicate(), true, "duplicate");
        return new Response(payload.eventId(), stored.duplicate(), true, processor.process(stored.id(), lease, payload));
    }
    void retryStored(long id, String raw, String environment) {
        var lease = claims.claim(id);
        if (lease != null) processor.process(id, lease, parser.parse(raw, environment));
    }
    public record Response(String eventId, boolean duplicate, boolean durablyStored, String status) {}
}
