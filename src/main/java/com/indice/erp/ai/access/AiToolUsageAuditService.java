package com.indice.erp.ai.access;

import java.time.Clock;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

@Service
public class AiToolUsageAuditService {

    private static final Logger LOGGER = LoggerFactory.getLogger(AiToolUsageAuditService.class);

    private final AiToolUsageAuditRepository repository;
    private final Clock clock;

    public AiToolUsageAuditService(AiToolUsageAuditRepository repository, Clock clock) {
        this.repository = repository;
        this.clock = clock;
    }

    public void recordRead(
        AiAccessTokenRepository.StoredToken token,
        String toolName,
        String outcome,
        int statusCode
    ) {
        try {
            repository.insert(token, toolName, outcome, statusCode, clock.instant());
        } catch (RuntimeException exception) {
            LOGGER.error("AI read usage audit could not be persisted for tool {}.", toolName, exception);
        }
    }
}
