package com.indice.erp.pos.square;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

@Repository
public class SquareWebhookEventRepository {
    private final SquareWebhookInboxInsert insertion;
    private final SquareWebhookInboxOutcome outcomes;
    public SquareWebhookEventRepository(JdbcTemplate jdbc) {
        this.insertion = new SquareWebhookInboxInsert(jdbc);
        this.outcomes = new SquareWebhookInboxOutcome(jdbc);
    }
    @Transactional
    public IngressResult ingest(SquareWebhookEnvelope event) {
        return insertion.ingest(event);
    }
    public void markProcessed(long id, SquareWebhookEventClaims.Lease lease, Long company, Long intent, Long terminal) {
        outcomes.processed(id, lease.owner(), company, intent, terminal);
    }
    public void markIgnored(long id, SquareWebhookEventClaims.Lease lease, Long company, String message) {
        outcomes.ignored(id, lease.owner(), company, message);
    }
    public void markFailed(long id, SquareWebhookEventClaims.Lease lease, Long company, String message) {
        outcomes.failed(id, lease.owner(), company, message);
    }
    public record SquareWebhookEnvelope(String eventId, String eventType, String environment, String merchantId,
        String objectId, String payloadSha256, String rawPayload) {}
    public record IngressResult(long id, boolean duplicate) {}
}
