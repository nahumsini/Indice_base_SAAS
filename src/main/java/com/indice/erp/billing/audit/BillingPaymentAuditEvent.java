package com.indice.erp.billing.audit;

import java.time.Instant;
import java.util.Map;

public record BillingPaymentAuditEvent(
    Long companyId,
    Long userId,
    Long userCompanyId,
    Long signupIntentId,
    String stripeCustomerId,
    String stripeSubscriptionId,
    String stripeCheckoutSessionId,
    String stripeInvoiceId,
    String stripePaymentIntentId,
    String stripeEventId,
    String eventType,
    String status,
    String source,
    Integer amountCents,
    String currency,
    String failureCode,
    String failureMessage,
    String ipAddress,
    String userAgent,
    Map<String, ?> metadata,
    Instant occurredAt
) {
    public BillingPaymentAuditEvent {
        metadata = metadata == null ? Map.of() : Map.copyOf(metadata);
    }

    public static BillingPaymentAuditEvent of(String eventType, String status, String source) {
        return new BillingPaymentAuditEvent(null, null, null, null, null, null, null, null, null,
            null, eventType, status, source, null, null, null, null, null, null, Map.of(), null);
    }

    public BillingPaymentAuditEvent company(Long value) {
        return copy(value, userId, userCompanyId, signupIntentId, stripeCustomerId, stripeSubscriptionId,
            stripeCheckoutSessionId, stripeInvoiceId, stripePaymentIntentId, stripeEventId, amountCents,
            currency, failureCode, failureMessage, ipAddress, userAgent, metadata);
    }

    public BillingPaymentAuditEvent user(Long userId, Long userCompanyId) {
        return copy(companyId, userId, userCompanyId, signupIntentId, stripeCustomerId, stripeSubscriptionId,
            stripeCheckoutSessionId, stripeInvoiceId, stripePaymentIntentId, stripeEventId, amountCents,
            currency, failureCode, failureMessage, ipAddress, userAgent, metadata);
    }

    public BillingPaymentAuditEvent intent(Long value) {
        return copy(companyId, userId, userCompanyId, value, stripeCustomerId, stripeSubscriptionId,
            stripeCheckoutSessionId, stripeInvoiceId, stripePaymentIntentId, stripeEventId, amountCents,
            currency, failureCode, failureMessage, ipAddress, userAgent, metadata);
    }

    public BillingPaymentAuditEvent stripe(String customerId, String subscriptionId, String checkoutId,
            String invoiceId, String eventId) {
        return copy(companyId, userId, userCompanyId, signupIntentId, customerId, subscriptionId, checkoutId,
            invoiceId, stripePaymentIntentId, eventId, amountCents, currency, failureCode, failureMessage,
            ipAddress, userAgent, metadata);
    }

    public BillingPaymentAuditEvent amount(Integer cents, String currency) {
        return copy(companyId, userId, userCompanyId, signupIntentId, stripeCustomerId, stripeSubscriptionId,
            stripeCheckoutSessionId, stripeInvoiceId, stripePaymentIntentId, stripeEventId, cents, currency,
            failureCode, failureMessage, ipAddress, userAgent, metadata);
    }

    public BillingPaymentAuditEvent failure(String code, String message) {
        return copy(companyId, userId, userCompanyId, signupIntentId, stripeCustomerId, stripeSubscriptionId,
            stripeCheckoutSessionId, stripeInvoiceId, stripePaymentIntentId, stripeEventId, amountCents,
            currency, code, message, ipAddress, userAgent, metadata);
    }

    public BillingPaymentAuditEvent metadata(Map<String, ?> value) {
        return copy(companyId, userId, userCompanyId, signupIntentId, stripeCustomerId, stripeSubscriptionId,
            stripeCheckoutSessionId, stripeInvoiceId, stripePaymentIntentId, stripeEventId, amountCents,
            currency, failureCode, failureMessage, ipAddress, userAgent, value);
    }

    private BillingPaymentAuditEvent copy(Long companyId, Long userId, Long userCompanyId, Long signupIntentId,
            String customerId, String subscriptionId, String checkoutId, String invoiceId, String paymentIntentId,
            String eventId, Integer amountCents, String currency, String failureCode, String failureMessage,
            String ipAddress, String userAgent, Map<String, ?> metadata) {
        return new BillingPaymentAuditEvent(companyId, userId, userCompanyId, signupIntentId, customerId,
            subscriptionId, checkoutId, invoiceId, paymentIntentId, eventId, eventType, status, source,
            amountCents, currency, failureCode, failureMessage, ipAddress, userAgent, metadata, occurredAt);
    }
}
