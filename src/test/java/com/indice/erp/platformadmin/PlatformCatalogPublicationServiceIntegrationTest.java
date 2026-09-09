package com.indice.erp.platformadmin;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

import com.indice.erp.billing.catalog.CommercialOfferSelectionService;
import com.indice.erp.billing.catalog.SubscriptionCatalogPriceResolver;
import com.indice.erp.billing.stripe.StripeCatalogGateway;
import com.indice.erp.billing.stripe.StripeGatewayException;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest(properties = {
    "app.entitlements.enforcement-enabled=false",
    "app.entitlements.projection-enabled=false",
    "app.billing.stripe.enabled=true",
    "app.billing.stripe.mode=test",
    "app.billing.stripe.secret-key=sk_test_publication"
})
@Transactional
class PlatformCatalogPublicationServiceIntegrationTest {
    @Autowired private JdbcTemplate jdbc;
    @Autowired private PlatformCatalogPublicationService publication;
    @Autowired private PlatformCatalogManagementService management;
    @Autowired private PlatformCatalogPublicationSnapshot snapshots;
    @Autowired private PlatformCatalogPublicationLock publicationLock;
    @Autowired private CommercialOfferSelectionService offers;
    @Autowired private SubscriptionCatalogPriceResolver contractPrices;
    @MockBean private StripeCatalogGateway stripe;

    private long actorId;
    private long draftId;
    private long oldActiveId;
    private final AtomicInteger creations = new AtomicInteger();
    private final Map<String, StripeCatalogGateway.ProductVerification> remoteProducts = new HashMap<>();
    private final Map<String, StripeCatalogGateway.PriceVerification> remotePrices = new HashMap<>();
    private Runnable afterPriceCreated = () -> {};
    private Runnable afterPriceVerified = () -> {};

    @BeforeEach
    void setUp() {
        jdbc.update("INSERT INTO users (email, password_hash, full_name) VALUES (?, 'test-only', 'Publication Root')",
            "publication-" + UUID.randomUUID() + "@example.com");
        actorId = jdbc.queryForObject("SELECT LAST_INSERT_ID()", Long.class);
        jdbc.update("""
            INSERT INTO platform_administrators (user_id, platform_role, status, mfa_required, created_by_user_id)
            VALUES (?, 'PLATFORM_ROOT', 'ACTIVE', 0, ?)
            """, actorId, actorId);
        draftId = jdbc.queryForObject("SELECT id FROM billing_catalog_versions WHERE status = 'DRAFT'", Long.class);
        oldActiveId = jdbc.queryForObject("SELECT id FROM billing_catalog_versions WHERE status = 'ACTIVE'", Long.class);
        // The seeded approved draft is the realistic 13-product commercial offer under test.
        jdbc.update("""
            UPDATE modules SET is_active = 1, assignment_enabled = 1, lifecycle_status = 'released'
            WHERE slug IN ('human_resources', 'processes', 'expenses', 'petty_cash', 'pos', 'inventory', 'crm', 'receivables')
            """);
        given(stripe.account()).willReturn(new StripeCatalogGateway.AccountResult("acct_publication", true, true));
        given(stripe.upsertProduct(any(), anyString())).willAnswer(invocation -> {
            var command = invocation.getArgument(0, StripeCatalogGateway.ProductCommand.class);
            var id = command.externalProductId() == null ? "prod_" + UUID.randomUUID() : command.externalProductId();
            remoteProducts.put(id, new StripeCatalogGateway.ProductVerification(id, command.name(), command.taxCode(), true, false));
            return new StripeCatalogGateway.ProductResult(id, false);
        });
        given(stripe.verifyProduct(anyString())).willAnswer(invocation -> remoteProducts.get(invocation.getArgument(0, String.class)));
        given(stripe.createRecurringPrice(any(), anyString())).willAnswer(invocation -> {
            creations.incrementAndGet();
            var command = invocation.getArgument(0, StripeCatalogGateway.PriceCommand.class);
            var id = "price_" + UUID.randomUUID();
            remotePrices.put(id, new StripeCatalogGateway.PriceVerification(id, command.productId(), command.currency(),
                command.amountCents(), command.interval(), "exclusive", true, false));
            afterPriceCreated.run();
            return new StripeCatalogGateway.PriceResult(id, "exclusive", false);
        });
        given(stripe.verifyRecurringPrice(anyString())).willAnswer(invocation -> {
            afterPriceVerified.run();
            return remotePrices.get(invocation.getArgument(0, String.class));
        });
    }

