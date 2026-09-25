package com.indice.erp.pos.mercadopago;

import java.util.UUID;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public record MpWebhookProcessingJob(MpProperties properties, MpWebhookInbox inbox,
        MpWebhookOutcomeStore outcomes, MpIntentStore intents, MpPaymentRecovery recovery) {
    @Scheduled(fixedDelayString = "${app.pos.mercado-pago.reconciliation-delay-ms:30000}")
    public void process() {
        if (!properties.isEnabled()) return;
        for (var event : inbox.due()) {
            var lease = UUID.randomUUID().toString();
            if (!inbox.claim(event, lease)) continue;
            var intent = intents.byOrder(event.environment(), event.orderId()).orElse(null);
            if (intent == null) {
                outcomes.retry(event, lease, "ORDER_LINK_PENDING");
                continue;
            }
            try {
                var verified = recovery.recover(intent, MpAuditActor.webhook());
                var current = intents.find(intent.companyId(), intent.id()).orElseThrow();
                if (!verified || current.status().equals("UNCERTAIN")) outcomes.retry(event, lease, "VERIFICATION_PENDING");
                else outcomes.processed(event, lease, current);
            } catch (RuntimeException exception) {
                outcomes.retry(event, lease, "VERIFICATION_FAILED");
            }
        }
    }
}
