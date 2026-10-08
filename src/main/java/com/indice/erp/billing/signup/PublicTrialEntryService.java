package com.indice.erp.billing.signup;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.indice.erp.billing.BillingHashing;
import com.indice.erp.billing.audit.BillingAuditService;
import com.indice.erp.billing.catalog.CommercialOfferSelectionService;
import com.indice.erp.platformadmin.leads.PlatformLeadContracts;
import com.indice.erp.platformadmin.leads.PlatformLeadService;
import com.indice.erp.support.PhoneNumberNormalizer;
import java.time.Clock;
import java.time.Duration;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.dao.PessimisticLockingFailureException;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

@Service
public class PublicTrialEntryService {
    private final boolean enabled;
    private final PublicTrialEntryRepository entries;
    private final PlatformLeadService leads;
    private final CommercialOfferSelectionService offers;
    private final BillingSignupIntentRepository intents;
    private final BillingTenantProvisioningService provisioning;
    private final BillingSignupEmailVerificationService verification;
    private final BillingSignupEmailVerificationProperties verificationProperties;
    private final BCryptPasswordEncoder passwords;
    private final BillingAuditService audit;
    private final ObjectMapper mapper;
    private final Clock clock;
    private final TransactionTemplate transaction;
    private final PublicTrialPaymentService payments;

    public PublicTrialEntryService(boolean enabled,
        PublicTrialEntryRepository entries, PlatformLeadService leads, CommercialOfferSelectionService offers,
        BillingSignupIntentRepository intents, BillingTenantProvisioningService provisioning,
        BillingSignupEmailVerificationService verification, BillingSignupEmailVerificationProperties verificationProperties,
        BCryptPasswordEncoder passwords, BillingAuditService audit, ObjectMapper mapper, Clock clock,
        PlatformTransactionManager transactionManager) {
        this(enabled, entries, leads, offers, intents, provisioning, verification, verificationProperties,
            passwords, audit, mapper, clock, transactionManager, null);
    }

    @org.springframework.beans.factory.annotation.Autowired
    public PublicTrialEntryService(@Value("${app.billing.signup.public-trial-enabled:false}") boolean enabled,
        PublicTrialEntryRepository entries, PlatformLeadService leads, CommercialOfferSelectionService offers,
        BillingSignupIntentRepository intents, BillingTenantProvisioningService provisioning,
        BillingSignupEmailVerificationService verification, BillingSignupEmailVerificationProperties verificationProperties,
        BCryptPasswordEncoder passwords, BillingAuditService audit, ObjectMapper mapper, Clock clock,
        PlatformTransactionManager transactionManager, PublicTrialPaymentService payments) {
        this.enabled = enabled; this.entries = entries; this.leads = leads; this.offers = offers;
        this.intents = intents; this.provisioning = provisioning; this.verification = verification;
        this.verificationProperties = verificationProperties; this.passwords = passwords;
        this.audit = audit; this.mapper = mapper; this.clock = clock;
        this.transaction = new TransactionTemplate(transactionManager);
        this.payments = payments;
    }

    public PublicTrialEntryContracts.Config config() {
        return new PublicTrialEntryContracts.Config(ready(), 15, 10, false,
            payments != null && payments.publicReady(), List.of("MX", "CA"));
    }

    private boolean ready() { return enabled && provisioning.enabled() && verificationProperties.isEnabled(); }

    private void requireEnabled() {
        if (!ready()) throw new IllegalStateException("Public trial entry is not enabled.");
    }

