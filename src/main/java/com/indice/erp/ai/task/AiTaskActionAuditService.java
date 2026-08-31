package com.indice.erp.ai.task;

import com.indice.erp.ai.access.AiAccessTokenRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

@Service
public class AiTaskActionAuditService {

    private static final Logger LOGGER = LoggerFactory.getLogger(AiTaskActionAuditService.class);

    private final AiTaskActionRepository repository;

    public AiTaskActionAuditService(AiTaskActionRepository repository) {
        this.repository = repository;
    }

    public void record(
        AiAccessTokenRepository.StoredToken token,
        Long confirmationId,
        String eventType,
        String outcome,
        String correlationId,
        String idempotencyHash,
        Object normalizedArgs,
        Object result,
        String errorCode,
        String errorMessage
    ) {
        try {
            repository.insertAudit(
                token,
                confirmationId,
                eventType,
                outcome,
                correlationId,
                idempotencyHash,
                normalizedArgs,
                result,
                errorCode,
                errorMessage
            );
        } catch (RuntimeException exception) {
            LOGGER.error("AI task action audit could not be persisted.", exception);
        }
    }
}
