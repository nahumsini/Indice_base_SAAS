package com.indice.erp.billing.seats;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.indice.erp.billing.catalog.SubscriptionCatalogPriceResolver;
import java.util.UUID;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

@SpringBootTest(properties = {
    "app.billing.stripe.price-extra-seat-monthly=price_unrelated_environment_month",
    "app.billing.stripe.price-extra-seat-annual=price_unrelated_environment_year"
})
class SeatPurchaseIntegrationTest {

    private static final String PREFIX = "contract-seat-test-";

    @Autowired private JdbcTemplate jdbc;
    @Autowired private SeatPurchaseService purchases;
    @MockitoBean private StripeSeatGateway stripe;
    @MockitoBean private SubscriptionCatalogPriceResolver contractPrices;

    @BeforeEach
    void prepare() {
        clean();
        when(contractPrices.resolve(anyLong(), anyString(), eq("extra_seat"), anyString()))
            .thenReturn("price_agreed_catalog_seat");
        when(stripe.setExtraSeatQuantity(any(), anyString())).thenAnswer(invocation -> {
            var command = invocation.getArgument(0, StripeSeatGateway.Command.class);
            return new StripeSeatGateway.Result(command.quantity() == 0 ? null : "si_agreed_seat", command.quantity());
        });
    }

    @AfterEach
    void cleanup() {
        clean();
    }

    @ParameterizedTest
    @ValueSource(strings = {"MONTH", "YEAR"})
    void newSeatUsesTheSubscriptionsCatalogInsteadOfEnvironmentPrices(String interval) {
        var tenant = tenant(interval, null);
        var response = purchases.setExtraSeats(tenant.companyId(), tenant.ownerId(), 2, key());

        var command = ArgumentCaptor.forClass(StripeSeatGateway.Command.class);
        verify(stripe).setExtraSeatQuantity(command.capture(), anyString());
        verify(contractPrices).resolve(tenant.companyId(), tenant.subscriptionId(), "extra_seat", interval);
        assertThat(command.getValue()).isEqualTo(new StripeSeatGateway.Command(
            tenant.subscriptionId(), null, "price_agreed_catalog_seat", 2));
        assertThat(response).containsEntry("purchased_extra", 2).containsEntry("charged_now", false)
            .containsEntry("change_timing", "NEXT_INVOICE");
        assertThat(jdbc.queryForObject("SELECT subtotal_amount_cents FROM company_billing_subscriptions WHERE company_id = ?",
            Long.class, tenant.companyId())).isEqualTo(9900L);
    }

    @ParameterizedTest
    @ValueSource(ints = {0, 3})
    void existingItemKeepsItsPriceForQuantityChangesAndRemoval(int target) {
        var tenant = tenant("MONTH", "si_agreed_seat");
        purchases.setExtraSeats(tenant.companyId(), tenant.ownerId(), target, key());

        verifyNoInteractions(contractPrices);
        verify(stripe).setExtraSeatQuantity(eq(new StripeSeatGateway.Command(
            tenant.subscriptionId(), "si_agreed_seat", null, target)), anyString());
    }

