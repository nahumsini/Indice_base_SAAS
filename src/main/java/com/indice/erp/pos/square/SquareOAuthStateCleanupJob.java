package com.indice.erp.pos.square;

import java.time.Clock;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public record SquareOAuthStateCleanupJob(SquareOAuthStateCleanupStore states, Clock clock) {
    @Scheduled(fixedDelayString = "${app.pos.square.oauth-state-cleanup-delay-ms:3600000}")
    public void cleanup() { states.deleteExpired(clock.instant(), 250); }
}
