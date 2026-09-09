package com.indice.erp.billing.catalog;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.indice.erp.billing.stripe.StripePhaseTwoProperties;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.NullSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@Transactional
class SubscriptionCatalogPriceResolverIntegrationTest {

    @Autowired private JdbcTemplate jdbc;
    private StripePhaseTwoProperties stripe;
    private SubscriptionCatalogPriceResolver resolver;
    private long companyId;
    private long versionId;
    private long seatProductId;
    private long seatMonthlyPriceId;
    private String subscriptionId;

    @BeforeEach
    void setUp() {
        // Release the catalog's single ACTIVE/DRAFT slots inside this rollback-only fixture.
        // Each scenario supplies its own versions; rollback restores the seeded commercial state.
        jdbc.update("UPDATE billing_catalog_versions SET status = 'SUPERSEDED' WHERE status IN ('ACTIVE', 'DRAFT')");
        stripe = new StripePhaseTwoProperties();
        stripe.setMode("test");
        // Deliberately different legacy configuration must never override the agreed DB price.
        stripe.setPriceExtraSeatMonthly("price_unrelated_environment");
        stripe.setPriceStorageBlockMonthly("price_unrelated_storage_environment");
        resolver = new SubscriptionCatalogPriceResolver(jdbc, stripe);
        jdbc.update("INSERT INTO companies (name) VALUES (?)", "subscription-price-" + UUID.randomUUID());
        companyId = jdbc.queryForObject("SELECT LAST_INSERT_ID()", Long.class);
        versionId = version("SUPERSEDED");
        subscriptionId = "sub_resolver_" + UUID.randomUUID();
        jdbc.update("""
            INSERT INTO company_billing_subscriptions (
                stripe_subscription_id, company_id, catalog_version_id, billing_interval,
                currency, status, last_event_id, last_event_created_at
            ) VALUES (?, ?, ?, 'MONTH', 'USD', 'ACTIVE', 'evt_resolver_fixture', CURRENT_TIMESTAMP(6))
            """, subscriptionId, companyId, versionId);
        seatProductId = product(versionId, "extra_user", "SEAT");
        seatMonthlyPriceId = price(versionId, seatProductId, "extra_user", "MONTH", "price_contract_seat_month");
        price(versionId, seatProductId, "extra_user", "YEAR", "price_contract_seat_year");
        var storage = product(versionId, "storage_block_5_gib", "STORAGE");
        price(versionId, storage, "storage_block_5_gib", "MONTH", "price_contract_storage_month");
        price(versionId, storage, "storage_block_5_gib", "YEAR", "price_contract_storage_year");
    }

    @ParameterizedTest
    @CsvSource({
        "extra_seat,MONTH,price_contract_seat_month",
        "extra_seat,YEAR,price_contract_seat_year",
        "storage_block,MONTH,price_contract_storage_month",
        "storage_block,YEAR,price_contract_storage_year"
    })
    void resolvesBothIntervalsFromTheSubscriptionsSupersededCatalog(String code, String interval, String expected) {
        jdbc.update("UPDATE company_billing_subscriptions SET billing_interval = ? WHERE stripe_subscription_id = ?",
            interval, subscriptionId);
        var newVersion = version("ACTIVE");
        var newProduct = product(newVersion, "extra_user", "SEAT");
        price(newVersion, newProduct, "extra_user", interval, "price_new_offer_must_not_reprice_contract");

        assertThat(resolver.resolve(companyId, subscriptionId, code, interval)).isEqualTo(expected);
        assertThat(resolver.resolve(companyId, subscriptionId, code, interval)).isEqualTo(expected);
        assertThat(stripe.isEnabled()).isFalse();
        assertThat(jdbc.queryForObject("SELECT catalog_version_id FROM company_billing_subscriptions WHERE stripe_subscription_id = ?",
            Long.class, subscriptionId)).isEqualTo(versionId);
    }

    @ParameterizedTest
    @CsvSource({"extra_seat,MONTH", "extra_seat,YEAR", "storage_block,MONTH", "storage_block,YEAR"})
    void acceptsVerifiedLegacyRowsOnlyWithinTheAgreedVersion(String code, String interval) {
        var legacyVersion = version("SUPERSEDED");
        price(legacyVersion, null, code, interval, "price_legacy_contract");
        jdbc.update("UPDATE company_billing_subscriptions SET catalog_version_id = ?, billing_interval = ? WHERE stripe_subscription_id = ?",
            legacyVersion, interval, subscriptionId);

        assertThat(resolver.resolve(companyId, subscriptionId, code, interval)).isEqualTo("price_legacy_contract");
    }

    @Test
    void resolvesLiveCatalogMappingsWithEmptyLegacyPriceConfiguration() {
        stripe.setMode("live");
        stripe.setPriceExtraSeatMonthly("");
        stripe.setPriceStorageBlockMonthly("");
        jdbc.update("UPDATE billing_catalog_products SET stripe_mode = 'LIVE' WHERE catalog_version_id = ?", versionId);
        jdbc.update("UPDATE billing_catalog_prices SET stripe_mode = 'LIVE' WHERE catalog_version_id = ?", versionId);

        assertThat(resolveSeat()).isEqualTo("price_contract_seat_month");
        assertThat(resolver.resolve(companyId, subscriptionId, "storage_block", "MONTH"))
            .isEqualTo("price_contract_storage_month");
    }