    @Test
    void publishesStoredPricesAndPreservesHistoricalAmountsAndReferences() {
        var historicalPrices = jdbc.queryForList("SELECT * FROM billing_catalog_prices WHERE catalog_version_id = ? ORDER BY id", oldActiveId);
        var expectedAmounts = jdbc.queryForList("""
            SELECT price.id, price.unit_amount_cents FROM billing_catalog_prices price
            JOIN billing_catalog_products product ON product.id = price.catalog_product_id
            WHERE price.catalog_version_id = ? AND product.active = 1 ORDER BY price.id
            """, draftId);

        var result = publication.synchronizeAndPublish(actorId, draftId, request());

        assertThat(result.published()).isTrue();
        assertThat(result.synchronized_products()).isEqualTo(13);
        assertThat(jdbc.queryForObject("SELECT id FROM billing_catalog_versions WHERE status = 'ACTIVE'", Long.class)).isEqualTo(draftId);
        assertThat(jdbc.queryForObject("SELECT status FROM billing_catalog_versions WHERE id = ?", String.class, oldActiveId)).isEqualTo("SUPERSEDED");
        assertThat(jdbc.queryForList("SELECT * FROM billing_catalog_prices WHERE catalog_version_id = ? ORDER BY id", oldActiveId)).isEqualTo(historicalPrices);
        for (var expected : expectedAmounts) {
            var saved = jdbc.queryForMap("SELECT unit_amount_cents, external_price_id, status FROM billing_catalog_prices WHERE id = ?", expected.get("id"));
            assertThat(saved.get("unit_amount_cents")).isEqualTo(expected.get("unit_amount_cents"));
            assertThat(saved.get("status")).isEqualTo("ACTIVE");
            assertThat(remotePrices.get(saved.get("external_price_id")).amountCents()).isEqualTo(((Number) expected.get("unit_amount_cents")).longValue());
        }
        var created = creations.get();
        assertThat(publication.synchronizeAndPublish(actorId, draftId, request()).synchronized_products()).isZero();
        assertThat(creations.get()).isEqualTo(created);
    }