    public PublicTrialEntryContracts.Continuation start(PublicTrialEntryContracts.Start request, String key, String sessionId) {
        requireEnabled();
        if (!BillingSignupEmailVerificationInput.validReference(key)) {
            throw new IllegalArgumentException("A 32-byte hexadecimal Idempotency-Key is required.");
        }
        if (request == null) throw new IllegalArgumentException("Trial entry is required.");
        if (request.fullName() == null || request.fullName().trim().length() > 100
            || request.companyName() == null || request.companyName().trim().length() > 120) {
            throw new IllegalArgumentException("Invalid name or company name.");
        }
        var identity = BillingSignupEmailVerificationInput.validateStart(new BillingSignupEmailVerificationStartRequest(
            request.fullName(), request.email(), request.confirmEmail(), request.companyName()));
        var country = request.countryCode() == null ? "" : request.countryCode().trim().toUpperCase(Locale.ROOT);
        if (!List.of("MX", "CA").contains(country)) throw new IllegalArgumentException("Choose Mexico or Canada.");
        var input = new PlatformLeadContracts.Submission(identity.fullName(), identity.companyName(), identity.email(),
            PhoneNumberNormalizer.normalizeOptional(request.phone(), country), country, request.challenge(),
            "/start", "WEBSITE", request.utmSource(), request.utmMedium(), request.utmCampaign(),
            request.planInterest(), request.contactConsent());
        var fingerprint = BillingHashing.sha256(json(input));
        var sessionHash = sessionHash(sessionId);
        var keyHash = BillingHashing.sha256("public-trial-entry:" + sessionHash + ":" + key);
        return retry(() -> transaction.execute(status -> {
            var existing = entries.lockByRequest(keyHash);
            if (existing != null) {
                if (!existing.fingerprint().equals(fingerprint) || !existing.sessionHash().equals(sessionHash)) {
                    throw new BillingSignupConflictException("Entry request was already used with other data.");
                }
                requireFresh(existing);
                return new PublicTrialEntryContracts.Continuation(key, existing.expiresAt());
            }
            var leadId = leads.captureSelfServiceInterest(UUID.randomUUID().toString(), fingerprint, input);
            // Match DATETIME(6) before returning the first receipt. Linux clocks can carry
            // nanoseconds; a replay must return exactly the persisted microsecond deadline.
            var expiresAt = clock.instant().plus(Duration.ofHours(24)).truncatedTo(java.time.temporal.ChronoUnit.MICROS);
            entries.insert(BillingHashing.sha256(key), sessionHash, keyHash, fingerprint, leadId, country, expiresAt);
            audit.record("SIGNUP", "TRIAL_INTEREST_CAPTURED", "SUCCESS", keyHash, null, null, null, null,
                Map.of("countryCode", country, "policy", "VERIFIED_NO_CARD_15D_V1"));
            return new PublicTrialEntryContracts.Continuation(key, expiresAt);
        }));
    }

    public PublicTrialEntryContracts.Result activate(PublicTrialEntryContracts.Activate request, String sessionId) {
        requireEnabled();
        if (request == null || !BillingSignupEmailVerificationInput.validReference(request.entryReference())
            || !request.acceptedTrialTerms()) throw new IllegalArgumentException("Accept the trial terms before continuing.");
        var sessionHash = sessionHash(sessionId);
        return retry(() -> transaction.execute(status -> {
            var entry = entries.lockByReference(BillingHashing.sha256(request.entryReference()));
            if (entry == null || !entry.sessionHash().equals(sessionHash)) {
                throw new IllegalArgumentException("Trial entry is unavailable. Start again in the same browser.");
            }
            if (entry.companyId() != null) return result(entry, true);
            requireFresh(entry);
            var lead = leads.selfServiceInterest(entry.leadId());
            var verified = verification.requireVerified(lead.email(), request.emailVerificationReference());
            var selection = offers.selectPublicTrial(entry.countryCode());
            var signup = new BillingSignupRequest(lead.fullName(), lead.email(), lead.email(), request.password(),
                lead.companyName(), entry.countryCode(), lead.phone(), null, null, "MONTH", 0,
                selection.products().stream().map(p -> p.code()).toList(), null, verified.verificationReference());
            var keyHash = BillingHashing.sha256("verified-trial-account:" + entry.id());
            BillingSignupService.validate(signup, keyHash);
            // Never store the raw password or the continuation capability in fingerprint material.
            var fingerprint = BillingHashing.sha256(json(Map.of("entryId", entry.id(),
                "passwordHash", BillingHashing.sha256(request.password()), "policy", "VERIFIED_NO_CARD_15D_V1")));
            var intent = intents.createOrLoad(BillingHashing.randomReference(), keyHash, fingerprint, signup,
                verified.email(), passwords.encode(request.password()), selection,
                verified.verificationReference(), verified.verifiedAt());
            entries.bindIntent(entry.id(), sessionHash, intent.id());
            intents.markVerifiedTrial(intent.id(), clock.instant());
            var provisioned = provisioning.provisionIfEligible(intent.id());
            if (!provisioned.provisioned()) {
                return new PublicTrialEntryContracts.Result(false, "REQUIRES_REVIEW".equals(provisioned.status()),
                    false, null, null, "/login");
            }
            var spec = intents.lockProvisioningSpec(intent.id());
            var startsAt = spec.completedAt();
            var endsAt = startsAt.plus(Duration.ofDays(15));
            entries.activate(entry.id(), sessionHash, intent.id(), provisioned.companyId(), startsAt, endsAt);
            leads.recordSelfServiceTrial(entry.leadId(), verified.email(), startsAt, endsAt);
            return result(entries.lockByReference(BillingHashing.sha256(request.entryReference())), false);
        }));
    }

