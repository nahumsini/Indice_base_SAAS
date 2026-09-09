package com.indice.erp.billing.collection;

import static com.indice.erp.billing.collection.PaymentCollectionContracts.*;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.indice.erp.platformadmin.PlatformAdminAccessService;
import com.indice.erp.platformadmin.PlatformAdminForbiddenException;
import com.indice.erp.platformadmin.PlatformAuditService;
import com.indice.erp.platformadmin.PlatformAdminService;
import com.indice.erp.entitlement.CompanyEntitlementProjectionService;
import java.sql.Timestamp;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;

@SpringBootTest(properties = {
    "app.billing.collection.enabled=false",
    "app.billing.collection.reminders-enabled=false",
    "app.billing.collection.email-enabled=false",
    "app.billing.collection.reconciliation-enabled=false",
    "app.email.enabled=false"
})
@Transactional
class PaymentCollectionServiceIntegrationTest {
    private static final String TOKEN = "a".repeat(64);
    @Autowired private JdbcTemplate jdbc;
    @Autowired private PaymentCollectionRepository repository;
    @Autowired private PaymentCollectionConversionService conversions;
    @Autowired private CompanyEntitlementProjectionService entitlements;
    @Autowired private PlatformAdminService productAccess;
    @Autowired private PaymentRequestReminderService reminders;
    @Autowired private PlatformAdminAccessService administrators;
    @Autowired private PlatformAuditService audit;
    @Autowired private TransactionTemplate transactions;
    private PaymentCollectionPaymentService payments;
    private PaymentRequestReminderService readyReminders;
    private PaymentCollectionAccessService access;
    private PaymentCollectionService service;
    private MutableClock clock;
    private long rootId;

    @BeforeEach
    void setUp() {
        clock = new MutableClock(Instant.parse("2026-09-08T12:00:00Z"));
        payments = mock(PaymentCollectionPaymentService.class);
        when(payments.quote(anyLong())).thenReturn(quote(TOKEN));
        readyReminders = mock(PaymentRequestReminderService.class);
        when(readyReminders.isEmailConfigured()).thenReturn(true);
        doAnswer(invocation -> {
            reminders.enqueueWindow(invocation.getArgument(0), invocation.getArgument(1));
            return null;
        }).when(readyReminders).enqueueWindow(anyLong(), anyLong());
        access = new PaymentCollectionAccessService(jdbc, clock, new PaymentCollectionProtectionService(jdbc, clock));
        service = service(true, true, true, true);
        rootId = user("Root");
        jdbc.update("""
            INSERT INTO platform_administrators(user_id, platform_role, status, mfa_required, created_by_user_id)
            VALUES (?, 'PLATFORM_ROOT', 'ACTIVE', 1, ?)
            """, rootId, rootId);
    }

    @Test
    void onlyActualPlatformRootMayOpenTheWorkspaceOrCreateARequest() {
        var company = company();
        var support = user("Support");
        jdbc.update("""
            INSERT INTO platform_administrators(user_id, platform_role, status, mfa_required, created_by_user_id)
            VALUES (?, 'PLATFORM_SUPPORT', 'ACTIVE', 1, ?)
            """, support, rootId);
        var adminId = jdbc.queryForObject("SELECT id FROM platform_administrators WHERE user_id = ?", Long.class, support);
        jdbc.update("INSERT INTO platform_administrator_permissions(platform_administrator_id, permission_code) VALUES (?, 'BILLING_MANAGE')", adminId);
        assertThatThrownBy(() -> service.workspace(company.id(), support)).isInstanceOf(SecurityException.class);
        assertThatThrownBy(() -> service.start(company.id(), support, "support-start", new Start("Follow up", TOKEN)))
            .isInstanceOf(SecurityException.class);
        assertThatThrownBy(() -> service.workspace(company.id(), company.ownerId()))
            .isInstanceOf(PlatformAdminForbiddenException.class);
        assertThatThrownBy(() -> service.workspace(company.id(), 0))
            .isInstanceOf(PlatformAdminForbiddenException.class);
        assertThat(requestCount(company.id())).isZero();
        verifyNoInteractions(payments);
    }

