package com.indice.erp.billing.signup;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;

import com.indice.erp.access.module.ModuleAccessService;
import com.indice.erp.billing.BillingHashing;
import com.indice.erp.billing.lifecycle.CommercialAccessRestrictedException;
import com.indice.erp.billing.lifecycle.CommercialLifecycleAccessService;
import java.sql.Timestamp;
import java.time.Duration;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest(properties = {
    "app.billing.signup.public-trial-enabled=true",
    "app.billing.provisioning.enabled=true",
    "app.billing.signup.email-verification.enabled=true",
    "app.billing.stripe.enabled=false",
    "app.billing.lifecycle.enabled=false"
})
@Transactional
@AutoConfigureMockMvc
class PublicTrialEntryIntegrationTest {
    @Autowired PublicTrialEntryService service;
    @Autowired JdbcTemplate jdbc;
    @Autowired CommercialLifecycleAccessService access;
    @Autowired ModuleAccessService modules;
    @Autowired PublicTrialEntryRateLimit rate;
    @Autowired com.indice.erp.billing.subscription.CompanySubscriptionService subscription;
    @Autowired com.indice.erp.billing.subscription.BillingActivationService activation;
    @Autowired com.indice.erp.billing.subscription.BillingProductSelectionService selection;
    @Autowired org.springframework.test.web.servlet.MockMvc mvc;
    @Autowired com.indice.erp.auth.SessionCsrfService csrf;
    @Autowired com.fasterxml.jackson.databind.ObjectMapper mapper;
    @MockitoBean BillingSignupEmailVerificationEmailService email;
    private final Map<String, String> codes = new HashMap<>();

    @BeforeEach void deliveredCodesOnlyInTestMemory() {
        when(email.sendVerification(anyString(), anyString(), anyString(), anyString(), anyInt())).thenAnswer(call -> {
            codes.put(call.getArgument(0), call.getArgument(3));
            return BillingSignupEmailVerificationEmailService.DeliveryResult.sentResult();
        });
    }

    @Test void provisionsMexicoAndCanadaWithoutAnyStripeIdentityAndLinksTheirRealLeads() {
        assertThat(service.config().enabled()).isTrue();
        assertThat(service.config().cardRequired()).isFalse();
        assertThat(service.config().paidActivationReady()).isFalse();
        for (var country : java.util.List.of("MX", "CA")) {
            var input = input(country);
            var key = BillingHashing.randomReference();
            var session = UUID.randomUUID().toString();
            var entry = service.start(input, key, session);
            assertThat(service.start(input, key, session).expiresAt()).isEqualTo(entry.expiresAt());
            var challenge = verified(entry.entryReference(), session, input.email());
            var result = service.activate(new PublicTrialEntryContracts.Activate(entry.entryReference(),
                challenge.verificationReference(), "Test-Only-Secure-Password1", true), session);
            assertThat(result.provisioned()).isTrue();
            assertThat(Duration.between(result.trialStartsAt(), result.trialEndsAt())).isEqualTo(Duration.ofDays(15));
            var row = jdbc.queryForMap("SELECT * FROM billing_trial_entries WHERE reference_hash = ?", BillingHashing.sha256(key));
            var companyId = ((Number) row.get("company_id")).longValue();
            var intentId = ((Number) row.get("signup_intent_id")).longValue();
            assertThatThrownBy(() -> jdbc.update("UPDATE billing_trial_entries SET trial_ends_at = NULL WHERE company_id = ?", companyId))
                .isInstanceOf(org.springframework.dao.DataAccessException.class).hasMessageContaining("chk_trial_entry_window");
            assertThat(row.get("reference_hash")).isNotEqualTo(key);
            assertThat(row.get("trial_terms_version")).isEqualTo("NO_CARD_15D_NO_CHARGE_V1");
            assertThat(jdbc.queryForObject("SELECT included_seats FROM company_seat_states WHERE company_id = ?", Integer.class, companyId)).isEqualTo(10);
            assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM company_billing_customers WHERE company_id = ?", Integer.class, companyId)).isZero();
            assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM company_billing_subscriptions WHERE company_id = ?", Integer.class, companyId)).isZero();
            assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM company_module_entitlements WHERE company_id = ?", Integer.class, companyId)).isGreaterThan(1);
            assertThat(jdbc.queryForMap("SELECT status, currency, estimated_amount_cents, stripe_customer_id, stripe_subscription_id FROM billing_signup_intents WHERE id = ?", intentId))
                .containsEntry("status", "TRIAL_VERIFIED").containsEntry("currency", "CA".equals(country) ? "CAD" : "MXN")
                .containsEntry("estimated_amount_cents", null).containsEntry("stripe_customer_id", null).containsEntry("stripe_subscription_id", null);
            assertThat(jdbc.queryForObject("SELECT status FROM platform_leads WHERE id = ?", String.class, row.get("lead_id"))).isEqualTo("TRIAL_ACTIVE");
            assertThat(jdbc.queryForObject("SELECT diagnosis_completed_at FROM platform_leads WHERE id = ?", Timestamp.class, row.get("lead_id"))).isNull();
            assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM platform_administrators a JOIN users u ON u.id = a.user_id WHERE u.email = ?", Integer.class, input.email())).isZero();
            assertThat(jdbc.queryForObject("""
                SELECT COUNT(*) FROM company_module_entitlements entitlement JOIN modules m ON m.slug = entitlement.module_slug
                WHERE entitlement.company_id = ? AND LOWER(m.lifecycle_status) <> 'released'
                """, Integer.class, companyId)).isZero();
            access.requireRead(companyId); access.requireWrite(companyId);
            assertThat(subscription.currentStatus(companyId).status()).isEqualTo("trialing");
            assertThat(subscription.currentStatus(companyId).accessAllowed()).isTrue();
            var replay = service.activate(new PublicTrialEntryContracts.Activate(entry.entryReference(), challenge.verificationReference(), "Test-Only-Secure-Password1", true), session);
            assertThat(replay.replayed()).isTrue();
            assertThat(replay.trialEndsAt()).isEqualTo(result.trialEndsAt());
            assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM users WHERE email = ?", Integer.class, input.email())).isEqualTo(1);
        }
    }

