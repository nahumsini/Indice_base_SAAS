package com.indice.erp.billing.subscription;

public interface CompanySubscriptionStatusProvider {
    CompanySubscriptionStatus currentStatus(long companyId);
}
