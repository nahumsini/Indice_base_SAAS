package com.indice.erp.billing.collection;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.indice.erp.billing.BillingHashing;
import com.indice.erp.billing.catalog.CommercialOfferSelection;
import com.indice.erp.billing.catalog.CommercialOfferSelectionService;
import com.indice.erp.billing.stripe.StripeCollectionGateway;
import com.indice.erp.billing.stripe.StripeCatalogGateway;
import com.indice.erp.billing.stripe.StripePhaseTwoProperties;
import com.indice.erp.billing.stripe.StripeSecretProvider;
import com.indice.erp.billing.subscription.BillingActivationService;
import com.indice.erp.billing.subscription.BillingSelectionChangeService;
import java.net.URI;
import java.sql.Timestamp;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionSynchronizationManager;

/** Builds immutable obligations; provider calls always happen outside database transactions. */
@Service
public class PaymentCollectionPaymentService {
    private final JdbcTemplate jdbc;
    private final CommercialOfferSelectionService offers;
    private final BillingSelectionChangeService selections;
    private final BillingActivationService activation;
    private final StripeCollectionGateway stripe;
    private final StripeCatalogGateway catalog;
    private final StripeSecretProvider secrets;
    private final StripePhaseTwoProperties properties;
    private final ObjectMapper json;
    private final Clock clock;
    private final PaymentCollectionProtectionService protection;

    public PaymentCollectionPaymentService(JdbcTemplate jdbc, CommercialOfferSelectionService offers,
        BillingSelectionChangeService selections, BillingActivationService activation,
        StripeCollectionGateway stripe, StripeCatalogGateway catalog, StripeSecretProvider secrets, StripePhaseTwoProperties properties,
        ObjectMapper json, Clock clock, PaymentCollectionProtectionService protection) {
        this.jdbc = jdbc;
        this.offers = offers;
        this.selections = selections;
        this.activation = activation;
        this.stripe = stripe;
        this.catalog = catalog;
        this.secrets = secrets;
        this.properties = properties;
        this.json = json;
        this.clock = clock;
        this.protection = protection;
    }

    public Quote quote(long companyId) {
        requireOutsideTransaction();
        var blockers = new ArrayList<String>();
        if (!secrets.isApiConfigured()) blockers.add("STRIPE_NOT_CONFIGURED");
        var subscriptions = subscriptions(companyId);
        if (subscriptions.stream().anyMatch(subscription -> subscription.stripeId() == null
            || (!subscription.external() && !subscription.stripeId().startsWith("internal_")
                && !subscription.stripeId().startsWith("legacy_")))) blockers.add("SUBSCRIPTION_REFERENCE_INVALID");
        var real = subscriptions.stream().filter(Subscription::external).toList();
        if (real.size() > 1) blockers.add("MULTIPLE_STRIPE_SUBSCRIPTIONS");
        var subscription = real.isEmpty() ? subscriptions.stream().findFirst().orElse(null) : real.getFirst();
        var paidThrough = paidThrough(companyId, subscription);
        var trialEnd = protectedUntil(companyId, subscription);
        var promises = protection.protection(companyId);
        if (paidThrough != null && paidThrough.isAfter(clock.instant().plus(Duration.ofDays(7)))) blockers.add("PAID_PERIOD_EXTENDS_BEYOND_PAYMENT_WINDOW");
        if (properties.isCatalogLiveSyncEnabled()) blockers.add("STRIPE_CATALOG_MAINTENANCE");
        if (trialEnd != null && trialEnd.isAfter(clock.instant().plus(Duration.ofDays(7)))) {
            blockers.add("TRIAL_EXTENDS_BEYOND_PAYMENT_WINDOW");
        }
        if (promises.indefiniteBenefit()) blockers.add("ACTIVE_INDEFINITE_BENEFIT");
        if (promises.protectedUntil() != null && promises.protectedUntil().isAfter(clock.instant().plus(Duration.ofDays(7)))) {
            blockers.add("PROTECTED_PERIOD_EXTENDS_BEYOND_PAYMENT_WINDOW");
        }
        if (real.isEmpty() && pendingActivation(companyId)) blockers.add("ACTIVATION_ALREADY_IN_PROGRESS");
        if (real.isEmpty() && protection.trialExtensionPending(companyId)) blockers.add("TRIAL_EXTENSION_IN_PROGRESS");
        if (!real.isEmpty()) return invoiceQuote(companyId, subscription, paidThrough, trialEnd, blockers);
        return activationQuote(companyId, subscription, paidThrough, trialEnd, blockers);
    }