    @Test
    void modernProductsTakePrecedenceOverRetainedLegacyCompatibilityRows() {
        price(versionId, null, "extra_seat", "MONTH", "price_retained_legacy");
        assertThat(resolveSeat()).isEqualTo("price_contract_seat_month");

        jdbc.update("UPDATE billing_catalog_prices SET stripe_sync_status = 'PENDING' WHERE id = ?", seatMonthlyPriceId);
        assertUnavailableSeat();
    }

    @Test
    void disabledModernProductsCannotFallBackToLegacyPrices() {
        price(versionId, null, "extra_seat", "MONTH", "price_retained_legacy");
        jdbc.update("UPDATE billing_catalog_products SET active = 0 WHERE id = ?", seatProductId);
        assertUnavailableSeat();
    }

    @Test
    void rejectsAmbiguousActiveProductsAndAllowsInactiveAlternatives() {
        var alternative = product(versionId, "alternative_seat", "SEAT");
        price(versionId, alternative, "alternative_seat", "MONTH", "price_ambiguous");
        assertUnavailableSeat();

        jdbc.update("UPDATE billing_catalog_products SET active = 0 WHERE id = ?", alternative);
        assertThat(resolveSeat()).isEqualTo("price_contract_seat_month");
    }

    @Test
    void rejectsMultiplePriceMappingsForTheSameProductAndInterval() {
        price(versionId, seatProductId, "duplicate_seat_mapping", "MONTH", "price_ambiguous_mapping");
        assertUnavailableSeat();
    }

    @Test
    void subscriptionLookupIsScopedToTheAuthenticatedCompany() {
        jdbc.update("INSERT INTO companies (name) VALUES (?)", "other-price-company-" + UUID.randomUUID());
        var otherCompany = jdbc.queryForObject("SELECT LAST_INSERT_ID()", Long.class);

        assertThatThrownBy(() -> resolver.resolve(otherCompany, subscriptionId, "extra_seat", "MONTH"))
            .isInstanceOf(IllegalStateException.class).hasMessageContaining("this company");
        assertThatThrownBy(() -> resolver.resolve(companyId, "sub_not_present", "extra_seat", "MONTH"))
            .isInstanceOf(IllegalStateException.class).hasMessageContaining("this company");
    }

    @Test
    void refusesUnversionedSubscriptionsDespiteConfiguredEnvironmentPrices() {
        jdbc.update("UPDATE company_billing_subscriptions SET catalog_version_id = NULL WHERE stripe_subscription_id = ?", subscriptionId);
        assertThatThrownBy(this::resolveSeat).isInstanceOf(IllegalStateException.class).hasMessageContaining("published catalog");
    }

    @Test
    void rejectsAnUnpublishedVersion() {
        jdbc.update("UPDATE billing_catalog_versions SET status = 'DRAFT' WHERE id = ?", versionId);
        assertThatThrownBy(this::resolveSeat).isInstanceOf(IllegalStateException.class).hasMessageContaining("published catalog");
    }

    @Test
    void rejectsRequestsThatChangeTheSubscriptionCurrencyOrInterval() {
        assertThatThrownBy(() -> resolver.resolve(companyId, subscriptionId, "extra_seat", "YEAR"))
            .isInstanceOf(IllegalStateException.class).hasMessageContaining("interval");
        jdbc.update("UPDATE company_billing_subscriptions SET currency = 'CAD' WHERE stripe_subscription_id = ?", subscriptionId);
        assertThatThrownBy(this::resolveSeat).isInstanceOf(IllegalStateException.class).hasMessageContaining("currency");
    }

    @Test
    void rejectsACanceledSubscription() {
        jdbc.update("UPDATE company_billing_subscriptions SET status = 'CANCELED' WHERE stripe_subscription_id = ?", subscriptionId);
        assertThatThrownBy(this::resolveSeat).isInstanceOf(IllegalStateException.class).hasMessageContaining("published catalog");
    }

    @ParameterizedTest
    @NullSource
    @ValueSource(longs = {0, -1, 100_000_001})
    void rejectsMissingOrInvalidAmounts(Long amount) {
        jdbc.update("UPDATE billing_catalog_prices SET unit_amount_cents = ? WHERE id = ?", amount, seatMonthlyPriceId);
        assertUnavailableSeat();
    }

    @ParameterizedTest
    @ValueSource(strings = {"DRAFT", "ARCHIVED"})
    void rejectsUnpublishedPriceStates(String status) {
        jdbc.update("UPDATE billing_catalog_prices SET status = ? WHERE id = ?", status, seatMonthlyPriceId);
        assertUnavailableSeat();
    }

