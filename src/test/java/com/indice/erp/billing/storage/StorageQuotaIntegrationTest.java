package com.indice.erp.billing.storage;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.clearInvocations;
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.indice.erp.storage.ObjectStorageService;
import com.indice.erp.storage.StoredObjectMetadata;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.jdbc.core.JdbcTemplate;

@SpringBootTest(properties = {
    "app.billing.storage.enforcement-enabled=true",
    "app.billing.storage.included-bytes=100",
    "app.billing.storage.block-bytes=50",
    "app.billing.stripe.price-storage-block-monthly=price_storage_test"
})
class StorageQuotaIntegrationTest {

    private static final String COMPANY_PREFIX = "phase7-storage-test-";
    private static final String EMAIL_PREFIX = "phase7-storage-test-";

    @Autowired
    private JdbcTemplate jdbc;

    @Autowired
    private StorageQuotaService storage;

    @Autowired
    private StorageBlockPurchaseService purchases;

    @MockBean
    private ObjectStorageService objectStorage;

    @MockBean
    private StripeStorageGateway stripe;

    private final Map<String, Long> objectSizes = new ConcurrentHashMap<>();

    @BeforeEach
    void prepare() {
        cleanTestState();
        objectSizes.clear();
        when(objectStorage.isEnabled()).thenReturn(true);
        when(objectStorage.objectExists(anyString(), anyString()))
            .thenAnswer(invocation -> objectSizes.containsKey(invocation.getArgument(1, String.class)));
        when(objectStorage.objectMetadata(anyString(), anyString()))
            .thenAnswer(invocation -> new StoredObjectMetadata(
                objectSizes.getOrDefault(invocation.getArgument(1, String.class), 0L),
                "application/pdf"));
        when(stripe.setBlockQuantity(any(), anyString()))
            .thenAnswer(invocation -> {
                var command = invocation.getArgument(0, StripeStorageGateway.Command.class);
                return new StripeStorageGateway.Result("si_storage_test", command.quantity());
            });
    }

    @AfterEach
    void cleanAfter() {
        cleanTestState();
    }

    @Test
    void reservesCommitsAndReleasesWithoutDoubleCounting() {
        var tenant = premiumTenant("ledger");
        var first = storage.reserve(tenant.companyId(), "HR", "documents", "tenant/first.pdf", 60);
        var replay = storage.reserve(tenant.companyId(), "HR", "documents", "tenant/first.pdf", 60);

        assertThat(replay.id()).isEqualTo(first.id());
        assertThat(storage.snapshot(tenant.companyId()).reservedBytes()).isEqualTo(60);
        assertThatThrownBy(() -> storage.reserve(
            tenant.companyId(), "HR", "documents", "tenant/second.pdf", 50))
            .isInstanceOf(StorageQuotaExceededException.class);

        objectSizes.put("tenant/first.pdf", 60L);
        storage.commitStoredObject(tenant.companyId(), "documents", "tenant/first.pdf", 60);
        storage.commitStoredObject(tenant.companyId(), "documents", "tenant/first.pdf", 60);

        assertThat(storage.snapshot(tenant.companyId())).satisfies(snapshot -> {
            assertThat(snapshot.usedBytes()).isEqualTo(60);
            assertThat(snapshot.reservedBytes()).isZero();
            assertThat(snapshot.availableBytes()).isEqualTo(40);
        });

        storage.release(tenant.companyId(), "tenant/first.pdf", "deleted_by_user");
        storage.release(tenant.companyId(), "tenant/first.pdf", "duplicate_delete");
        assertThat(storage.snapshot(tenant.companyId()).usedBytes()).isZero();
    }

    @Test
    void ownerCanPurchaseBlocksExactlyOnceAndCourtesyBlocksIncreaseCapacity() {
        var tenant = premiumTenant("purchase");
        jdbc.update(
            """
                INSERT INTO company_benefit_grants (
                    public_reference, company_id, benefit_type, quantity, source_type, status,
                    reason, idempotency_key_hash, created_by_user_id
                ) VALUES (?, ?, 'STORAGE', 2, 'COURTESY', 'ACTIVE', ?, ?, ?)
                """,
            reference(), tenant.companyId(), "Phase 7 storage test", reference() + reference(), tenant.userId());

        var first = purchases.setPurchasedBlocks(
            tenant.companyId(), tenant.userId(), 2, "storage-purchase-test-key");
        clearInvocations(stripe);
        var replay = purchases.setPurchasedBlocks(
            tenant.companyId(), tenant.userId(), 2, "storage-purchase-test-key");

        assertThat(first.get("limit_bytes")).isEqualTo(300L);
        assertThat(replay.get("idempotent_replay")).isEqualTo(true);
        verify(stripe, times(0)).setBlockQuantity(any(), anyString());
        assertThat(jdbc.queryForObject(
            "SELECT stripe_storage_item_id FROM company_billing_subscriptions WHERE company_id = ?",
            String.class, tenant.companyId())).isEqualTo("si_storage_test");
        assertThatThrownBy(() -> purchases.setPurchasedBlocks(
            tenant.companyId(), tenant.userId(), 3, "storage-purchase-test-key"))
            .isInstanceOf(IllegalStateException.class)
            .hasMessageContaining("another storage quantity");
    }

