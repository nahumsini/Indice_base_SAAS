package com.indice.erp.billing.collection;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import java.time.Instant;
import java.util.List;

public final class PaymentCollectionContracts {
    private PaymentCollectionContracts() { }

    public record Owner(String name, String email) { }
    @JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
    public record Request(String id, String kind, String status, int version, Instant requestedAt,
                          Instant deadlineAt, String reason, long amountCents, String currency,
                          String billingInterval, Instant paidAt, boolean protectedIndefinitely) { }
    @JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
    public record Quote(String kind, long amountCents, String currency, String billingInterval,
                        Instant paidThrough, String token, boolean amountIsEstimate) { }
    @JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
    public record Delivery(Instant scheduledAt, String status, Instant sentAt, String channel, int attempts) { }
    @JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
    public record History(String action, String actorName, String reason, Instant occurredAt, Instant deadlineAt) { }
    @JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
    public record Workspace(long companyId, String companyName, Owner owner, Request request, Quote quote,
                            boolean eligible, List<String> blockers, List<Delivery> deliveries, List<History> history) { }
    @JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
    public record Recovery(Request request, boolean canPay, boolean collectionBlocked, String ownerName, String ownerEmail, boolean isOwner) { }
    @JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
    public record Start(String reason, String expectedQuoteToken) { }
    @JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
    public record Extend(String reason, int expectedVersion, String expectedRequestId) { }
    @JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
    public record Pay(String expectedRequestId, int expectedVersion) { }
    public record Failure(String code, String message) { }
}
