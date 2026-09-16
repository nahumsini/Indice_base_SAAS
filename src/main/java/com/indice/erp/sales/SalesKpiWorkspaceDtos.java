package com.indice.erp.sales;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

public final class SalesKpiWorkspaceDtos {

    private SalesKpiWorkspaceDtos() {
    }

    public record WorkspaceResponse(
        List<ContactRow> contacts,
        List<OpportunityRow> opportunities,
        List<QuoteRow> quotes,
        List<SaleRow> sales,
        List<UnitOption> units,
        List<BusinessOption> businesses,
        LocalDate asOfDate,
        String timeZone,
        String definitionVersion
    ) {}

    public record ContactRow(
        long id,
        Long unitId,
        Long businessId,
        String companyName,
        String contactPerson,
        String source,
        String status,
        Long ownerUserCompanyId,
        String ownerName
    ) {}

    public record OpportunityRow(
        long id,
        Long contactId,
        Long unitId,
        Long businessId,
        String opportunityCode,
        String opportunityName,
        String companyName,
        String source,
        String stage,
        String lifecycleStatus,
        String status,
        Long ownerUserCompanyId,
        String ownerName,
        Integer probabilityPercent,
        LocalDate expectedCloseDate,
        String nextAction,
        LocalDateTime nextActionAt,
        LocalDateTime lastContactAt,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
    ) {}

    public record QuoteRow(
        long id,
        Long contactId,
        Long opportunityId,
        String quoteNumber,
        String clientName,
        String status,
        LocalDate createdDate,
        LocalDate expirationDate,
        Long sellerUserCompanyId,
        String sellerName
    ) {}

    public record SaleRow(
        long id,
        Long contactId,
        Long opportunityId,
        Long quoteId,
        Long unitId,
        Long businessId,
        String saleNumber,
        String customerName,
        Long sellerUserCompanyId,
        String sellerName,
        LocalDate saleDate,
        String commercialStatus,
        String financeStatus,
        String inventoryStatus,
        String deliveryStatus,
        String commissionStatus,
        String inventoryMovementStatus
    ) {}

    public record UnitOption(long id, String name) {}

    public record BusinessOption(long id, long unitId, String name) {}
}