    @Test
    void startPinsTheReviewedQuoteAndOwnerAndQueuesSevenDaysPerChannelAtomically() {
        var company = company();
        var workspace = start(company, "initial-start");
        var row = repository.latest(company.id(), false);
        assertThat(workspace.request().status()).isEqualTo("OPEN");
        assertThat(workspace.request().amountCents()).isEqualTo(9900);
        assertThat(workspace.request().currency()).isEqualTo("USD");
        assertThat(workspace.request().deadlineAt()).isEqualTo(clock.instant().plus(7, ChronoUnit.DAYS));
        assertThat(workspace.owner().email()).isEqualTo(company.email());
        assertThat(deliveries(company.id(), "PENDING")).isEqualTo(14);
        assertThat(events(company.id(), "STARTED")).isEqualTo(1);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM platform_audit_events WHERE company_id = ? AND action_code = 'PAYMENT_REQUEST_STARTED'",
            Integer.class, company.id())).isEqualTo(1);
        verify(payments).persistObligations(company.id(), row.id(), quote(TOKEN));
    }

    @Test
    void matchingRetryDoesNotRequoteOrDuplicateTheRequestAndSurvivesDisabledRollout() {
        var company = company();
        var first = start(company, "same-start-key");
        var second = service(false, false, false, false).start(company.id(), rootId, "same-start-key", new Start("Payment follow up", TOKEN));
        assertThat(second.request().id()).isEqualTo(first.request().id());
        assertThat(requestCount(company.id())).isEqualTo(1);
        assertThat(events(company.id(), "STARTED")).isEqualTo(1);
        assertThat(deliveries(company.id(), "PENDING")).isEqualTo(14);
        verify(payments, times(1)).quote(company.id());
        verify(payments, times(1)).persistObligations(anyLong(), anyLong(), any());
    }

    @Test
    void retryKeyCannotBeReusedWithDifferentReviewedContent() {
        var company = company();
        start(company, "conflicting-key");
        assertThatThrownBy(() -> service.start(company.id(), rootId, "conflicting-key", new Start("Different reason", TOKEN)))
            .isInstanceOfSatisfying(PaymentCollectionException.class, failure -> assertThat(failure.code()).isEqualTo("IDEMPOTENCY_CONFLICT"));
        assertThat(requestCount(company.id())).isEqualTo(1);
        assertThat(events(company.id(), "STARTED")).isEqualTo(1);
    }

    @Test
    void staleQuoteCannotCreateAnUnreviewedChargeRequest() {
        var company = company();
        assertThat(service.workspace(company.id(), rootId).quote().token()).isEqualTo(TOKEN);
        when(payments.quote(company.id())).thenReturn(quote("b".repeat(64)));
        assertThatThrownBy(() -> service.start(company.id(), rootId, "stale-quote-key", new Start("Payment follow up", TOKEN)))
            .isInstanceOfSatisfying(PaymentCollectionException.class, failure -> assertThat(failure.code()).isEqualTo("QUOTE_CHANGED"));
        assertThat(requestCount(company.id())).isZero();
        assertThat(deliveries(company.id(), null)).isZero();
    }

    @Test
    void workersMustBeReadyBeforeOpeningANewCase() {
        var company = company();
        assertThatThrownBy(() -> service(true, true, false, true).start(company.id(), rootId, "workers-not-ready", new Start("Payment follow up", TOKEN)))
            .isInstanceOfSatisfying(PaymentCollectionException.class, failure -> assertThat(failure.code()).isEqualTo("REQUEST_NOT_READY"));
        assertThat(requestCount(company.id())).isZero();
        verifyNoInteractions(payments);
    }

    @Test
    void enabledFlagsDoNotPermitCollectionWithoutConfiguredReminderEmail() {
        var company = company();
        when(readyReminders.isEmailConfigured()).thenReturn(false);
        assertThatThrownBy(() -> service.start(company.id(), rootId, "email-not-configured", new Start("Payment follow up", TOKEN)))
            .isInstanceOfSatisfying(PaymentCollectionException.class, failure -> assertThat(failure.code()).isEqualTo("REQUEST_NOT_READY"));
        assertThat(requestCount(company.id())).isZero();
        verifyNoInteractions(payments);
    }

    @Test
    void exactDeadlineRestrictsAnEnrolledShadowCompanyWithoutAnyWorkerOrFlag() {
        var company = company();
        jdbc.update("INSERT INTO company_entitlement_policies(company_id, mode, reason) VALUES (?, 'SHADOW', 'Collection test')", company.id());
        start(company, "deadline-test");
        clock.advance(7 * 86400 - 1, ChronoUnit.SECONDS);
        assertThat(access.access(company.id())).isEqualTo(PaymentCollectionAccessService.Access.GRACE);
        clock.advance(1, ChronoUnit.SECONDS);
        assertThat(access.access(company.id())).isEqualTo(PaymentCollectionAccessService.Access.PAYMENT_ONLY);
        var recovery = service(false, false, false, false).recovery(company.id(), company.ownerId());
        assertThat(recovery.collectionBlocked()).isTrue();
        assertThat(recovery.canPay()).isTrue();
        assertThat(jdbc.queryForObject("SELECT status FROM user_companies WHERE company_id = ? AND user_id = ?", String.class,
            company.id(), company.ownerId())).isEqualTo("active");
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM company_commercial_states WHERE company_id = ?", Integer.class, company.id())).isZero();
    }

    @Test
    void extensionRestartsSevenDaysAndRestoresOnlyTheCollectionGracePeriod() {
        var company = company();
        var first = start(company, "extend-start");
        clock.advance(8, ChronoUnit.DAYS);
        assertThat(access.access(company.id())).isEqualTo(PaymentCollectionAccessService.Access.PAYMENT_ONLY);
        var extended = service.extend(company.id(), rootId, "extend-once", new Extend("Seven additional days", 1, first.request().id()));
        assertThat(extended.request().version()).isEqualTo(2);
        assertThat(extended.request().deadlineAt()).isEqualTo(clock.instant().plus(7, ChronoUnit.DAYS));
        assertThat(access.access(company.id())).isEqualTo(PaymentCollectionAccessService.Access.GRACE);
        assertThat(deliveries(company.id(), "SKIPPED")).isEqualTo(14);
        assertThat(deliveries(company.id(), "PENDING")).isEqualTo(14);
        service.extend(company.id(), rootId, "extend-once", new Extend("Seven additional days", 1, first.request().id()));
        assertThat(events(company.id(), "EXTENDED")).isEqualTo(1);
        assertThat(deliveries(company.id(), null)).isEqualTo(28);
    }

    @Test
    void staleVersionCannotExtendTheUpdatedRequestAgain() {
        var company = company();
        var first = start(company, "stale-version-start");
        clock.advance(1, ChronoUnit.DAYS);
        service.extend(company.id(), rootId, "first-extension", new Extend("First extension", 1, first.request().id()));
        clock.advance(1, ChronoUnit.DAYS);
        assertThatThrownBy(() -> service.extend(company.id(), rootId, "stale-extension", new Extend("Stale extension", 1, first.request().id())))
            .isInstanceOfSatisfying(PaymentCollectionException.class, failure -> assertThat(failure.code()).isEqualTo("REQUEST_CHANGED"));
        assertThat(repository.latest(company.id(), false).version()).isEqualTo(2);
        assertThat(events(company.id(), "EXTENDED")).isEqualTo(1);
    }

    @Test
    void extensionCannotRemoveAnIndependentSuspension() {
        var company = company();
        var first = start(company, "independent-hold-start");
        jdbc.update("INSERT INTO company_commercial_states(company_id, state, access_mode, reason_code) VALUES (?, 'SUSPENDED', 'BILLING_ONLY', 'SUBSCRIPTION_PAUSED')", company.id());
        clock.advance(8, ChronoUnit.DAYS);
        service.extend(company.id(), rootId, "independent-hold-extend", new Extend("Collection extension only", 1, first.request().id()));
        assertThat(access.access(company.id())).isEqualTo(PaymentCollectionAccessService.Access.NONE);
        assertThat(jdbc.queryForObject("SELECT state FROM company_commercial_states WHERE company_id = ?", String.class, company.id())).isEqualTo("SUSPENDED");
    }

    @Test
    void verificationFailureLeavesCaseOpenAndVerifiedSettlementClosesItAndCancelsPendingNotices() {
        var company = company();
        start(company, "settlement-start");
        var row = repository.latest(company.id(), false);
        clock.advance(8, ChronoUnit.DAYS);
        when(payments.reconcile(company.id(), row.id())).thenReturn(false);
        service.reconcile(company.id(), row.id());
        assertThat(repository.latest(company.id(), false).status()).isEqualTo("OPEN");
        assertThat(access.access(company.id())).isEqualTo(PaymentCollectionAccessService.Access.PAYMENT_ONLY);
        when(payments.reconcile(company.id(), row.id())).thenReturn(true);
        service.reconcile(company.id(), row.id());
        service.reconcile(company.id(), row.id());
        assertThat(repository.latest(company.id(), false).status()).isEqualTo("PAID");
        assertThat(events(company.id(), "PAID")).isEqualTo(1);
        assertThat(deliveries(company.id(), "SKIPPED")).isEqualTo(14);
        assertThat(service.recovery(company.id(), company.ownerId()).canPay()).isFalse();
        assertThat(access.access(company.id())).isEqualTo(PaymentCollectionAccessService.Access.NONE);
    }

    @Test
    void staleSettlementCannotClearANewerOpenRequest() {
        var company = company();
        start(company, "old-case-start");
        var old = repository.latest(company.id(), false);
        when(payments.reconcile(company.id(), old.id())).thenReturn(true);
        service.reconcile(company.id(), old.id());
        var current = start(company, "new-case-start");
        clock.advance(7, ChronoUnit.DAYS);
        service.reconcile(company.id(), old.id());
        assertThat(repository.latest(company.id(), false).reference()).isEqualTo(current.request().id());
        assertThat(repository.latest(company.id(), false).status()).isEqualTo("OPEN");
        assertThat(access.access(company.id())).isEqualTo(PaymentCollectionAccessService.Access.PAYMENT_ONLY);
        assertThat(deliveries(company.id(), "PENDING")).isEqualTo(14);
    }

    @Test
    void oldModalCannotExtendANewCaseWithTheSameVersionNumber() {
        var company = company();
        var old = start(company, "old-modal-start");
        var oldRow = repository.latest(company.id(), false);
        when(payments.reconcile(company.id(), oldRow.id())).thenReturn(true);
        service.reconcile(company.id(), oldRow.id());
        var current = start(company, "new-modal-start");
        clock.advance(8, ChronoUnit.DAYS);
        assertThatThrownBy(() -> service.extend(company.id(), rootId, "old-modal-extend", new Extend("Old modal extension", 1, old.request().id())))
            .isInstanceOfSatisfying(PaymentCollectionException.class, failure -> assertThat(failure.code()).isEqualTo("REQUEST_CHANGED"));
        assertThat(repository.latest(company.id(), false).reference()).isEqualTo(current.request().id());
        assertThat(repository.latest(company.id(), false).version()).isEqualTo(1);
        assertThat(access.access(company.id())).isEqualTo(PaymentCollectionAccessService.Access.PAYMENT_ONLY);
    }

    @Test
    void membershipAndCompanyScopeProtectRecoveryPaymentAndSettlement() {
        var company = company();
        var other = company();
        start(company, "tenant-isolation-start");
        var row = repository.latest(company.id(), false);
        assertThatThrownBy(() -> service.recovery(company.id(), other.ownerId())).isInstanceOf(SecurityException.class);
        assertThatThrownBy(() -> service.pay(company.id(), other.ownerId(), "other-owner-pay", new Pay(row.reference(), row.version())))
            .isInstanceOf(SecurityException.class);
        when(payments.reconcile(other.id(), row.id())).thenReturn(true);
        service.reconcile(other.id(), row.id());
        assertThat(repository.latest(company.id(), false).status()).isEqualTo("OPEN");
        var employee = user("Employee");
        membership(company.id(), employee, "user");
        var recovery = service.recovery(company.id(), employee);
        assertThat(recovery.canPay()).isFalse();
        assertThat(recovery.ownerEmail()).isNull();
        assertThatThrownBy(() -> service.pay(company.id(), employee, "employee-payment", new Pay(row.reference(), row.version())))
            .isInstanceOf(SecurityException.class);
    }

    @Test
    void ownerMustPayTheExactRequestAndVersionReviewedInTheRecoveryScreen() {
        var company = company();
        var current = start(company, "pay-reviewed-case");
        assertThatThrownBy(() -> service.pay(company.id(), company.ownerId(), "pay-wrong-case",
            new Pay("0".repeat(32), 1)))
            .isInstanceOfSatisfying(PaymentCollectionException.class, failure -> assertThat(failure.code()).isEqualTo("REQUEST_CHANGED"));
        assertThatThrownBy(() -> service.pay(company.id(), company.ownerId(), "pay-wrong-version",
            new Pay(current.request().id(), 2)))
            .isInstanceOfSatisfying(PaymentCollectionException.class, failure -> assertThat(failure.code()).isEqualTo("REQUEST_CHANGED"));
        var row = repository.latest(company.id(), false);
        var expected = new PaymentCollectionPaymentService.PaymentLink("https://invoice.stripe.com/i/test-only", null);
        when(payments.paymentUrl(company.id(), row.id(), company.ownerId(), "pay-reviewed-request")).thenReturn(expected);
        assertThat(service.pay(company.id(), company.ownerId(), "pay-reviewed-request", new Pay(current.request().id(), 1)))
            .isEqualTo(expected);
        verify(payments).paymentUrl(company.id(), row.id(), company.ownerId(), "pay-reviewed-request");
    }

    @Test
    void verifiedActivationRetiresOnlyItsPinnedInternalSubscriptionAndRefreshesEffectiveEntitlements() {
        var company = company();
        var old = subscription(company.id(), "internal_");
        var replacement = subscription(company.id(), "sub_");
        var unrelated = subscription(company.id(), "legacy_");
        var otherCompany = company();
        var other = subscription(otherCompany.id(), "internal_");
        var version = entitlementFixture(company.id(), old.id(), replacement.id());
        entitlements.refreshIfEnrolled(company.id());
        assertThat(subscriptionEntitlements(company.id(), old.id())).isEqualTo(1);
        assertThat(subscriptionEntitlements(company.id(), replacement.id())).isEqualTo(1);
        when(payments.quote(company.id())).thenReturn(activationQuote(old.providerId(), version));
        start(company, "conversion-start");
        var request = repository.latest(company.id(), false);
        when(payments.reconcile(company.id(), request.id())).thenReturn(true);

        service.reconcile(company.id(), request.id());

        assertThat(subscriptionStatus(company.id(), old.id())).isEqualTo("canceled");
        assertThat(subscriptionStatus(company.id(), replacement.id())).isEqualTo("active");
        assertThat(subscriptionStatus(company.id(), unrelated.id())).isEqualTo("active");
        assertThat(subscriptionStatus(otherCompany.id(), other.id())).isEqualTo("active");
        assertThat(subscriptionEntitlements(company.id(), old.id())).isZero();
        assertThat(subscriptionEntitlements(company.id(), replacement.id())).isEqualTo(1);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM company_billing_subscription_products WHERE subscription_id = ?", Integer.class, old.id())).isEqualTo(1);
        assertThat(jdbc.queryForObject("SELECT last_event_id FROM company_billing_subscriptions WHERE id = ?", String.class, old.id())).isEqualTo(old.eventId());
        assertThat(jdbc.queryForObject("SELECT canceled_at FROM company_billing_subscriptions WHERE id = ?", Timestamp.class, old.id()).toInstant()).isEqualTo(clock.instant());
        conversions.completeVerifiedActivation(company.id(), request.id());
        assertThat(jdbc.queryForObject("SELECT projection_version FROM company_billing_subscriptions WHERE id = ?", Long.class, old.id())).isEqualTo(1L);
    }

    @Test
    void unpaidActivationCannotRetireTheLegacySourceAndVerifiedPaymentCan() {
        var company = company();
        var old = subscription(company.id(), "legacy_");
        when(payments.quote(company.id())).thenReturn(activationQuote(old.providerId(), null));
        start(company, "unpaid-conversion-start");
        var request = repository.latest(company.id(), false);
        conversions.completeVerifiedActivation(company.id(), request.id());
        when(payments.reconcile(company.id(), request.id())).thenReturn(false);
        service.reconcile(company.id(), request.id());
        assertThat(subscriptionStatus(company.id(), old.id())).isEqualTo("active");
        when(payments.reconcile(company.id(), request.id())).thenReturn(true);
        service.reconcile(company.id(), request.id());
        assertThat(subscriptionStatus(company.id(), old.id())).isEqualTo("canceled");
    }

    @Test
    void conversionCannotRetireARealStripeSubscriptionOrAnotherCompanysSource() {
        var company = company();
        var real = subscription(company.id(), "sub_");
        when(payments.quote(company.id())).thenReturn(activationQuote(real.providerId(), null));
        start(company, "real-source-start");
        var request = repository.latest(company.id(), false);
        when(payments.reconcile(company.id(), request.id())).thenReturn(true);
        service.reconcile(company.id(), request.id());
        assertThat(subscriptionStatus(company.id(), real.id())).isEqualTo("active");

        var otherCompany = company();
        var foreignSource = subscription(otherCompany.id(), "internal_");
        when(payments.quote(company.id())).thenReturn(activationQuote(foreignSource.providerId(), null));
        start(company, "foreign-source-start");
        var foreignRequest = repository.latest(company.id(), false);
        when(payments.reconcile(company.id(), foreignRequest.id())).thenReturn(true);
        service.reconcile(company.id(), foreignRequest.id());
        assertThat(subscriptionStatus(otherCompany.id(), foreignSource.id())).isEqualTo("active");
    }

    @Test
    void verifiedInvoiceCollectionDoesNotRetireItsSourceSubscription() {
        var company = company();
        var source = subscription(company.id(), "internal_");
        var base = quote(TOKEN);
        when(payments.quote(company.id())).thenReturn(new PaymentCollectionPaymentService.Quote(
            base.kind(), base.amountCents(), base.currency(), base.billingInterval(), null, source.providerId(),
            base.sourceCustomerId(), null, null, base.stripeMode(), TOKEN, List.of(), List.of(), base.invoices(), null));
        start(company, "invoice-source-start");
        var request = repository.latest(company.id(), false);
        when(payments.reconcile(company.id(), request.id())).thenReturn(true);
        service.reconcile(company.id(), request.id());
        assertThat(subscriptionStatus(company.id(), source.id())).isEqualTo("active");
    }

    @Test
    void conversionRevokesOnlyOldModulePermissionsAndPreservesPaidSharedAndUnrelatedModules() {
        var company = company();
        var old = subscription(company.id(), "internal_");
        var paid = subscription(company.id(), "sub_");
        var unrelated = subscription(company.id(), "legacy_");
        var otherCompany = company();
        var other = subscription(otherCompany.id(), "internal_");
        var version = entitlementFixture(company.id(), old.id(), paid.id());
        var oldProduct = jdbc.queryForObject("SELECT catalog_product_id FROM company_billing_subscription_products WHERE subscription_id = ?", Long.class, old.id());
        var paidProduct = jdbc.queryForObject("SELECT catalog_product_id FROM company_billing_subscription_products WHERE subscription_id = ?", Long.class, paid.id());
        for (var capability : List.of("human_resources", "inventory")) jdbc.update("INSERT INTO billing_product_capabilities(product_id, capability_code) VALUES (?, ?)", oldProduct, capability);
        for (var capability : List.of("pos", "inventory")) jdbc.update("INSERT INTO billing_product_capabilities(product_id, capability_code) VALUES (?, ?)", paidProduct, capability);
        jdbc.update("INSERT INTO billing_catalog_products(catalog_version_id, product_code, display_name, product_type, active) VALUES (?, 'unrelated', 'Unrelated', 'ADDON', 1)", version);
        var unrelatedProduct = jdbc.queryForObject("SELECT id FROM billing_catalog_products WHERE catalog_version_id = ? AND product_code = 'unrelated'", Long.class, version);
        jdbc.update("INSERT INTO billing_product_capabilities(product_id, capability_code) VALUES (?, 'sales')", unrelatedProduct);
        jdbc.update("INSERT INTO company_billing_subscription_products(subscription_id, catalog_product_id) VALUES (?, ?)", unrelated.id(), unrelatedProduct);
        jdbc.update("INSERT INTO company_billing_subscription_products(subscription_id, catalog_product_id) VALUES (?, ?)", other.id(), oldProduct);
        for (var product : List.of(oldProduct, paidProduct, unrelatedProduct)) productAccess.synchronizeProductModuleAccess(company.id(), product);
        productAccess.synchronizeProductModuleAccess(otherCompany.id(), oldProduct);
        assertThat(moduleRoleCount(company.id(), "human_resources")).isGreaterThan(0);
        assertThat(moduleTabCount(company.id(), "human_resources")).isGreaterThan(0);
        var paidRoles = moduleRoleCount(company.id(), "pos");
        var paidTabs = moduleTabCount(company.id(), "pos");
        var sharedRoles = moduleRoleCount(company.id(), "inventory");
        var unrelatedRoles = moduleRoleCount(company.id(), "crm");
        var unrelatedTabs = moduleTabCount(company.id(), "crm");
        var otherRoles = moduleRoleCount(otherCompany.id(), "human_resources");
        assertThat(paidRoles).isGreaterThan(0);
        assertThat(paidTabs).isGreaterThan(0);
        assertThat(sharedRoles).isGreaterThan(0);
        assertThat(unrelatedRoles).isGreaterThan(0);
        when(payments.quote(company.id())).thenReturn(activationQuote(old.providerId(), version));
        start(company, "module-conversion-start");
        var request = repository.latest(company.id(), false);
        when(payments.reconcile(company.id(), request.id())).thenReturn(true);

        service.reconcile(company.id(), request.id());

        assertThat(moduleStatus(company.id(), "human_resources")).isEqualTo("inactive");
        assertThat(moduleRoleCount(company.id(), "human_resources")).isZero();
        assertThat(moduleTabCount(company.id(), "human_resources")).isZero();
        assertThat(moduleStatus(company.id(), "pos")).isEqualTo("active");
        assertThat(moduleRoleCount(company.id(), "pos")).isEqualTo(paidRoles);
        assertThat(moduleTabCount(company.id(), "pos")).isEqualTo(paidTabs);
        assertThat(moduleStatus(company.id(), "inventory")).isEqualTo("active");
        assertThat(moduleRoleCount(company.id(), "inventory")).isEqualTo(sharedRoles);
        assertThat(moduleStatus(company.id(), "crm")).isEqualTo("active");
        assertThat(moduleRoleCount(company.id(), "crm")).isEqualTo(unrelatedRoles);
        assertThat(moduleTabCount(company.id(), "crm")).isEqualTo(unrelatedTabs);
        assertThat(moduleStatus(otherCompany.id(), "human_resources")).isEqualTo("active");
        assertThat(moduleRoleCount(otherCompany.id(), "human_resources")).isEqualTo(otherRoles);
    }

    @Test
    void unrelatedPaidInvoiceDoesNotPostponeOrClearTheExactOverdueCollectionCase() {
        var company = company();
        start(company, "unrelated-invoice-start");
        clock.advance(7, ChronoUnit.DAYS);
        var reference = UUID.randomUUID().toString().replace("-", "");
        jdbc.update("""
            INSERT INTO billing_invoice_snapshots(stripe_invoice_id, stripe_subscription_id, stripe_customer_id,
                company_id, status, currency, amount_due_cents, amount_paid_cents, period_ends_at,
                last_event_id, last_event_created_at)
            VALUES (?, 'sub_unrelated_collection', 'cus_unrelated_collection', ?, 'paid', 'USD', 1200, 1200, ?, ?, ?)
            """, "in_unrelated_" + reference, company.id(), Timestamp.from(clock.instant().plus(30, ChronoUnit.DAYS)),
            "evt_unrelated_" + reference, Timestamp.from(clock.instant()));
        assertThat(access.access(company.id())).isEqualTo(PaymentCollectionAccessService.Access.PAYMENT_ONLY);
        assertThat(service.recovery(company.id(), company.ownerId()).collectionBlocked()).isTrue();
        assertThat(repository.latest(company.id(), false).status()).isEqualTo("OPEN");
    }

    @Test
    void reconciliationWorkersClaimOnceAndAuditAnExpiredWindowOnlyOnce() {
        var company = company();
        start(company, "worker-audit-start");
        var row = repository.latest(company.id(), false);
        clock.advance(7, ChronoUnit.DAYS);
        jdbc.update("UPDATE company_payment_requests SET next_check_at = ? WHERE company_id = ?", Timestamp.from(clock.instant()), company.id());
        var first = new PaymentCollectionScheduler(repository, service, transactions, clock, access, true);
        var second = new PaymentCollectionScheduler(repository, service, transactions, clock, access, true);
        first.processDue();
        second.processDue();
        verify(payments, times(1)).reconcile(company.id(), row.id());
        assertThat(events(company.id(), "RESTRICTED")).isEqualTo(1);
        clock.advance(300, ChronoUnit.SECONDS);
        second.processDue();
        verify(payments, times(2)).reconcile(company.id(), row.id());
        assertThat(events(company.id(), "RESTRICTED")).isEqualTo(1);
        assertThat(repository.latest(company.id(), false).status()).isEqualTo("OPEN");
    }

    @Test
    void disabledReconciliationDoesNotReleaseHoldAndEnabledWorkerClosesVerifiedObligation() {
        var company = company();
        start(company, "worker-paid-start");
        var row = repository.latest(company.id(), false);
        clock.advance(7, ChronoUnit.DAYS);
        jdbc.update("UPDATE company_payment_requests SET next_check_at = ? WHERE company_id = ?", Timestamp.from(clock.instant()), company.id());
        when(payments.reconcile(company.id(), row.id())).thenReturn(true);
        new PaymentCollectionScheduler(repository, service, transactions, clock, access, false).processDue();
        assertThat(access.access(company.id())).isEqualTo(PaymentCollectionAccessService.Access.PAYMENT_ONLY);
        assertThat(events(company.id(), "PAID")).isZero();
        new PaymentCollectionScheduler(repository, service, transactions, clock, access, true).processDue();
        assertThat(repository.latest(company.id(), false).status()).isEqualTo("PAID");
        assertThat(events(company.id(), "PAID")).isEqualTo(1);
        assertThat(events(company.id(), "RESTRICTED")).isZero();
        assertThat(deliveries(company.id(), "SKIPPED")).isEqualTo(14);
    }

    private Workspace start(Company company, String key) {
        return service.start(company.id(), rootId, key, new Start("Payment follow up", TOKEN));
    }

    private PaymentCollectionService service(boolean enabled, boolean reminder, boolean email, boolean reconciliation) {
        return new PaymentCollectionService(repository, payments, conversions, readyReminders, access, administrators, audit,
            transactions, clock, enabled, reminder, email, reconciliation);
    }

    private PaymentCollectionPaymentService.Quote quote(String token) {
        return new PaymentCollectionPaymentService.Quote("INVOICE", 9900, "USD", "MONTH", null,
            "sub_collection_test", "cus_collection_test", null, null, "TEST", token,
            List.of(), List.of(), List.of(new PaymentCollectionPaymentService.InvoiceObligation(
                "in_collection_test", "sub_collection_test", "cus_collection_test", "USD", 9900, 9900,
                "https://invoice.stripe.com/i/test-only")), null);
    }

    private PaymentCollectionPaymentService.Quote activationQuote(String source, Long version) {
        return new PaymentCollectionPaymentService.Quote("ACTIVATION", 9900, "USD", "MONTH", version,
            source, null, null, null, "TEST", TOKEN, List.of(), List.of(), List.of(), null);
    }

    private Subscription subscription(long companyId, String prefix) {
        var providerId = prefix + UUID.randomUUID().toString().replace("-", "");
        var eventId = "evt_" + UUID.randomUUID().toString().replace("-", "");
        jdbc.update("""
            INSERT INTO company_billing_subscriptions(stripe_subscription_id, company_id, status, last_event_id, last_event_created_at)
            VALUES (?, ?, 'active', ?, ?)
            """, providerId, companyId, eventId, Timestamp.from(clock.instant().minus(1, ChronoUnit.DAYS)));
        var id = jdbc.queryForObject("SELECT id FROM company_billing_subscriptions WHERE company_id = ? AND stripe_subscription_id = ?", Long.class, companyId, providerId);
        return new Subscription(id, providerId, eventId);
    }

    private long entitlementFixture(long companyId, long oldId, long replacementId) {
        var code = "conversion-test-" + UUID.randomUUID();
        jdbc.update("INSERT INTO billing_catalog_versions(version_code, status) VALUES (?, 'SUPERSEDED')", code);
        var version = jdbc.queryForObject("SELECT id FROM billing_catalog_versions WHERE version_code = ?", Long.class, code);
        jdbc.update("INSERT INTO company_entitlement_policies(company_id, catalog_version_id, mode, reason) VALUES (?, ?, 'SHADOW', 'Conversion regression')", companyId, version);
        for (var entry : List.of(new Object[] {oldId, "old_only"}, new Object[] {replacementId, "paid_only"})) {
            var productCode = (String) entry[1];
            jdbc.update("INSERT INTO billing_catalog_products(catalog_version_id, product_code, display_name, product_type, active) VALUES (?, ?, ?, 'ADDON', 1)", version, productCode, productCode);
            var product = jdbc.queryForObject("SELECT id FROM billing_catalog_products WHERE catalog_version_id = ? AND product_code = ?", Long.class, version, productCode);
            jdbc.update("INSERT INTO billing_product_capabilities(product_id, capability_code) VALUES (?, ?)", product, "collection_test." + productCode);
            jdbc.update("INSERT INTO company_billing_subscription_products(subscription_id, catalog_product_id) VALUES (?, ?)", entry[0], product);
        }
        return version;
    }

    private String moduleStatus(long companyId, String module) {
        return jdbc.queryForObject("SELECT status FROM company_module_entitlements WHERE company_id = ? AND module_slug = ?", String.class, companyId, module);
    }

    private int moduleRoleCount(long companyId, String module) {
        return jdbc.queryForObject("""
            SELECT COUNT(*) FROM user_company_module_roles role_row
            JOIN user_companies member ON member.id = role_row.user_company_id
            WHERE member.company_id = ? AND role_row.module_slug = ?
            """, Integer.class, companyId, module);
    }

    private int moduleTabCount(long companyId, String module) {
        return jdbc.queryForObject("""
            SELECT COUNT(*) FROM user_company_tab_permissions permission
            JOIN user_companies member ON member.id = permission.user_company_id
            WHERE member.company_id = ? AND permission.module_slug = ? AND permission.can_view = 1
            """, Integer.class, companyId, module);
    }

    private String subscriptionStatus(long companyId, long id) {
        return jdbc.queryForObject("SELECT status FROM company_billing_subscriptions WHERE company_id = ? AND id = ?", String.class, companyId, id);
    }

    private int subscriptionEntitlements(long companyId, long id) {
        return jdbc.queryForObject("SELECT COUNT(*) FROM company_entitlements WHERE company_id = ? AND source_type = 'SUBSCRIPTION' AND source_reference = ?",
            Integer.class, companyId, "subscription:" + id);
    }

    private Company company() {
        var name = "collection-core-test-" + UUID.randomUUID();
        jdbc.update("INSERT INTO companies(name, platform_status, public_demo_enabled) VALUES (?, 'ACTIVE', 0)", name);
        var companyId = jdbc.queryForObject("SELECT id FROM companies WHERE name = ?", Long.class, name);
        var owner = user("Owner");
        var membershipId = membership(companyId, owner, "owner");
        jdbc.update("INSERT INTO company_ownerships(company_id, owner_user_id, owner_user_company_id) VALUES (?, ?, ?)", companyId, owner, membershipId);
        var email = jdbc.queryForObject("SELECT email FROM users WHERE id = ?", String.class, owner);
        return new Company(companyId, owner, email);
    }

    private long user(String name) {
        var email = "collection-core-" + UUID.randomUUID() + "@example.test";
        jdbc.update("INSERT INTO users(email, password_hash, full_name) VALUES (?, 'test-only-hash', ?)", email, name);
        return jdbc.queryForObject("SELECT id FROM users WHERE email = ?", Long.class, email);
    }

    private long membership(long companyId, long userId, String role) {
        jdbc.update("INSERT INTO user_companies(company_id, user_id, role, status, visibility) VALUES (?, ?, ?, 'active', 'all')", companyId, userId, role);
        return jdbc.queryForObject("SELECT id FROM user_companies WHERE company_id = ? AND user_id = ?", Long.class, companyId, userId);
    }

    private int requestCount(long companyId) {
        return jdbc.queryForObject("SELECT COUNT(*) FROM company_payment_requests WHERE company_id = ?", Integer.class, companyId);
    }

    private int events(long companyId, String action) {
        return jdbc.queryForObject("SELECT COUNT(*) FROM company_payment_request_events WHERE company_id = ? AND action = ?", Integer.class, companyId, action);
    }

    private int deliveries(long companyId, String status) {
        return jdbc.queryForObject("SELECT COUNT(*) FROM company_payment_request_deliveries WHERE company_id = ?"
            + (status == null ? "" : " AND status = ?"), Integer.class,
            status == null ? new Object[] {companyId} : new Object[] {companyId, status});
    }

    private record Company(long id, long ownerId, String email) {}
    private record Subscription(long id, String providerId, String eventId) {}
    private static final class MutableClock extends Clock {
        private Instant now;
        private MutableClock(Instant now) { this.now = now; }
        void advance(long amount, ChronoUnit unit) { now = now.plus(amount, unit); }
        @Override public ZoneId getZone() { return ZoneOffset.UTC; }
        @Override public Clock withZone(ZoneId zone) { return this; }
        @Override public Instant instant() { return now; }
    }
}
