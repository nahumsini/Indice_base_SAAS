package com.indice.erp.finance.providers;

import com.indice.erp.finance.providers.dto.CreateProviderRequest;
import com.indice.erp.finance.providers.dto.ProviderResponse;
import com.indice.erp.finance.providers.dto.UpdateProviderRequest;
import com.indice.erp.finance.shared.FinanceContext;
import com.indice.erp.finance.shared.FinanceScope;
import java.time.Instant;

final class ProviderTestData {

    private ProviderTestData() {
    }

    static FinanceContext context() {
        return new FinanceContext(1L, 7L, "Finance User", "user", true, FinanceScope.corporateOffice());
    }

    static CreateProviderRequest createRequest(String name, String taxId) {
        return new CreateProviderRequest(
            null, null, name, "ACME Legal", taxId, "billing@acme.test", "+52 998 000 0000",
            "Billing Team", 30, null, "Preferred provider", null, null);
    }

    static UpdateProviderRequest updateRequest(String name, String taxId, ProviderStatus status) {
        return new UpdateProviderRequest(
            null, null, name, "ACME Legal Updated", taxId, "accounts@acme.test", "+52 998 000 0001",
            "Accounts Team", 45, status, "Updated provider", null, null);
    }

    static ProviderRecord record(long id, String name, String taxId, ProviderStatus status) {
        return new ProviderRecord(
            id, 7L, null, null, name, "ACME Legal", taxId, "billing@acme.test", "+52 998 000 0000",
            "Billing Team", 30, status, "Preferred provider", 1L, null,
            Instant.parse("2026-06-08T23:00:00Z"), null, null, 0L, null, null);
    }

    static ProviderResponse response(long id) {
        return new ProviderResponse(
            id, 7L, null, null, "ACME", "ACME Legal", "RFC123", "billing@acme.test",
            "+52 998 000 0000", "Billing Team", 30, ProviderStatus.ACTIVE, "Preferred provider",
            1L, null, Instant.parse("2026-06-08T23:00:00Z"), null, null, 0L, null, null);
    }
}