    @Test
    void rejectsUnverifiedOrWrongModePriceReferences() {
        jdbc.update("UPDATE billing_catalog_prices SET stripe_verified_at = NULL WHERE id = ?", seatMonthlyPriceId);
        assertUnavailableSeat();
        jdbc.update("UPDATE billing_catalog_prices SET stripe_verified_at = CURRENT_TIMESTAMP(6), stripe_mode = 'LIVE' WHERE id = ?",
            seatMonthlyPriceId);
        assertUnavailableSeat();
    }

    @Test
    void rejectsProductAndPriceAccountMismatch() {
        jdbc.update("UPDATE billing_catalog_prices SET stripe_account_id = 'acct_other' WHERE id = ?", seatMonthlyPriceId);
        assertUnavailableSeat();
    }

    @Test
    void rejectsMissingProductVerification() {
        jdbc.update("UPDATE billing_catalog_products SET stripe_verified_at = NULL WHERE id = ?", seatProductId);
        assertUnavailableSeat();
    }

    @Test
    void rejectsMalformedReferencesTaxBehaviorAndCurrencyMismatch() {
        jdbc.update("UPDATE billing_catalog_prices SET external_price_id = 'prod_not_a_price' WHERE id = ?", seatMonthlyPriceId);
        assertUnavailableSeat();
        jdbc.update("UPDATE billing_catalog_prices SET external_price_id = 'price_contract', stripe_tax_behavior = 'INCLUSIVE' WHERE id = ?",
            seatMonthlyPriceId);
        assertUnavailableSeat();
        jdbc.update("UPDATE billing_catalog_prices SET stripe_tax_behavior = 'EXCLUSIVE', currency = 'CAD' WHERE id = ?", seatMonthlyPriceId);
        assertUnavailableSeat();
    }

    @Test
    void rejectsAProductPriceLinkedToAnotherCatalogVersion() {
        jdbc.update("UPDATE billing_catalog_prices SET catalog_version_id = ? WHERE id = ?", version("ACTIVE"), seatMonthlyPriceId);
        assertUnavailableSeat();
    }

    @Test
    void rejectsInvalidRuntimeModeAndUnsupportedAddonRequests() {
        stripe.setMode("unexpected");
        assertThatThrownBy(this::resolveSeat).isInstanceOf(IllegalStateException.class).hasMessageContaining("Stripe mode");
        stripe.setMode("test");
        assertThatThrownBy(() -> resolver.resolve(companyId, subscriptionId, "arbitrary_product", "MONTH"))
            .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("Unsupported");
        assertThatThrownBy(() -> resolver.resolve(companyId, subscriptionId, "extra_seat", "WEEK"))
            .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("billing interval");
    }

    private String resolveSeat() {
        return resolver.resolve(companyId, subscriptionId, "extra_seat", "MONTH");
    }

    private void assertUnavailableSeat() {
        assertThatThrownBy(this::resolveSeat).isInstanceOf(IllegalStateException.class).hasMessageContaining("one verified price");
    }

    private long version(String status) {
        jdbc.update("""
            INSERT INTO billing_catalog_versions (version_code, status, effective_from, effective_to)
            VALUES (?, ?, TIMESTAMPADD(DAY, -30, CURRENT_TIMESTAMP),
                    CASE WHEN ? = 'SUPERSEDED' THEN TIMESTAMPADD(DAY, -1, CURRENT_TIMESTAMP) ELSE NULL END)
            """, "resolver-" + UUID.randomUUID(), status, status);
        return jdbc.queryForObject("SELECT LAST_INSERT_ID()", Long.class);
    }

    private long product(long catalogVersion, String code, String kind) {
        jdbc.update("""
            INSERT INTO billing_catalog_products (catalog_version_id, product_code, display_name,
                product_type, commercial_kind, active, external_product_id, stripe_mode,
                stripe_account_id, stripe_verified_at, stripe_sync_status)
            VALUES (?, ?, 'Resolver fixture', 'ADDON', ?, 1, 'prod_resolver', 'TEST',
                    'acct_resolver', CURRENT_TIMESTAMP(6), 'READY')
            """, catalogVersion, code, kind);
        return jdbc.queryForObject("SELECT LAST_INSERT_ID()", Long.class);
    }

    private long price(long catalogVersion, Long productId, String code, String interval, String externalId) {
        jdbc.update("""
            INSERT INTO billing_catalog_prices (catalog_version_id, catalog_product_id, billable_code,
                price_type, billing_interval, currency, unit_amount_cents, external_price_id, status,
                stripe_tax_behavior, stripe_mode, stripe_account_id, stripe_verified_at, stripe_sync_status)
            VALUES (?, ?, ?, 'ADDON', ?, 'USD', ?, ?, 'ACTIVE', 'EXCLUSIVE', 'TEST',
                    'acct_resolver', CURRENT_TIMESTAMP(6), 'READY')
            """, catalogVersion, productId, code, interval, "MONTH".equals(interval) ? 1200 : 14400, externalId);
        return jdbc.queryForObject("SELECT LAST_INSERT_ID()", Long.class);
    }
}