    public BillingSignupEmailVerificationResponse startVerification(String reference, String sessionId) {
        requireEnabled();
        if (!BillingSignupEmailVerificationInput.validReference(reference)) {
            throw new IllegalArgumentException("Trial entry is required.");
        }
        return transaction.execute(status -> {
            var entry = entries.lockByReference(BillingHashing.sha256(reference));
            if (entry == null || !entry.sessionHash().equals(sessionHash(sessionId)) || entry.companyId() != null) {
                throw new IllegalArgumentException("Trial entry is unavailable.");
            }
            requireFresh(entry);
            var lead = leads.selfServiceInterest(entry.leadId());
            return verification.start(new BillingSignupEmailVerificationStartRequest(
                lead.fullName(), lead.email(), lead.email(), lead.companyName()));
        });
    }

    public BillingSignupEmailVerificationResponse verify(PublicTrialEntryContracts.VerifyCode input, String sessionId,
        boolean resend) {
        requireEnabled();
        if (input == null || !BillingSignupEmailVerificationInput.validReference(input.entryReference())) {
            throw new IllegalArgumentException("Trial entry is required.");
        }
        return transaction.execute(status -> {
            var entry = entries.lockByReference(BillingHashing.sha256(input.entryReference()));
            if (entry == null || !entry.sessionHash().equals(sessionHash(sessionId)) || entry.companyId() != null) {
                throw new IllegalArgumentException("Trial entry is unavailable.");
            }
            requireFresh(entry);
            verification.requireOwnedChallenge(leads.selfServiceInterest(entry.leadId()).email(), input.verificationReference());
            return resend
                ? verification.resend(new BillingSignupEmailVerificationResendRequest(input.verificationReference()))
                : verification.verify(new BillingSignupEmailVerificationVerifyRequest(input.verificationReference(), input.otpCode()));
        });
    }

    private PublicTrialEntryContracts.Result result(PublicTrialEntryRepository.Entry entry, boolean replayed) {
        return new PublicTrialEntryContracts.Result(true, false, replayed, entry.startsAt(), entry.endsAt(), "/login");
    }

    private void requireFresh(PublicTrialEntryRepository.Entry entry) {
        if (!entry.expiresAt().isAfter(clock.instant())) throw new IllegalArgumentException("Trial entry expired. Start again.");
    }

    private String sessionHash(String sessionId) {
        if (sessionId == null || sessionId.isBlank()) throw new IllegalArgumentException("A browser session is required.");
        return BillingHashing.sha256(sessionId);
    }

    private String json(Object value) {
        try { return mapper.writeValueAsString(value); }
        catch (JsonProcessingException failure) { throw new IllegalStateException("Trial entry could not be prepared."); }
    }

    private <T> T retry(java.util.function.Supplier<T> operation) {
        for (int attempt = 1; ; attempt++) {
            try { return operation.get(); }
            catch (DuplicateKeyException | PessimisticLockingFailureException retryable) {
                if (attempt >= 3) throw new BillingSignupConflictException("Trial entry is busy. Please retry.");
            }
        }
    }
}
