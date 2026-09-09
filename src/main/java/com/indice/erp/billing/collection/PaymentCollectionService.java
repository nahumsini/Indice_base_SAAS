package com.indice.erp.billing.collection;

import static com.indice.erp.billing.collection.PaymentCollectionContracts.*;

import com.indice.erp.platformadmin.PlatformAdminAccessService;
import com.indice.erp.platformadmin.PlatformAuditService;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Clock;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;

@Service
public class PaymentCollectionService {
    private final PaymentCollectionRepository repository;
    private final PaymentCollectionPaymentService payments;
    private final PaymentCollectionConversionService conversions;
    private final PaymentRequestReminderService reminders;
    private final PaymentCollectionAccessService access;
    private final PlatformAdminAccessService administrators;
    private final PlatformAuditService audit;
    private final TransactionTemplate transactions;
    private final Clock clock;
    private final boolean enabled;
    private final boolean workersReady;

    public PaymentCollectionService(PaymentCollectionRepository repository, PaymentCollectionPaymentService payments,
                                    PaymentCollectionConversionService conversions,
                                    PaymentRequestReminderService reminders, PaymentCollectionAccessService access,
                                    PlatformAdminAccessService administrators, PlatformAuditService audit,
                                    TransactionTemplate transactions, Clock clock,
                                    @Value("${app.billing.collection.enabled:false}") boolean enabled,
                                    @Value("${app.billing.collection.reminders-enabled:false}") boolean remindersEnabled,
                                    @Value("${app.billing.collection.email-enabled:false}") boolean emailEnabled,
                                    @Value("${app.billing.collection.reconciliation-enabled:false}") boolean reconciliationEnabled) {
        this.repository = repository; this.payments = payments; this.conversions = conversions; this.reminders = reminders; this.access = access;
        this.administrators = administrators; this.audit = audit; this.transactions = transactions; this.clock = clock;
        this.enabled = enabled; this.workersReady = remindersEnabled && emailEnabled && reconciliationEnabled;
    }

    public Workspace workspace(long companyId, long actorId) {
        requireRoot(actorId);
        var company = repository.company(companyId, false);
        var owner = repository.owner(companyId);
        var current = repository.latest(companyId, false);
        var blockers = eligibility(companyId, company, owner);
        PaymentCollectionPaymentService.Quote quote = null;
        if (current == null || !current.open()) {
            if (blockers.isEmpty()) {
                quote = payments.quote(companyId);
                blockers.addAll(quote.blockers());
            }
        } else blockers.add("REQUEST_ALREADY_OPEN");
        var displayQuote = quote == null ? null : new Quote(quote.kind(), quote.amountCents(), quote.currency(),
            quote.billingInterval(), quote.paidThrough(), quote.fingerprint(), "ACTIVATION".equals(quote.kind()));
        return new Workspace(companyId, company.name(), owner == null ? null : new Owner(owner.name(), owner.email()),
            access.requestView(current), displayQuote, blockers.isEmpty(), List.copyOf(blockers),
            current == null ? List.of() : repository.deliveries(companyId, current.id()),
            current == null ? List.of() : repository.history(companyId, current.id()));
    }

