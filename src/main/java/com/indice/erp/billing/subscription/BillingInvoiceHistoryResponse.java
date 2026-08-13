package com.indice.erp.billing.subscription;

import java.util.List;

public record BillingInvoiceHistoryResponse(List<BillingInvoiceResponse> invoices) {
}