    @Test void rejectsUnverifiedEmailOtherBrowsersAndMissingConsentWithoutCreatingAnAccount() {
        var input = input("CA");
        var entry = service.start(input, BillingHashing.randomReference(), "test-browser-a");
        assertThatThrownBy(() -> service.startVerification(entry.entryReference(), "test-browser-b")).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> service.activate(new PublicTrialEntryContracts.Activate(entry.entryReference(), "a".repeat(64), "Test-Only-Secure-Password1", false), "test-browser-a")).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> service.activate(new PublicTrialEntryContracts.Activate(entry.entryReference(), "a".repeat(64), "Test-Only-Secure-Password1", true), "test-browser-a")).isInstanceOf(BillingSignupEmailVerificationException.class);
        assertThatThrownBy(() -> service.activate(new PublicTrialEntryContracts.Activate(entry.entryReference(), "a".repeat(64), "Test-Only-Secure-Password1", true), "test-browser-b")).isInstanceOf(IllegalArgumentException.class);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM users WHERE email = ?", Integer.class, input.email())).isZero();
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM billing_signup_intents WHERE email_normalized = ?", Integer.class, input.email())).isZero();
    }

    @Test void anonymousBrowserReachesRealPublicOwnerRoutesWithNativeInterceptorsAndCsrf() throws Exception {
        var session = new org.springframework.mock.web.MockHttpSession();
        var token = csrf.ensureCsrf(session);
        var input = input("CA");
        mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get("/api/v1/billing/signup/trial-entry/config").session(session))
            .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.status().isOk())
            .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath("$.enabled").value(true));
        mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post("/api/v1/billing/signup/trial-entry/interest")
                .session(session).header("Idempotency-Key", BillingHashing.randomReference())
                .header("X-CSRF-Token", token).contentType(org.springframework.http.MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(input)))
            .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.status().isCreated())
            .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath("$.entryReference").isNotEmpty());
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM platform_leads WHERE email = ?", Integer.class, input.email())).isEqualTo(1);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM users WHERE email = ?", Integer.class, input.email())).isZero();
    }

    @Test void bindsEmailProofToTheStoredLeadNotClientInput() {
        var first = input("CA"); var second = input("MX");
        var firstEntry = service.start(first, BillingHashing.randomReference(), "browser");
        var secondEntry = service.start(second, BillingHashing.randomReference(), "browser");
        var proof = verified(secondEntry.entryReference(), "browser", second.email());
        assertThatThrownBy(() -> service.activate(new PublicTrialEntryContracts.Activate(firstEntry.entryReference(), proof.verificationReference(), "Test-Only-Secure-Password1", true), "browser"))
            .isInstanceOf(BillingSignupEmailVerificationException.class);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM users WHERE email = ?", Integer.class, first.email())).isZero();
    }

    @Test void rejectsChangedIdempotencyPayloadAndExpiredContinuation() {
        var input = input("CA"); var key = BillingHashing.randomReference();
        var entry = service.start(input, key, "browser");
        assertThatThrownBy(() -> service.start(input("CA"), key, "browser")).isInstanceOf(BillingSignupConflictException.class);
        jdbc.update("UPDATE billing_trial_entries SET continuation_expires_at = ? WHERE reference_hash = ?",
            Timestamp.from(Instant.now().minusSeconds(1)), BillingHashing.sha256(entry.entryReference()));
        assertThatThrownBy(() -> service.startVerification(entry.entryReference(), "browser")).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> service.start(input, key, "browser")).isInstanceOf(IllegalArgumentException.class);
    }

    @Test void cannotVerifyOrResendAnotherLeadEmailChallenge() {
        var first = service.start(input("CA"), BillingHashing.randomReference(), "browser");
        var second = service.start(input("MX"), BillingHashing.randomReference(), "browser");
        var challenge = service.startVerification(second.entryReference(), "browser");
        var wrongBinding = new PublicTrialEntryContracts.VerifyCode(first.entryReference(), challenge.verificationReference(), "000000");
        assertThatThrownBy(() -> service.verify(wrongBinding, "browser", false)).isInstanceOf(BillingSignupEmailVerificationException.class);
        assertThatThrownBy(() -> service.verify(wrongBinding, "browser", true)).isInstanceOf(BillingSignupEmailVerificationException.class);
        assertThat(jdbc.queryForObject("SELECT attempt_count FROM billing_signup_email_verifications WHERE verification_reference = ?",
            Integer.class, challenge.verificationReference())).isZero();
    }

    @Test void newCohortCannotReachLegacyUsdQuotesOrCheckoutEvenDuringTheTrial() {
        var input = input("CA"); var key = BillingHashing.randomReference();
        var entry = service.start(input, key, "browser");
        var proof = verified(entry.entryReference(), "browser", input.email());
        service.activate(new PublicTrialEntryContracts.Activate(entry.entryReference(), proof.verificationReference(), "Test-Only-Secure-Password1", true), "browser");
        var companyId = jdbc.queryForObject("SELECT company_id FROM billing_trial_entries WHERE reference_hash = ?", Long.class, BillingHashing.sha256(key));
        assertThatThrownBy(() -> selection.current(companyId)).isInstanceOf(IllegalStateException.class).hasMessageContaining("Regional trial payment");
        assertThatThrownBy(() -> selection.preview(companyId, null)).isInstanceOf(IllegalStateException.class).hasMessageContaining("Regional trial payment");
        assertThatThrownBy(() -> selection.update(companyId, 1, "test-key", null)).isInstanceOf(IllegalStateException.class).hasMessageContaining("Regional trial payment");
        assertThatThrownBy(() -> activation.createCheckout(companyId, 1, "test-key", null)).isInstanceOf(IllegalStateException.class).hasMessageContaining("Regional trial payment");
        assertThatThrownBy(() -> activation.createCollectionCheckout(companyId, 1, "test-key", null, 1)).isInstanceOf(IllegalStateException.class).hasMessageContaining("Regional trial payment");
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM company_billing_selection_changes WHERE company_id = ?", Integer.class, companyId)).isZero();
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM company_billing_customers WHERE company_id = ?", Integer.class, companyId)).isZero();
    }

    @Test void activeButUnreleasedCoreModuleDoesNotBecomeAPublicTrialGrant() {
        var coreSlug = jdbc.queryForObject("""
            SELECT m.slug FROM modules m
            JOIN billing_product_capabilities capability ON BINARY capability.capability_code = BINARY m.slug
            JOIN billing_catalog_products product ON product.id = capability.product_id
            JOIN billing_catalog_versions version ON version.id = product.catalog_version_id
            WHERE product.product_type = 'CORE' AND product.active = 1 AND version.status = 'ACTIVE'
            LIMIT 1
            """, String.class);
        jdbc.update("UPDATE modules SET lifecycle_status = 'pilot' WHERE slug = ?", coreSlug);
        var input = input("CA"); var key = BillingHashing.randomReference();
        var entry = service.start(input, key, "browser");
        var proof = verified(entry.entryReference(), "browser", input.email());
        service.activate(new PublicTrialEntryContracts.Activate(entry.entryReference(), proof.verificationReference(), "Test-Only-Secure-Password1", true), "browser");
        var companyId = jdbc.queryForObject("SELECT company_id FROM billing_trial_entries WHERE reference_hash = ?", Long.class, BillingHashing.sha256(key));
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM company_module_entitlements WHERE company_id = ? AND module_slug = ?", Integer.class, companyId, coreSlug)).isZero();
        assertThat(jdbc.queryForObject("""
            SELECT COUNT(*) FROM user_company_module_roles role_row
            JOIN user_companies member ON member.id = role_row.user_company_id
            WHERE member.company_id = ? AND role_row.module_slug = ?
            """, Integer.class, companyId, coreSlug)).isZero();
    }

    @Test void expiredTrialBlocksBothReadsAndWritesEvenWithLegacyLifecycleSwitchOffAndDoesNotAffectOtherCompanies() {
        var input = input("CA"); var key = BillingHashing.randomReference();
        var entry = service.start(input, key, "browser");
        var proof = verified(entry.entryReference(), "browser", input.email());
        service.activate(new PublicTrialEntryContracts.Activate(entry.entryReference(), proof.verificationReference(), "Test-Only-Secure-Password1", true), "browser");
        var companyId = jdbc.queryForObject("SELECT company_id FROM billing_trial_entries WHERE reference_hash = ?", Long.class, BillingHashing.sha256(key));
        var entitledModule = jdbc.queryForObject("SELECT module_slug FROM company_module_entitlements WHERE company_id = ? LIMIT 1", String.class, companyId);
        assertThat(modules.companyCanAccess(companyId, entitledModule)).isTrue();
        var now = Instant.now();
        jdbc.update("UPDATE billing_trial_entries SET trial_starts_at = ?, trial_ends_at = ? WHERE company_id = ?",
            Timestamp.from(now.minus(16, ChronoUnit.DAYS)), Timestamp.from(now.minusSeconds(1)), companyId);
        assertThatThrownBy(() -> access.requireRead(companyId)).isInstanceOf(CommercialAccessRestrictedException.class);
        assertThatThrownBy(() -> access.requireWrite(companyId)).isInstanceOf(CommercialAccessRestrictedException.class);
        assertThat(modules.companyCanAccess(companyId, entitledModule)).isFalse();
        assertThat(subscription.currentStatus(companyId).accessAllowed()).isFalse();
        assertThat(subscription.currentStatus(companyId).lockReason()).isEqualTo("trial_expired");
        // A legacy/non-cohort company does not acquire the new hard-expiry policy.
        assertThatCode(() -> access.requireRead(Long.MAX_VALUE)).doesNotThrowAnyException();
        assertThatCode(() -> access.requireWrite(Long.MAX_VALUE)).doesNotThrowAnyException();
    }

    @Test void durableLimitCannotBeResetByChangingBrowserOrEmail() {
        var network = "test-network-" + UUID.randomUUID();
        for (int i = 0; i < 10; i++) assertThat(rate.consume(network)).isTrue();
        assertThat(rate.consume(network)).isFalse();
        assertThat(rate.consume(network)).isFalse();
    }

    private BillingSignupEmailVerificationResponse verified(String entry, String session, String emailAddress) {
        var challenge = service.startVerification(entry, session);
        var proof = service.verify(new PublicTrialEntryContracts.VerifyCode(entry, challenge.verificationReference(), codes.get(emailAddress)), session, false);
        assertThat(proof.verified()).isTrue();
        return proof;
    }

    private PublicTrialEntryContracts.Start input(String country) {
        var suffix = UUID.randomUUID().toString();
        var emailAddress = "entry-test-" + suffix + "@example.com";
        return new PublicTrialEntryContracts.Start("Entry Test Owner", "Entry Test " + suffix, emailAddress, emailAddress,
            null, country, "Organize our business", "CONTROLA", "test", "integration", "trial-entry", true);
    }
}
