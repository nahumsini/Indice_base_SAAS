package com.indice.erp.pos.returns;

import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Map;

public final class PosReturnDtos {
    private PosReturnDtos() {}
    public record PrepareRequest(@Positive long ticketId, @NotBlank @Size(min = 5, max = 500) String reason,
            boolean goodsReceived, @NotBlank @Pattern(regexp = "[A-Za-z0-9_-]{16,100}") String requestKey) {}
    public record ConfirmRequest(boolean cashReturned, Map<Long, String> transferReferences) {}
    public record Candidate(long id, String ticketNumber, BigDecimal totalAmount, String currency, String status) {}
    public record Payment(long id, long paymentId, String paymentMethod, BigDecimal amount, String currency,
            String status, String providerRefundId, String evidenceReference) {}
    public record Response(long id, long ticketId, String ticketNumber, long shiftId, String status,
            String reason, BigDecimal totalAmount, String currency, Instant completedAt, List<Payment> payments) {}
}