    @Test
    void publishingNewPricesPreservesAnExistingSubscribersEntireContractAndUsesNewTermsForNewSelections() {
        var suffix = UUID.randomUUID().toString();
        jdbc.update("INSERT INTO companies (name) VALUES (?)", "publication-contract-" + suffix);
        var companyId = jdbc.queryForObject("SELECT LAST_INSERT_ID()", Long.class);
        var oldProductId = jdbc.queryForObject("SELECT id FROM billing_catalog_products WHERE catalog_version_id = ? AND product_code = 'basic_hr'",
            Long.class, oldActiveId);
        jdbc.update("""
            UPDATE billing_catalog_prices
            SET external_price_id = CASE billable_code WHEN 'extra_seat' THEN 'price_existing_seat' ELSE 'price_existing_base' END,
                stripe_mode = 'TEST', stripe_account_id = 'acct_publication',
                stripe_verified_at = CURRENT_TIMESTAMP(6), stripe_synced_at = CURRENT_TIMESTAMP(6),
                stripe_sync_status = 'READY', stripe_tax_behavior = 'EXCLUSIVE', status = 'ACTIVE'
            WHERE catalog_version_id = ? AND billing_interval = 'MONTH' AND billable_code IN ('basic_1', 'extra_seat')
            """, oldActiveId);
        var agreedBase = jdbc.queryForObject("SELECT unit_amount_cents FROM billing_catalog_prices WHERE catalog_version_id = ? AND billable_code = 'basic_1' AND billing_interval = 'MONTH'",
            Long.class, oldActiveId);
        var agreedSeat = jdbc.queryForObject("SELECT unit_amount_cents FROM billing_catalog_prices WHERE catalog_version_id = ? AND billable_code = 'extra_seat' AND billing_interval = 'MONTH'",
            Long.class, oldActiveId);
        var agreedSubtotal = Math.addExact(agreedBase, Math.multiplyExact(agreedSeat, 2));
        var subscriptionId = "sub_existing_" + suffix;
        jdbc.update("""
            INSERT INTO company_billing_subscriptions (
                stripe_subscription_id, stripe_customer_id, company_id, catalog_version_id,
                offer_code, billing_interval, currency, status, included_seats, extra_seats,
                subtotal_amount_cents, discount_amount_cents, promotion_code, stripe_extra_seat_item_id,
                current_period_starts_at, current_period_ends_at, last_payment_status,
                last_event_id, last_event_created_at
            ) VALUES (?, ?, ?, ?, 'basic_1', 'MONTH', 'USD', 'ACTIVE', 5, 2, ?, 930,
                      'KEEP10', ?, CURRENT_TIMESTAMP(6), TIMESTAMPADD(MONTH, 1, CURRENT_TIMESTAMP(6)),
                      'paid', 'evt_existing_contract', CURRENT_TIMESTAMP(6))
            """, subscriptionId, "cus_existing_" + suffix, companyId, oldActiveId, agreedSubtotal, "si_existing_seat_" + suffix);
        var subscriptionRowId = jdbc.queryForObject("SELECT LAST_INSERT_ID()", Long.class);
        jdbc.update("INSERT INTO company_billing_subscription_products (subscription_id, catalog_product_id) VALUES (?, ?)",
            subscriptionRowId, oldProductId);
        jdbc.update("""
            INSERT INTO company_billing_subscription_items (subscription_id, item_type, billable_code,
                billing_interval, external_price_id, stripe_subscription_item_id, quantity, status)
            VALUES (?, 'BASE', 'basic_1', 'MONTH', 'price_existing_base', ?, 1, 'ACTIVE'),
                   (?, 'SEAT', 'extra_seat', 'MONTH', 'price_existing_seat', ?, 2, 'ACTIVE')
            """, subscriptionRowId, "si_existing_base_" + suffix, subscriptionRowId, "si_existing_seat_" + suffix);
        jdbc.update("""
            INSERT INTO billing_catalog_promotions (catalog_version_id, promotion_code, display_name,
                discount_type, percent_basis_points, currency, duration_type, external_promotion_code_id,
                active, stripe_mode, stripe_account_id, stripe_verified_at, stripe_sync_status)
            VALUES (?, 'KEEP10', 'Existing contract discount', 'PERCENT', 1000, 'USD', 'FOREVER',
                    'promo_existing_contract', 1, 'TEST', 'acct_publication', CURRENT_TIMESTAMP(6), 'READY')
            """, oldActiveId);
        var promotionId = jdbc.queryForObject("SELECT LAST_INSERT_ID()", Long.class);
        jdbc.update("INSERT INTO billing_catalog_promotion_products (promotion_id, catalog_product_id) VALUES (?, ?)",
            promotionId, oldProductId);

        var agreedSubscription = jdbc.queryForMap("SELECT * FROM company_billing_subscriptions WHERE id = ?", subscriptionRowId);
        var agreedItems = jdbc.queryForList("SELECT * FROM company_billing_subscription_items WHERE subscription_id = ? ORDER BY id", subscriptionRowId);
        var agreedProducts = jdbc.queryForList("SELECT * FROM company_billing_subscription_products WHERE subscription_id = ? ORDER BY catalog_product_id", subscriptionRowId);
        var agreedPromotion = jdbc.queryForMap("SELECT * FROM billing_catalog_promotions WHERE id = ?", promotionId);
        var agreedPromotionProducts = jdbc.queryForList("SELECT * FROM billing_catalog_promotion_products WHERE promotion_id = ?", promotionId);
        var agreedPrices = jdbc.queryForList("SELECT * FROM billing_catalog_prices WHERE catalog_version_id = ? ORDER BY id", oldActiveId);
        var draftSeat = jdbc.queryForObject("SELECT id FROM billing_catalog_products WHERE catalog_version_id = ? AND product_code = 'extra_user'", Long.class, draftId);
        var draftModule = jdbc.queryForObject("SELECT id FROM billing_catalog_products WHERE catalog_version_id = ? AND product_code = 'module_hr'", Long.class, draftId);
        management.saveProductPrices(actorId, draftSeat, new PlatformCatalogManagementService.ProductPricesRequest(2345L, 28140L));
        management.saveProductPrices(actorId, draftModule, new PlatformCatalogManagementService.ProductPricesRequest(1379L, 16548L));

        assertThat(publication.synchronizeAndPublish(actorId, draftId, request()).published()).isTrue();

        var activationTime = jdbc.queryForObject("SELECT effective_from FROM billing_catalog_versions WHERE id = ?",
            java.sql.Timestamp.class, draftId);
        assertThat(activationTime).isNotNull();
        var publishedPriceTimes = jdbc.queryForList("SELECT effective_from, MICROSECOND(effective_from) AS fractional_microseconds FROM billing_catalog_prices WHERE catalog_version_id = ? AND status = 'ACTIVE'", draftId);
        assertThat(publishedPriceTimes).isNotEmpty();
        publishedPriceTimes.forEach(price -> {
            assertThat(price.get("effective_from")).isEqualTo(activationTime);
            assertThat(((Number) price.get("fractional_microseconds")).intValue()).isZero();
        });
        assertThat(jdbc.queryForMap("SELECT * FROM company_billing_subscriptions WHERE id = ?", subscriptionRowId)).isEqualTo(agreedSubscription);
        assertThat(jdbc.queryForList("SELECT * FROM company_billing_subscription_items WHERE subscription_id = ? ORDER BY id", subscriptionRowId)).isEqualTo(agreedItems);
        assertThat(jdbc.queryForList("SELECT * FROM company_billing_subscription_products WHERE subscription_id = ? ORDER BY catalog_product_id", subscriptionRowId)).isEqualTo(agreedProducts);
        assertThat(jdbc.queryForMap("SELECT * FROM billing_catalog_promotions WHERE id = ?", promotionId)).isEqualTo(agreedPromotion);
        assertThat(jdbc.queryForList("SELECT * FROM billing_catalog_promotion_products WHERE promotion_id = ?", promotionId)).isEqualTo(agreedPromotionProducts);
        assertThat(jdbc.queryForList("SELECT * FROM billing_catalog_prices WHERE catalog_version_id = ? ORDER BY id", oldActiveId)).isEqualTo(agreedPrices);
        assertThat(contractPrices.resolve(companyId, subscriptionId, "extra_seat", "MONTH")).isEqualTo("price_existing_seat");
        var newSelection = offers.select(List.of("module_hr"), "MONTH", 2);
        assertThat(newSelection.catalogVersionId()).isEqualTo(draftId);
        assertThat(newSelection.extraSeatUnitAmountCents()).isEqualTo(2345L);
        assertThat(newSelection.subtotalAmountCents()).isEqualTo(6069L);
        assertThat(newSelection.discountAmountCents()).isZero();
        assertThat(newSelection.promotionCode()).isNull();
        assertThat(newSelection.lineItems()).anySatisfy(line -> {
            assertThat(line.billableCode()).isEqualTo("module_hr");
            assertThat(line.unitAmountCents()).isEqualTo(1379L);
        });
    }