    @Test
    void missingContractPriceFailsBeforeProviderCallOrSeatMutation() {
        var tenant = tenant("MONTH", null);
        when(contractPrices.resolve(tenant.companyId(), tenant.subscriptionId(), "extra_seat", "MONTH"))
            .thenThrow(new IllegalStateException("No verified price in the subscription catalog."));

        assertThatThrownBy(() -> purchases.setExtraSeats(tenant.companyId(), tenant.ownerId(), 2, key()))
            .isInstanceOf(IllegalStateException.class).hasMessageContaining("subscription catalog");

        verifyNoInteractions(stripe);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM company_seat_mutations WHERE company_id = ?",
            Integer.class, tenant.companyId())).isZero();
        assertThat(jdbc.queryForObject("SELECT purchased_extra_seats FROM company_seat_states WHERE company_id = ?",
            Integer.class, tenant.companyId())).isZero();
    }

    @Test
    void completedReplayDoesNotResolveOrChargeAgain() {
        var tenant = tenant("MONTH", null);
        var idempotencyKey = key();
        purchases.setExtraSeats(tenant.companyId(), tenant.ownerId(), 2, idempotencyKey);
        var replay = purchases.setExtraSeats(tenant.companyId(), tenant.ownerId(), 2, idempotencyKey);

        assertThat(replay).containsEntry("idempotent_replay", true);
        verify(contractPrices, times(1)).resolve(anyLong(), anyString(), anyString(), anyString());
        verify(stripe, times(1)).setExtraSeatQuantity(any(), anyString());
    }

    @Test
    void anotherCompanyOwnerCannotChangeTheSubscription() {
        var tenant = tenant("MONTH", null);
        var other = tenant("MONTH", null);

        assertThatThrownBy(() -> purchases.setExtraSeats(tenant.companyId(), other.ownerId(), 2, key()))
            .isInstanceOf(SeatPurchaseForbiddenException.class);
        verifyNoInteractions(contractPrices, stripe);
    }

    @Test
    void retryKeepsTheSamePriceAndProviderIdempotencyKey() {
        var tenant = tenant("MONTH", null);
        var idempotencyKey = key();
        doThrow(new IllegalStateException("Provider unavailable"))
            .doReturn(new StripeSeatGateway.Result("si_agreed_seat", 2))
            .when(stripe).setExtraSeatQuantity(any(), anyString());

        assertThatThrownBy(() -> purchases.setExtraSeats(tenant.companyId(), tenant.ownerId(), 2, idempotencyKey))
            .isInstanceOf(IllegalStateException.class);
        purchases.setExtraSeats(tenant.companyId(), tenant.ownerId(), 2, idempotencyKey);

        var commands = ArgumentCaptor.forClass(StripeSeatGateway.Command.class);
        var keys = ArgumentCaptor.forClass(String.class);
        verify(stripe, times(2)).setExtraSeatQuantity(commands.capture(), keys.capture());
        assertThat(commands.getAllValues().getFirst()).isEqualTo(commands.getAllValues().getLast());
        assertThat(keys.getAllValues().getFirst()).isEqualTo(keys.getAllValues().getLast());
    }

    private Tenant tenant(String interval, String itemId) {
        var name = PREFIX + key();
        var email = name + "@example.com";
        jdbc.update("INSERT INTO companies (name) VALUES (?)", name);
        var companyId = jdbc.queryForObject("SELECT id FROM companies WHERE name = ?", Long.class, name);
        jdbc.update("INSERT INTO users (email, password_hash, full_name) VALUES (?, 'unused-test-hash', 'Seat Owner')", email);
        var ownerId = jdbc.queryForObject("SELECT id FROM users WHERE email = ?", Long.class, email);
        jdbc.update("INSERT INTO user_companies (user_id, company_id, role, status, visibility) VALUES (?, ?, 'owner', 'active', 'all')",
            ownerId, companyId);
        var membershipId = jdbc.queryForObject("SELECT id FROM user_companies WHERE user_id = ? AND company_id = ?",
            Long.class, ownerId, companyId);
        jdbc.update("INSERT INTO company_ownerships (company_id, owner_user_id, owner_user_company_id) VALUES (?, ?, ?)",
            companyId, ownerId, membershipId);
        jdbc.update("INSERT INTO company_seat_states (company_id, included_seats, purchased_extra_seats) VALUES (?, 5, ?)",
            companyId, itemId == null ? 0 : 1);
        var subscriptionId = "sub_" + key();
        jdbc.update("""
            INSERT INTO company_billing_subscriptions (stripe_subscription_id, company_id, billing_interval,
                status, currency, subtotal_amount_cents, stripe_extra_seat_item_id, last_event_id, last_event_created_at)
            VALUES (?, ?, ?, 'active', 'USD', 9900, ?, ?, CURRENT_TIMESTAMP(6))
            """, subscriptionId, companyId, interval, itemId, "evt_" + key());
        return new Tenant(companyId, ownerId, subscriptionId);
    }

    private void clean() {
        jdbc.update("DELETE FROM company_billing_subscriptions WHERE company_id IN (SELECT id FROM companies WHERE name LIKE ?)", PREFIX + "%");
        jdbc.update("DELETE FROM company_ownerships WHERE company_id IN (SELECT id FROM companies WHERE name LIKE ?)", PREFIX + "%");
        jdbc.update("DELETE FROM user_companies WHERE company_id IN (SELECT id FROM companies WHERE name LIKE ?)", PREFIX + "%");
        jdbc.update("DELETE FROM companies WHERE name LIKE ?", PREFIX + "%");
        jdbc.update("DELETE FROM users WHERE email LIKE ?", PREFIX + "%");
    }

    private String key() {
        return UUID.randomUUID().toString().replace("-", "");
    }

    private record Tenant(long companyId, long ownerId, String subscriptionId) {}
}
