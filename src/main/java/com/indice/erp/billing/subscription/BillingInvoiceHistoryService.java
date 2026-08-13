package com.indice.erp.billing.subscription;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class BillingInvoiceHistoryService {

    private final BillingInvoiceHistoryRepository repository;

    BillingInvoiceHistoryService(BillingInvoiceHistoryRepository repository) {
        this.repository = repository;
    }

    @Transactional(readOnly = true)
    public BillingInvoiceHistoryResponse current(long companyId) {
        return new BillingInvoiceHistoryResponse(repository.findByCompanyId(companyId));
    }
}