    @Test
    void remoteFailureKeepsPreviousOfferActiveAndRetryReusesCompletedPrices() {
        var calls = new AtomicInteger();
        afterPriceCreated = () -> {
            if (calls.incrementAndGet() == 3) throw new StripeGatewayException("Test connection failure", null);
        };

        assertThatThrownBy(() -> publication.synchronizeAndPublish(actorId, draftId, request())).isInstanceOf(StripeGatewayException.class);
        assertThat(jdbc.queryForObject("SELECT id FROM billing_catalog_versions WHERE status = 'ACTIVE'", Long.class)).isEqualTo(oldActiveId);
        var completedPrices = jdbc.queryForList("SELECT id, external_price_id FROM billing_catalog_prices WHERE catalog_version_id = ? AND stripe_sync_status = 'READY' ORDER BY id", draftId);
        assertThat(completedPrices).hasSize(2);

        afterPriceCreated = () -> {};
        assertThat(publication.synchronizeAndPublish(actorId, draftId, request()).published()).isTrue();
        completedPrices.forEach(price -> assertThat(jdbc.queryForObject("SELECT external_price_id FROM billing_catalog_prices WHERE id = ?", String.class, price.get("id"))).isEqualTo(price.get("external_price_id")));
    }

    @Test
    void commercialEditDuringRemoteCallsRejectsPublicationWithoutOverwritingTheEdit() {
        var calls = new AtomicInteger();
        afterPriceCreated = () -> {
            if (calls.incrementAndGet() == 1) jdbc.update("UPDATE billing_catalog_products SET description = 'A concurrent edit' WHERE catalog_version_id = ? AND product_code = 'corporativiza'", draftId);
        };
        assertThatThrownBy(() -> publication.synchronizeAndPublish(actorId, draftId, request()))
            .isInstanceOf(IllegalStateException.class).hasMessageContaining("oferta cambió");
        assertThat(jdbc.queryForObject("SELECT id FROM billing_catalog_versions WHERE status = 'ACTIVE'", Long.class)).isEqualTo(oldActiveId);
        assertThat(jdbc.queryForObject("SELECT description FROM billing_catalog_products WHERE catalog_version_id = ? AND product_code = 'corporativiza'", String.class, draftId)).isEqualTo("A concurrent edit");
    }

    @Test
    void missingStoredAmountRejectsTheWholeOfferBeforeAnyStripeWrite() {
        jdbc.update("UPDATE billing_catalog_prices SET unit_amount_cents = NULL, status = 'DRAFT' WHERE catalog_version_id = ? AND billable_code = 'extra_user'", draftId);
        assertThatThrownBy(() -> publication.synchronizeAndPublish(actorId, draftId, request()))
            .isInstanceOf(IllegalStateException.class).hasMessageContaining("tarifas mensual y anual");
        verify(stripe, never()).upsertProduct(any(), anyString());
        assertThat(jdbc.queryForObject("SELECT id FROM billing_catalog_versions WHERE status = 'ACTIVE'", Long.class)).isEqualTo(oldActiveId);
    }

