package com.indice.erp.billing.subscription;

import java.time.Instant;

public record BillingInvoiceResponse(
    String invoice_id,
    String status,
    String currency,
    Long amount_due_cents,
    Long amount_paid_cents,
    String hosted_invoice_url,
    String invoice_pdf_url,
    Instant period_starts_at,
    Instant period_ends_at,
    Instant updated_at
) {
}