    public Workspace start(long companyId, long actorId, String idempotencyKey, Start input) {
        requireRoot(actorId);
        var reason = reason(input == null ? null : input.reason());
        var token = input.expectedQuoteToken();
        if (token == null || !token.matches("[a-fA-F0-9]{64}")) throw new IllegalArgumentException("Review the current payment quote first.");
        var key = eventKey(companyId, actorId, "STARTED", idempotencyKey);
        var fingerprint = hash(reason + "\n" + token);
        // A replay succeeds even if publication, provider availability or rollout switches changed afterward.
        if (repository.replay(companyId, key, fingerprint) != null) return workspace(companyId, actorId);
        var blockers = eligibility(companyId, repository.company(companyId, false), repository.owner(companyId));
        if (!blockers.isEmpty()) throw conflict("REQUEST_NOT_READY", String.join(", ", blockers));
        var quote = payments.quote(companyId); // Provider IO is deliberately outside the transaction.
        if (!quote.blockers().isEmpty()) throw conflict("REQUEST_NOT_READY", String.join(", ", quote.blockers()));
        if (!token.equals(quote.fingerprint())) throw conflict("QUOTE_CHANGED", "The payable amount changed. Review the updated quote.");
        transactions.executeWithoutResult(tx -> {
            var company = repository.company(companyId, true);
            if (repository.replay(companyId, key, fingerprint) != null) return;
            requireRoot(actorId);
            var owner = repository.owner(companyId);
            var currentBlockers = eligibility(companyId, company, owner);
            if (!currentBlockers.isEmpty()) throw conflict("REQUEST_NOT_READY", String.join(", ", currentBlockers));
            var existing = repository.latest(companyId, true);
            if (existing != null && existing.open()) throw conflict("REQUEST_ALREADY_OPEN", "A payment request is already open for this company.");
            var now = clock.instant();
            var id = repository.insert(companyId, actorId, UUID.randomUUID().toString().replace("-", ""),
                reason, owner, quote, now, now.plus(7, ChronoUnit.DAYS));
            payments.persistObligations(companyId, id, quote);
            var row = repository.find(companyId, id, true);
            repository.event(row, "STARTED", actorId, reason, key, fingerprint, now);
            reminders.enqueueWindow(companyId, id);
            audit.record(actorId, "PAYMENT_REQUEST_STARTED", "COMPANY", row.reference(), companyId, "SUCCESS",
                Map.of("request_id", id, "deadline_at", row.deadline().toString(), "amount_cents", row.amountCents(), "currency", row.currency()));
        });
        return workspace(companyId, actorId);
    }

    public Workspace extend(long companyId, long actorId, String idempotencyKey, Extend input) {
        requireRoot(actorId);
        var reason = reason(input == null ? null : input.reason());
        var version = input.expectedVersion();
        if (version < 1) throw new IllegalArgumentException("Review the current request before extending it.");
        var key = eventKey(companyId, actorId, "EXTENDED", idempotencyKey);
        var reference = input.expectedRequestId();
        if (reference == null || !reference.matches("[a-fA-F0-9]{32}")) throw new IllegalArgumentException("The reviewed payment request ID is required.");
        var fingerprint = hash(reason + "\n" + version + "\n" + reference);
        transactions.executeWithoutResult(tx -> {
            repository.company(companyId, true);
            if (repository.replay(companyId, key, fingerprint) != null) return;
            requireRoot(actorId);
            var row = repository.latest(companyId, true);
            if (row == null || !row.open()) throw conflict("NO_OPEN_REQUEST", "There is no open payment request to extend.");
            if (row.version() != version || !row.reference().equals(reference)) throw conflict("REQUEST_CHANGED", "The payment request changed. Refresh before extending it.");
            var now = clock.instant();
            var deadline = now.plus(7, ChronoUnit.DAYS);
            var currentView = access.requestView(row);
            if (currentView.protectedIndefinitely() || !deadline.isAfter(currentView.deadlineAt())) {
                throw conflict("EXTENSION_NOT_LATER", "The company already has access beyond this proposed extension. Review its current benefit or deadline.");
            }
            repository.extend(row, reason, now, deadline);
            var updated = repository.find(companyId, row.id(), true);
            repository.event(updated, "EXTENDED", actorId, reason, key, fingerprint, now);
            reminders.enqueueWindow(companyId, row.id());
            audit.record(actorId, "PAYMENT_REQUEST_EXTENDED", "COMPANY", row.reference(), companyId, "SUCCESS",
                Map.of("request_id", row.id(), "deadline_at", deadline.toString(), "window_version", updated.version()));
        });
        return workspace(companyId, actorId);
    }

    public Recovery recovery(long companyId, long userId) {
        repository.requireMember(companyId, userId);
        var row = repository.latest(companyId, false);
        var owner = repository.owner(companyId);
        var isOwner = owner != null && owner.userId() == userId;
        var view = access.requestView(row);
        return new Recovery(view, isOwner && row != null && row.open() && !view.protectedIndefinitely(),
            access.access(companyId) == PaymentCollectionAccessService.Access.PAYMENT_ONLY,
            owner == null ? null : owner.name(), isOwner ? owner.email() : null, isOwner);
    }