    @Test
    void localPriceSaveStoresBothIntervalsWithoutStripeAndSnapshotDetectsChanges() {
        var productId = jdbc.queryForObject("SELECT id FROM billing_catalog_products WHERE catalog_version_id = ? AND product_code = 'extra_user'", Long.class, draftId);
        var before = snapshots.capture(draftId);
        var saved = management.saveProductPrices(actorId, productId, new PlatformCatalogManagementService.ProductPricesRequest(1300L, 15600L));
        assertThat(saved.monthly().unit_amount_cents()).isEqualTo(1300L);
        assertThat(saved.annual().unit_amount_cents()).isEqualTo(15600L);
        assertThat(saved.monthly().external_price_id()).isNull();
        assertThat(saved.monthly().status()).isEqualTo("DRAFT");
        verify(stripe, never()).upsertProduct(any(), anyString());
        assertThatThrownBy(() -> snapshots.requireUnchanged(draftId, before)).isInstanceOf(IllegalStateException.class);
    }

    @Test
    void finalTransactionRejectsAnEditMadeDuringRemoteVerification() {
        var verified = new AtomicInteger();
        afterPriceVerified = () -> {
            // 26 newly created prices have been verified; this call is in the final offer verification.
            if (verified.incrementAndGet() == 27) jdbc.update("UPDATE billing_catalog_products SET description = 'Changed after synchronization' WHERE catalog_version_id = ? AND product_code = 'corporativiza'", draftId);
        };
        assertThatThrownBy(() -> publication.synchronizeAndPublish(actorId, draftId, request()))
            .isInstanceOf(IllegalStateException.class).hasMessageContaining("oferta cambió");
        assertThat(jdbc.queryForObject("SELECT id FROM billing_catalog_versions WHERE status = 'ACTIVE'", Long.class)).isEqualTo(oldActiveId);
    }

    @Test
    void publicationLockRejectsASecondConnectionAndIsReleasedAfterFailure() {
        try (var executor = java.util.concurrent.Executors.newSingleThreadExecutor()) {
            publicationLock.execute(() -> {
                var competing = executor.submit(() -> publicationLock.execute(() -> "must not run"));
                assertThatThrownBy(() -> competing.get(5, java.util.concurrent.TimeUnit.SECONDS))
                    .hasCauseInstanceOf(IllegalStateException.class);
                return null;
            });
        }
        assertThatThrownBy(() -> publicationLock.execute(() -> { throw new IllegalStateException("Test failure"); }))
            .hasMessage("Test failure");
        assertThat(publicationLock.execute(() -> "released")).isEqualTo("released");
    }

    @Test
    void legacyPublicationAlsoRejectsAValidPackageEditDuringRemoteVerification() {
        publication.synchronizeAndPublish(actorId, draftId, request());
        var nextDraft = management.createDraft(actorId);
        var nextDraftId = ((Number) nextDraft.get("id")).longValue();
        var packageId = jdbc.queryForObject("SELECT id FROM billing_catalog_products WHERE catalog_version_id = ? AND product_code = 'corporativiza'", Long.class, nextDraftId);
        var verified = new AtomicInteger();
        afterPriceVerified = () -> {
            if (verified.incrementAndGet() == 1) {
                management.updateProduct(actorId, packageId,
                    new PlatformCatalogManagementService.ProductUpdateRequest(null, null, null, null,
                        "PACKAGE", null, List.of("module_hr", "module_process_tasks", "module_expenses",
                            "module_sales_inventory", "module_pos_inventory")));
            }
        };

        assertThatThrownBy(() -> management.publishDraft(actorId, nextDraftId))
            .isInstanceOf(IllegalStateException.class).hasMessageContaining("oferta cambió");
        assertThat(jdbc.queryForObject("SELECT id FROM billing_catalog_versions WHERE status = 'ACTIVE'", Long.class)).isEqualTo(draftId);
        assertThat(jdbc.queryForObject("SELECT status FROM billing_catalog_versions WHERE id = ?", String.class, nextDraftId)).isEqualTo("DRAFT");
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM billing_package_items WHERE package_product_id = ?", Integer.class, packageId)).isEqualTo(5);
    }

    private PlatformCatalogPublicationService.PublicationRequest request() {
        return new PlatformCatalogPublicationService.PublicationRequest("TEST", null);
    }
}