    public void persistObligations(long companyId, long requestId, Quote quote) {
        if (!TransactionSynchronizationManager.isActualTransactionActive()) {
            throw new IllegalStateException("Collection obligations require the case transaction.");
        }
        if (!quote.blockers().isEmpty() || quote.amountCents() <= 0) {
            throw new IllegalStateException("The payment request has unresolved blockers.");
        }
        jdbc.queryForObject("SELECT id FROM companies WHERE id = ? FOR UPDATE", Long.class, companyId);
        if ("ACTIVATION".equals(quote.kind())) protection.requireCollectionActivationAllowed(companyId);
        // Core holds the company lock. Ordinary activation takes the same lock before its intent,
        // so an unbound activation cannot slip between the quote and committing this case.
        if ("ACTIVATION".equals(quote.kind()) && pendingActivation(companyId)) {
            throw new IllegalStateException("An activation is already in progress. Finish it before requesting payment.");
        }
        var owned = jdbc.queryForObject("SELECT COUNT(*) FROM company_payment_requests WHERE id = ? AND company_id = ? AND quote_token = ?", Long.class,
            requestId, companyId, quote.fingerprint());
        if (owned == null || owned != 1) throw new IllegalArgumentException("Payment request not found.");
        jdbc.update("INSERT INTO payment_collection_payment_states (request_id, company_id, selection_json) VALUES (?, ?, ?)",
            requestId, companyId, quote.selection() == null ? null : encode(quote.selection()));
        for (var invoice : quote.invoices()) {
            jdbc.update("""
                INSERT INTO payment_collection_obligations
                    (request_id, company_id, stripe_invoice_id, stripe_subscription_id, stripe_customer_id,
                     currency, amount_cents, amount_due_cents, hosted_invoice_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, requestId, companyId, invoice.invoiceId(), invoice.subscriptionId(), invoice.customerId(),
                invoice.currency(), invoice.amountCents(), invoice.invoiceAmountCents(), invoice.hostedInvoiceUrl());
        }
    }

    public PaymentLink paymentUrl(long companyId, long requestId, long userId, String key) {
        requireOutsideTransaction();
        secrets.requireEnabled();
        if (properties.isCatalogLiveSyncEnabled()) throw new IllegalStateException("Stripe catalog maintenance is active.");
        var request = request(companyId, requestId);
        if (!"OPEN".equals(request.status())) throw new IllegalStateException("The payment request is already settled.");
        requireMode(request.mode());
        if ("INVOICE".equals(request.kind())) {
            for (var obligation : obligations(companyId, requestId)) {
                var invoice = stripe.retrieveInvoice(obligation.invoiceId());
                if (settledInvoice(invoice, obligation, request.mode())) continue;
                if (!payableInvoice(invoice, obligation, request.mode())) {
                    throw new IllegalStateException("The bound invoice is no longer payable. Refresh billing status.");
                }
                return new PaymentLink(invoice.hostedInvoiceUrl(), null);
            }
            throw new IllegalStateException("All bound invoices are paid. Refresh billing status.");
        }
        var selection = selection(companyId, requestId);
        var response = activation.createCollectionCheckout(companyId, userId,
            "collection-request-" + requestId, selection, requestId);
        return new PaymentLink(response.checkout_url(), response.checkout_expires_at());
    }

    public boolean reconcile(long companyId, long requestId) {
        requireOutsideTransaction();
        var request = request(companyId, requestId);
        if ("PAID".equals(request.status())) return true;
        if (!secrets.isApiConfigured() || !sameMode(request.mode())) return false;
        if ("INVOICE".equals(request.kind())) {
            var obligations = obligations(companyId, requestId);
            return !obligations.isEmpty() && obligations.stream().allMatch(obligation ->
                settledInvoice(stripe.retrieveInvoice(obligation.invoiceId()), obligation, request.mode()));
        }
        var intents = jdbc.query("""
            SELECT intent.stripe_checkout_session_id, intent.stripe_customer_id, intent.stripe_subscription_id
            FROM payment_collection_payment_states state
            JOIN billing_signup_intents intent ON intent.id = state.signup_intent_id AND intent.company_id = state.company_id
            WHERE state.request_id = ? AND state.company_id = ?
            """, (rs, row) -> new Intent(rs.getString(1), rs.getString(2), rs.getString(3)), requestId, companyId);
        if (intents.size() != 1 || intents.getFirst().sessionId() == null) return false;
        var intent = intents.getFirst();
        var checkout = stripe.retrieveCheckout(intent.sessionId());
        if (!"complete".equals(checkout.status()) || !"paid".equals(checkout.paymentStatus())
            || checkout.invoiceId() == null || !Objects.equals(checkout.customerId(), intent.customerId())
            || !Objects.equals(checkout.subscriptionId(), intent.subscriptionId())
            || !Long.toString(companyId).equals(checkout.metadata().get("indice_company_id"))
            || !Long.toString(requestId).equals(checkout.metadata().get("indice_payment_request"))) return false;
        var invoice = stripe.retrieveInvoice(checkout.invoiceId());
        return settledActivation(invoice, selection(companyId, requestId), request.mode(),
            intent.customerId(), intent.subscriptionId(), requestId);
    }

    private Quote invoiceQuote(long companyId, Subscription sub, Instant paidThrough, Instant trialEnd, List<String> blockers) {
        var rows = jdbc.query("""
            SELECT stripe_invoice_id FROM billing_invoice_snapshots
            WHERE company_id = ? AND stripe_subscription_id = ? AND LOWER(status) = 'open'
              AND amount_due_cents > COALESCE(amount_paid_cents, 0) ORDER BY id LIMIT 51
            """, (rs, row) -> rs.getString(1), companyId, sub.stripeId());
        if (rows.size() > 50) blockers.add("TOO_MANY_OPEN_INVOICES");
        var invoices = new ArrayList<InvoiceObligation>();
        if (blockers.isEmpty()) {
            for (var id : rows) {
                try {
                    var invoice = stripe.retrieveInvoice(id);
                    var obligation = new InvoiceObligation(id, sub.stripeId(), sub.customerId(),
                        upper(invoice.currency()), invoice.amountRemaining() == null ? 0 : invoice.amountRemaining(),
                        invoice.amountDue() == null ? 0 : invoice.amountDue(), invoice.hostedInvoiceUrl());
                    if (!payableInvoice(invoice, obligation, mode())) blockers.add("INVOICE_NOT_PAYABLE");
                    else invoices.add(obligation);
                } catch (IllegalStateException unavailable) {
                    blockers.add("STRIPE_VERIFICATION_UNAVAILABLE");
                }
            }
        }
        if (invoices.isEmpty()) blockers.add("NO_PAYABLE_INVOICE");
        if (invoices.stream().map(InvoiceObligation::currency).distinct().count() > 1) blockers.add("MIXED_INVOICE_CURRENCIES");
        long total = invoices.stream().mapToLong(InvoiceObligation::amountCents).reduce(0, Math::addExact);
        return finish("INVOICE", total, invoices.isEmpty() ? upper(sub.currency()) : invoices.getFirst().currency(),
            sub.interval(), sub.catalogVersion(), sub.stripeId(), sub.customerId(), paidThrough, trialEnd,
            blockers, List.of(), invoices, null);
    }

    private Quote activationQuote(long companyId, Subscription sub, Instant paidThrough, Instant trialEnd, List<String> blockers) {
        var draft = selections.draft(companyId);
        var codes = draft == null ? sub == null ? List.<String>of() : jdbc.query("""
            SELECT product.product_code FROM company_billing_subscription_products selected
            JOIN billing_catalog_products product ON product.id = selected.catalog_product_id
            JOIN company_billing_subscriptions subscription ON subscription.id = selected.subscription_id
            WHERE selected.subscription_id = ? AND subscription.company_id = ? ORDER BY product.product_code
            """, (rs, row) -> rs.getString(1), sub.id(), companyId) : draft.productCodes();
        var interval = draft == null ? sub == null ? "MONTH" : sub.interval() : draft.billingInterval();
        int extraSeats = draft == null ? sub == null ? 0 : sub.extraSeats() : draft.extraSeats();
        var indefinite = jdbc.queryForObject("SELECT COUNT(*) FROM company_benefit_grants WHERE company_id = ? AND status = 'ACTIVE' AND benefit_type = 'PRODUCT' AND ends_at IS NULL", Long.class, companyId);
        if (indefinite != null && indefinite > 0) blockers.add("ACTIVE_INDEFINITE_BENEFIT");
        if (codes.isEmpty()) blockers.add("SELECTION_REQUIRED");
        CommercialOfferSelection selection = null;
        if (!codes.isEmpty()) {
            try {
                selection = offers.select(codes, interval, extraSeats, draft == null ? null : draft.promotionCode());
                if (selection.estimatedAmountCents() == null || selection.estimatedAmountCents() <= 0
                    || selection.lineItems().isEmpty() || selection.lineItems().stream().anyMatch(line ->
                        line.externalPriceId() == null || !line.externalPriceId().startsWith("price_"))) blockers.add("CATALOG_NOT_PAYABLE");
            } catch (IllegalArgumentException | IllegalStateException invalid) {
                blockers.add("CATALOG_NOT_PAYABLE");
            }
        }
        if (selection != null && blockers.isEmpty()) verifySelection(selection, blockers);
        var lines = selection == null ? List.<QuoteLine>of() : selection.lineItems().stream().map(line -> new QuoteLine(
            line.billableCode(), line.billableCode(), line.quantity(), line.unitAmountCents() == null ? 0 : line.unitAmountCents(),
            Math.multiplyExact(line.quantity(), line.unitAmountCents() == null ? 0 : line.unitAmountCents()))).toList();
        return finish("ACTIVATION", selection == null || selection.estimatedAmountCents() == null ? 0 : selection.estimatedAmountCents(),
            selection == null ? "USD" : selection.currency(), interval, selection == null ? null : selection.catalogVersionId(),
            sub == null ? null : sub.stripeId(), sub == null ? customer(companyId) : sub.customerId(),
            paidThrough, trialEnd, blockers, lines, List.of(), selection);
    }

    private void verifySelection(CommercialOfferSelection selection, List<String> blockers) {
        try {
            if (!catalog.account().chargesEnabled()) { blockers.add("STRIPE_ACCOUNT_NOT_READY"); return; }
            var products = new java.util.HashSet<String>();
            for (var line : selection.lineItems()) {
                var price = catalog.verifyRecurringPrice(line.externalPriceId());
                if (!price.active() || price.livemode() != "LIVE".equals(mode())
                    || !selection.currency().equalsIgnoreCase(price.currency())
                    || !selection.billingInterval().name().equalsIgnoreCase(price.interval())
                    || line.unitAmountCents() == null || price.amountCents() != line.unitAmountCents()) {
                    blockers.add("CATALOG_NOT_PAYABLE"); return;
                }
                if (products.add(price.productId()) && !catalog.verifyProduct(price.productId()).active()) {
                    blockers.add("CATALOG_NOT_PAYABLE"); return;
                }
            }
            if (selection.externalPromotionCodeId() != null
                && !catalog.verifyPromotionCode(selection.externalPromotionCodeId()).active()) blockers.add("PROMOTION_NOT_PAYABLE");
        } catch (RuntimeException unavailable) { blockers.add("STRIPE_VERIFICATION_UNAVAILABLE"); }
    }

    private Quote finish(String kind, long amount, String currency, String interval, Long version, String sub,
        String customer, Instant paidThrough, Instant trial, List<String> blockers, List<QuoteLine> lines,
        List<InvoiceObligation> invoices, CommercialOfferSelection selection) {
        var fingerprint = BillingHashing.sha256(encode(List.of(kind, amount, Objects.toString(currency, ""),
            Objects.toString(interval, ""), Objects.toString(version, ""), Objects.toString(sub, ""),
            Objects.toString(customer, ""), Objects.toString(paidThrough, ""), Objects.toString(trial, ""),
            mode(), invoices, selection == null ? "" : encode(selection))));
        return new Quote(kind, amount, currency, interval, version, sub, customer, paidThrough, trial, mode(),
            fingerprint, blockers.stream().distinct().toList(), lines, invoices, selection);
    }

    private List<Subscription> subscriptions(long companyId) {
        return jdbc.query("""
            SELECT id, stripe_subscription_id, stripe_customer_id, catalog_version_id, billing_interval, currency,
                   extra_seats, trial_ends_at, current_period_ends_at, status
            FROM company_billing_subscriptions WHERE company_id = ?
              AND LOWER(status) NOT IN ('canceled', 'incomplete_expired') ORDER BY id DESC
            """, (rs, row) -> new Subscription(rs.getLong(1), rs.getString(2), rs.getString(3), rs.getObject(4, Long.class),
            rs.getString(5), rs.getString(6), rs.getInt(7), instant(rs.getTimestamp(8)), instant(rs.getTimestamp(9)), rs.getString(10)), companyId);
    }

    private boolean pendingActivation(long companyId) {
        var count = jdbc.queryForObject("""
            SELECT COUNT(*) FROM billing_signup_intents intent WHERE intent.company_id = ?
              AND intent.intent_kind = 'EXISTING_COMPANY_ACTIVATION'
              AND (intent.status IN ('PENDING', 'CUSTOMER_CREATED', 'CHECKOUT_CREATED')
                   OR (intent.status = 'CHECKOUT_COMPLETED' AND NOT EXISTS (
                       SELECT 1 FROM company_billing_subscriptions subscription
                       WHERE subscription.signup_intent_id = intent.id)))
            """, Long.class, companyId);
        return count != null && count > 0;
    }

    private Instant paidThrough(long companyId, Subscription sub) {
        var paid = maximum("SELECT MAX(period_ends_at) FROM billing_invoice_snapshots WHERE company_id = ? AND status = 'paid' AND amount_paid_cents > 0", companyId);
        return sub != null && !sub.external() && "active".equalsIgnoreCase(sub.status()) ? latest(paid, sub.periodEnd()) : paid;
    }

    private Instant protectedUntil(long companyId, Subscription sub) {
        return latest(sub == null || !"trialing".equalsIgnoreCase(sub.status()) ? null : sub.trialEnd(), latest(
            maximum("SELECT MAX(ends_at) FROM company_benefit_grants WHERE company_id = ? AND status = 'ACTIVE' AND benefit_type = 'PRODUCT'", companyId),
            maximum("SELECT MAX(ends_at) FROM company_trial_product_grants WHERE company_id = ? AND status = 'ACTIVE'", companyId)));
    }

    private Instant maximum(String sql, long companyId) {
        return jdbc.query(sql, rs -> rs.next() ? instant(rs.getTimestamp(1)) : null, companyId);
    }

    private String customer(long companyId) {
        return jdbc.query("SELECT stripe_customer_id FROM company_billing_customers WHERE company_id = ? AND status = 'ACTIVE'", (rs, row) -> rs.getString(1), companyId)
            .stream().findFirst().orElse(null);
    }

    private Request request(long companyId, long requestId) {
        var rows = jdbc.query("SELECT kind, status, stripe_mode FROM company_payment_requests WHERE id = ? AND company_id = ?",
            (rs, row) -> new Request(rs.getString(1), rs.getString(2), rs.getString(3)), requestId, companyId);
        if (rows.size() != 1) throw new IllegalArgumentException("Payment request not found.");
        return rows.getFirst();
    }

    private List<InvoiceObligation> obligations(long companyId, long requestId) {
        return jdbc.query("SELECT stripe_invoice_id, stripe_subscription_id, stripe_customer_id, currency, amount_cents, amount_due_cents, hosted_invoice_url FROM payment_collection_obligations WHERE request_id = ? AND company_id = ? ORDER BY id",
            (rs, row) -> new InvoiceObligation(rs.getString(1), rs.getString(2), rs.getString(3), rs.getString(4), rs.getLong(5), rs.getLong(6), rs.getString(7)), requestId, companyId);
    }

    private CommercialOfferSelection selection(long companyId, long requestId) {
        var value = jdbc.queryForObject("SELECT selection_json FROM payment_collection_payment_states WHERE request_id = ? AND company_id = ?", String.class, requestId, companyId);
        try { return json.readValue(value, CommercialOfferSelection.class); }
        catch (JsonProcessingException | IllegalArgumentException invalid) { throw new IllegalStateException("The pinned payment selection is unavailable."); }
    }

    static boolean payableInvoice(StripeCollectionGateway.Invoice invoice, InvoiceObligation obligation, String mode) {
        return bound(invoice, obligation, mode) && "open".equals(invoice.status())
            && invoice.amountRemaining() != null && invoice.amountRemaining() > 0 && validInvoiceUrl(invoice.hostedInvoiceUrl());
    }

    static boolean settledInvoice(StripeCollectionGateway.Invoice invoice, InvoiceObligation obligation, String mode) {
        return bound(invoice, obligation, mode) && actuallyPaid(invoice);
    }

    static boolean settledActivation(StripeCollectionGateway.Invoice invoice, CommercialOfferSelection selection,
        String mode, String customerId, String subscriptionId, long requestId) {
        if (!actuallyPaid(invoice) || invoice.liveMode() != "LIVE".equals(mode)
            || !Objects.equals(customerId, invoice.customerId()) || !Objects.equals(subscriptionId, invoice.subscriptionId())
            || !"subscription_create".equals(invoice.billingReason()) || !selection.currency().equalsIgnoreCase(invoice.currency())
            || !Objects.equals(selection.subtotalAmountCents(), invoice.subtotal())
            || !Objects.equals(selection.estimatedAmountCents(), invoice.totalExcludingTax())
            || !Long.toString(requestId).equals(invoice.subscriptionMetadata().get("indice_payment_request"))) return false;
        var expected = selection.lineItems().stream().map(line -> line.externalPriceId() + ":" + line.quantity()).sorted().toList();
        var actual = invoice.lines().stream().map(line -> line.priceId() + ":" + line.quantity()).sorted().toList();
        return expected.equals(actual);
    }

    private static boolean bound(StripeCollectionGateway.Invoice invoice, InvoiceObligation obligation, String mode) {
        return Objects.equals(invoice.id(), obligation.invoiceId()) && Objects.equals(invoice.subscriptionId(), obligation.subscriptionId())
            && Objects.equals(invoice.customerId(), obligation.customerId()) && obligation.currency().equalsIgnoreCase(invoice.currency())
            && invoice.liveMode() == "LIVE".equals(mode) && obligation.amountCents() > 0
            && Objects.equals(invoice.amountDue(), obligation.invoiceAmountCents());
    }

    private static boolean actuallyPaid(StripeCollectionGateway.Invoice invoice) {
        return "paid".equals(invoice.status()) && invoice.amountDue() != null && invoice.amountDue() > 0
            && Objects.equals(invoice.amountPaid(), invoice.amountDue()) && Long.valueOf(0).equals(invoice.amountRemaining())
            && Long.valueOf(0).equals(invoice.amountPaidOffStripe());
    }

    private static boolean validInvoiceUrl(String value) {
        try {
            var uri = URI.create(value);
            return "https".equals(uri.getScheme()) && "invoice.stripe.com".equals(uri.getHost()) && uri.getUserInfo() == null;
        } catch (IllegalArgumentException | NullPointerException invalid) { return false; }
    }

    private String encode(Object value) {
        try { return json.writeValueAsString(value); }
        catch (JsonProcessingException invalid) { throw new IllegalStateException("The payment snapshot cannot be encoded."); }
    }
    private void requireMode(String expected) { if (!sameMode(expected)) throw new IllegalStateException("The payment request belongs to a different Stripe environment."); }
    private boolean sameMode(String expected) { return ("TEST".equals(expected) || "LIVE".equals(expected)) && expected.equals(mode()); }
    private String mode() { return upper(properties.getMode()); }
    private static String upper(String value) { return value == null ? "" : value.toUpperCase(Locale.ROOT); }
    private static Instant instant(Timestamp value) { return value == null ? null : value.toInstant(); }
    private static Instant latest(Instant first, Instant second) { return first == null ? second : second == null || first.isAfter(second) ? first : second; }
    private static void requireOutsideTransaction() {
        if (TransactionSynchronizationManager.isActualTransactionActive()) throw new IllegalStateException("Stripe collection verification cannot run inside a database transaction.");
    }

    public record Quote(String kind, long amountCents, String currency, String billingInterval, Long catalogVersionId,
        String sourceSubscriptionId, String sourceCustomerId, Instant paidThrough, Instant trialEndsAt,
        String stripeMode, String fingerprint, List<String> blockers, List<QuoteLine> lines,
        List<InvoiceObligation> invoices, @JsonIgnore CommercialOfferSelection selection) {}
    public record QuoteLine(String code, String label, long quantity, long unitAmountCents, long totalAmountCents) {}
    public record InvoiceObligation(String invoiceId, String subscriptionId, String customerId, String currency, long amountCents, long invoiceAmountCents, String hostedInvoiceUrl) {}
    public record PaymentLink(String url, Instant expiresAt) {}
    private record Request(String kind, String status, String mode) {}
    private record Intent(String sessionId, String customerId, String subscriptionId) {}
    private record Subscription(long id, String stripeId, String customerId, Long catalogVersion, String interval,
        String currency, int extraSeats, Instant trialEnd, Instant periodEnd, String status) {
        boolean external() { return stripeId != null && stripeId.startsWith("sub_"); }
    }
}
