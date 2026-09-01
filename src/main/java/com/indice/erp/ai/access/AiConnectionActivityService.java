package com.indice.erp.ai.access;

import com.indice.erp.auth.AuthSessionUser;
import java.time.Instant;
import java.util.Comparator;
import java.util.NoSuchElementException;
import java.util.stream.Stream;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AiConnectionActivityService {

    private static final int DEFAULT_LIMIT = 25;
    private static final int MAX_LIMIT = 100;

    private final AiToolUsageAuditRepository repository;

    public AiConnectionActivityService(AiToolUsageAuditRepository repository) {
        this.repository = repository;
    }

    @Transactional(readOnly = true)
    public java.util.List<ActivityEvent> list(AuthSessionUser owner, long connectionId, int requestedLimit) {
        if (owner == null || owner.userId() == null || owner.companyId() == null || owner.userCompanyId() == null) {
            throw new IllegalArgumentException("AI connections require a direct active company membership.");
        }
        if (!repository.connectionBelongsTo(connectionId, owner.userId(), owner.companyId())) {
            throw new NoSuchElementException("AI connection not found.");
        }
        var limit = requestedLimit <= 0 ? DEFAULT_LIMIT : Math.min(requestedLimit, MAX_LIMIT);
        return Stream.concat(
                repository.listReadEvents(connectionId, owner.userId(), owner.companyId(), limit).stream(),
                repository.listActionEvents(connectionId, owner.userId(), owner.companyId(), limit).stream()
            )
            .sorted(Comparator.comparing(ActivityEvent::createdAt).reversed())
            .limit(limit)
            .toList();
    }

    public record ActivityEvent(
        String id,
        String kind,
        String toolName,
        String eventType,
        String outcome,
        Integer statusCode,
        int riskLevel,
        Instant createdAt
    ) {
    }
}