    @Test
    void nonOwnerCannotReadOrChangeStorageCommercialSettings() {
        var tenant = premiumTenant("authorization");
        jdbc.update(
            "INSERT INTO users (email, password_hash, full_name) VALUES (?, '$2a$10$phase7-test', 'Other User')",
            EMAIL_PREFIX + UUID.randomUUID() + "@example.com");
        var otherUserId = jdbc.queryForObject("SELECT LAST_INSERT_ID()", Long.class);

        assertThatThrownBy(() -> purchases.snapshot(tenant.companyId(), otherUserId))
            .isInstanceOf(StoragePurchaseForbiddenException.class);
        assertThatThrownBy(() -> purchases.setPurchasedBlocks(
            tenant.companyId(), otherUserId, 1, "forbidden-storage-change"))
            .isInstanceOf(StoragePurchaseForbiddenException.class);
    }

    @Test
    void expiresReservationsWithoutLeavingCapacityOrLedgerBehind() {
        var tenant = premiumTenant("expiration");
        storage.reserve(tenant.companyId(), "HR", "documents", "tenant/expired.pdf", 40);
        objectSizes.put("tenant/expired.pdf", 40L);
        jdbc.update(
            "UPDATE company_storage_objects SET expires_at = TIMESTAMPADD(SECOND, -1, CURRENT_TIMESTAMP(6)) WHERE company_id = ?",
            tenant.companyId());

        assertThat(storage.expireReservations()).isGreaterThanOrEqualTo(1);
        assertThat(storage.snapshot(tenant.companyId()).reservedBytes()).isZero();
        assertThat(jdbc.queryForObject(
            "SELECT status FROM company_storage_objects WHERE company_id = ? AND object_key = ?",
            String.class, tenant.companyId(), "tenant/expired.pdf")).isEqualTo("EXPIRED");
        assertThat(jdbc.queryForObject(
            "SELECT COUNT(*) FROM company_storage_events WHERE company_id = ? AND event_type = 'EXPIRED'",
            Integer.class, tenant.companyId())).isEqualTo(1);
        verify(objectStorage).deleteObject("documents", "tenant/expired.pdf");
    }

    @Test
    void rejectsAnInconsistentStripeStorageResultWithoutChangingCapacity() {
        var tenant = premiumTenant("stripe-result");
        doReturn(new StripeStorageGateway.Result("si_storage_test", 2))
            .when(stripe).setBlockQuantity(any(), anyString());

        assertThatThrownBy(() -> purchases.setPurchasedBlocks(
            tenant.companyId(), tenant.userId(), 1, "inconsistent-stripe-result"))
            .isInstanceOf(IllegalStateException.class)
            .hasMessageContaining("different from the requested");
        assertThat(storage.snapshot(tenant.companyId()).purchasedBlocks()).isZero();
        assertThat(jdbc.queryForObject(
            "SELECT status FROM company_storage_mutations WHERE company_id = ?",
            String.class, tenant.companyId())).isEqualTo("FAILED");
    }

    private Tenant premiumTenant(String label) {
        var suffix = UUID.randomUUID().toString();
        jdbc.update("INSERT INTO companies (name) VALUES (?)", COMPANY_PREFIX + label + "-" + suffix);
        var companyId = jdbc.queryForObject("SELECT LAST_INSERT_ID()", Long.class);
        jdbc.update(
            "INSERT INTO users (email, password_hash, full_name) VALUES (?, '$2a$10$phase7-test', 'Storage Owner')",
            EMAIL_PREFIX + suffix + "@example.com");
        var userId = jdbc.queryForObject("SELECT LAST_INSERT_ID()", Long.class);
        jdbc.update(
            "INSERT INTO user_companies (user_id, company_id, role, status, visibility) VALUES (?, ?, 'owner', 'active', 'all')",
            userId, companyId);
        var membershipId = jdbc.queryForObject("SELECT LAST_INSERT_ID()", Long.class);
        jdbc.update(
            "INSERT INTO company_ownerships (company_id, owner_user_id, owner_user_company_id) VALUES (?, ?, ?)",
            companyId, userId, membershipId);
        jdbc.update(
            "INSERT INTO company_entitlement_policies (company_id, mode, reason) VALUES (?, 'SHADOW', 'phase7 test')",
            companyId);
        storage.initializeCompany(companyId);
        jdbc.update(
            """
                INSERT INTO company_billing_subscriptions (
                    stripe_subscription_id, company_id, billing_interval, status,
                    last_event_id, last_event_created_at
                ) VALUES (?, ?, 'MONTH', 'active', ?, ?)
                """,
            "sub_storage_" + reference(), companyId, "evt_storage_" + reference(), Timestamp.from(Instant.now()));
        return new Tenant(companyId, userId);
    }

    private void cleanTestState() {
        jdbc.update(
            "DELETE FROM company_billing_subscriptions WHERE company_id IN (SELECT id FROM companies WHERE name LIKE ?)",
            COMPANY_PREFIX + "%");
        jdbc.update(
            "DELETE FROM company_ownerships WHERE company_id IN (SELECT id FROM companies WHERE name LIKE ?)",
            COMPANY_PREFIX + "%");
        jdbc.update(
            "DELETE FROM user_companies WHERE company_id IN (SELECT id FROM companies WHERE name LIKE ?)",
            COMPANY_PREFIX + "%");
        jdbc.update("DELETE FROM companies WHERE name LIKE ?", COMPANY_PREFIX + "%");
        jdbc.update("DELETE FROM users WHERE email LIKE ?", EMAIL_PREFIX + "%");
    }

    private String reference() {
        return UUID.randomUUID().toString().replace("-", "").substring(0, 16);
    }

    private record Tenant(long companyId, long userId) {}
}
