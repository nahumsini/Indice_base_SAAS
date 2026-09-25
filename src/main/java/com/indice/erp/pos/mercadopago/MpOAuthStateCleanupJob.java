package com.indice.erp.pos.mercadopago;

import java.time.Clock;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public record MpOAuthStateCleanupJob(MpOAuthStateCleanupStore states, Clock clock) {
    @Scheduled(fixedDelayString = "${app.pos.mercado-pago.oauth-state-cleanup-delay-ms:3600000}")
    public void cleanup() { states.deleteExpired(clock.instant(), 250); }
}