    public PaymentCollectionPaymentService.PaymentLink pay(long companyId, long userId, String key, Pay input) {
        requireOwner(companyId, userId);
        eventKey(companyId, userId, "PAY", key); // Validate retry key before creating a provider session.
        var row = repository.latest(companyId, false);
        if (row == null || !row.open()) throw conflict("NO_OPEN_REQUEST", "There is no open payment request.");
        if (access.requestView(row).protectedIndefinitely()) throw conflict("PAYMENT_PROTECTED", "An existing benefit keeps this company active; the payment request is paused.");
        if (input == null || !row.reference().equals(input.expectedRequestId()) || row.version() != input.expectedVersion()) {
            throw conflict("REQUEST_CHANGED", "The payment request changed. Review it before paying.");
        }
        return payments.paymentUrl(companyId, row.id(), userId, key);
    }

    public Recovery refresh(long companyId, long userId) {
        requireOwner(companyId, userId);
        var row = repository.latest(companyId, false);
        if (row != null && row.open()) reconcile(companyId, row.id());
        return recovery(companyId, userId);
    }

    /** Provider verification never runs under the case lock. Only this exact immutable obligation can close it. */
    public void reconcile(long companyId, long requestId) {
        if (!payments.reconcile(companyId, requestId)) return;
        transactions.executeWithoutResult(tx -> {
            repository.company(companyId, true);
            var row = repository.find(companyId, requestId, true);
            if (row == null || !row.open()) return;
            repository.markPaid(row, clock.instant());
            conversions.completeVerifiedActivation(companyId, requestId);
            repository.event(row, "PAID", null, "Verified payment of the bound Stripe obligation.",
                hash("PAID:" + companyId + ":" + requestId), null, clock.instant());
        });
    }

    private ArrayList<String> eligibility(long companyId, PaymentCollectionRepository.Company company, PaymentCollectionRepository.OwnerRow owner) {
        var blockers = new ArrayList<String>();
        if (!enabled || !workersReady || !reminders.isEmailConfigured()) blockers.add("COLLECTION_NOT_ENABLED");
        if (!"ACTIVE".equals(company.status()) || company.publicDemo()) blockers.add("COMPANY_NOT_ELIGIBLE");
        if (owner == null || owner.email() == null || owner.email().isBlank()) blockers.add("BILLING_OWNER_REQUIRED");
        if (repository.independentHold(companyId)) blockers.add("INDEPENDENT_ACCOUNT_HOLD");
        return blockers;
    }
    private void requireOwner(long companyId, long userId) {
        repository.requireMember(companyId, userId);
        var owner = repository.owner(companyId);
        if (owner == null || owner.userId() != userId) throw new SecurityException("Only the billing owner can pay or reconcile this request.");
    }
    private void requireRoot(long actorId) {
        if (!"PLATFORM_ROOT".equals(administrators.require(actorId, "BILLING_MANAGE").role())) throw new SecurityException("Platform Root access is required.");
    }
    private static String reason(String value) {
        if (value == null || value.isBlank() || value.trim().length() > 1000) throw new IllegalArgumentException("A reason of 1 to 1000 characters is required.");
        return value.trim();
    }
    private static String eventKey(long companyId, long actorId, String action, String key) {
        if (key == null || !key.matches("[A-Za-z0-9._:-]{8,128}")) throw new IllegalArgumentException("A valid Idempotency-Key is required.");
        return hash(companyId + ":" + actorId + ":" + action + ":" + key);
    }
    static String hash(String value) {
        try { return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8))); }
        catch (NoSuchAlgorithmException impossible) { throw new IllegalStateException("SHA-256 unavailable", impossible); }
    }
    private static PaymentCollectionException conflict(String code, String message) { return new PaymentCollectionException(code, message); }
}
