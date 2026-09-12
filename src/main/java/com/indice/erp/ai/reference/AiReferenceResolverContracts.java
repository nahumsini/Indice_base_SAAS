package com.indice.erp.ai.reference;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public final class AiReferenceResolverContracts {

    private AiReferenceResolverContracts() {
    }

    public record PageRequest(String query, Integer limit, String cursor) {
    }

    public record BusinessContextResponse(
        Instant generatedAt,
        Long companyId,
        String companyName,
        Long userId,
        Long userCompanyId,
        String userName,
        String role,
        String scopeType,
        Long assignedUnitId,
        String assignedUnitName,
        Long assignedBusinessId,
        String assignedBusinessName
    ) {
    }

    public record ReferencePage<T>(
        Instant generatedAt,
        String scopeType,
        List<T> items,
        int returnedCount,
        int totalCount,
        boolean hasMore,
        String nextCursor
    ) {
    }

    public record OrganizationReference(
        String referenceType,
        long id,
        String name,
        Long unitId,
        String unitName,
        String status
    ) {
    }

    public record PaymentAccountReference(
        long id,
        String name,
        String type,
        String currencyCode,
        BigDecimal currentBalance,
        BigDecimal pendingBalance,
        BigDecimal totalBalance,
        Long unitId,
        Long businessId,
        String status,
        boolean systemManaged
    ) {
    }

    public record FundReference(
        long id,
        String name,
        String fundType,
        String currencyCode,
        BigDecimal limitAmount,
        BigDecimal currentBalanceAmount,
        Long paymentAccountId,
        Long fundingSourcePaymentAccountId,
        Long unitId,
        Long businessId,
        String status
    ) {
    }
}
