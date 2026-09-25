package com.indice.erp.ai.commercial;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.indice.erp.ai.action.AiActionRepository;
import com.indice.erp.ai.access.AiAccessTokenRepository.StoredToken;
import com.indice.erp.sales.SalesAssistantService;
import com.indice.erp.sales.SalesAssistantContracts.Prepared;
import java.time.Clock;
import java.util.Map;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import static com.indice.erp.ai.commercial.AiCommercialContracts.*;

@Service
public class AiCommercialExecutionService {
    private final AiActionRepository repository;
    private final SalesAssistantService owner;
    private final AiCommercialAccess access;
    private final ObjectMapper mapper;
    private final Clock clock;
    public AiCommercialExecutionService(AiActionRepository repository, SalesAssistantService owner,
            AiCommercialAccess access, ObjectMapper mapper, Clock clock) {
        this.repository = repository; this.owner = owner; this.access = access; this.mapper = mapper; this.clock = clock;
    }
    @Transactional(isolation = org.springframework.transaction.annotation.Isolation.READ_COMMITTED)
    public Committed execute(StoredToken token, AiActionRepository.Confirmation confirmation, String key, String correlation) {
        access.require(token, confirmation.tool());
        long execution = repository.insertPendingExecution(token, confirmation, key, correlation);
        if (repository.consumeConfirmation(confirmation.id(), clock.instant()) != 1) throw new Conflict("confirmation_unavailable");
        var prepared = mapper.convertValue(confirmation.normalizedArgs(), Prepared.class);
        var result = owner.execute(token.user(), prepared);
        Map<String, Object> stored = mapper.convertValue(result, new TypeReference<>() { });
        if (repository.completeExecution(execution, stored, clock.instant()) != 1) throw new IllegalStateException("Execution was not completed.");
        // The successful audit and owner write commit or roll back together. No customer contact data in audit.
        repository.insertAudit(token, confirmation.tool(), confirmation.id(), "COMMIT", "SUCCESS", correlation, key,
            Map.of("kind", prepared.kind()), Map.of("id", result.id()), null, null);
        return new Committed(confirmation.tool(), false, correlation, result);
    }
}
