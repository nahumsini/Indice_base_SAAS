package com.indice.erp.billing.subscription;

import com.indice.erp.billing.BillingHashing;
import com.indice.erp.billing.catalog.CommercialOfferSelection;
import com.indice.erp.platformadmin.PlatformAdminService;
import com.indice.erp.platformadmin.PlatformAuditService;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;

@Service
public class BillingSelectionChangeService {

    private final JdbcTemplate jdbc;
    private final TransactionTemplate transactions;
    private final PlatformAdminService platformAdmin;
    private final PlatformAuditService audit;

    public BillingSelectionChangeService(
        JdbcTemplate jdbc,
        TransactionTemplate transactions,
        PlatformAdminService platformAdmin,
        PlatformAuditService audit
    ) {
        this.jdbc = jdbc;
        this.transactions = transactions;
        this.platformAdmin = platformAdmin;
        this.audit = audit;
    }

    public StoredChange draft(long companyId) {
        return active("CHECKOUT_DRAFT", companyId, null);
    }

    public StoredChange scheduled(long companyId, long subscriptionId) {
        return active("RENEWAL", companyId, subscriptionId);
    }

    public StoredChange renewalTarget(long companyId, long subscriptionId) {
        var ids = jdbc.query(
            """
                SELECT id FROM company_billing_selection_changes
                WHERE company_id = ? AND subscription_id = ? AND change_kind = 'RENEWAL'
                  AND status IN ('PENDING_STRIPE', 'SCHEDULED')
                ORDER BY FIELD(status, 'PENDING_STRIPE', 'SCHEDULED'), id DESC
                LIMIT 1
                """,
            (rs, rowNum) -> rs.getLong(1),
            companyId,
            subscriptionId
        );
        return ids.isEmpty() ? null : byId(ids.getFirst());
    }

    public StoredChange saveDraft(
        long companyId,
        long actorUserId,
        String idempotencyKey,
        CommercialOfferSelection selection
    ) {
        var hash = idempotencyHash(companyId, idempotencyKey);
        var fingerprint = fingerprint(selection);
        var replay = byIdempotency(hash);
        if (replay != null) return requireReplay(replay, companyId, "CHECKOUT_DRAFT", fingerprint);

        return transactions.execute(status -> {
            var lockedReplay = byIdempotency(hash);
            if (lockedReplay != null) {
                return requireReplay(lockedReplay, companyId, "CHECKOUT_DRAFT", fingerprint);
            }
            jdbc.update(
                "UPDATE company_billing_selection_changes SET status = 'SUPERSEDED', active_scope = NULL WHERE company_id = ? AND change_kind = 'CHECKOUT_DRAFT' AND status = 'DRAFT'",
                companyId
            );
            var id = insert(
                companyId, null, "CHECKOUT_DRAFT", "DRAFT", "draft:" + companyId,
                null, actorUserId, authority(actorUserId), hash, fingerprint, selection
            );
            insertProducts(id, selection);
            return byId(id);
        });
    }

    public PreparedChange prepareRenewal(
        long companyId,
        long subscriptionId,
        long actorUserId,
        String idempotencyKey,
        Instant effectiveAt,
        CommercialOfferSelection selection
    ) {
        if (effectiveAt == null) {
            throw new IllegalStateException("Stripe no informó la fecha de corte de la suscripción.");
        }
        var hash = idempotencyHash(companyId, idempotencyKey);
        var fingerprint = fingerprint(selection);
        var replay = byIdempotency(hash);
        if (replay != null) {
            return prepareReplay(replay, companyId, subscriptionId, fingerprint);
        }

        try {
            var created = transactions.execute(status -> {
                jdbc.queryForObject(
                    "SELECT id FROM company_billing_subscriptions WHERE id = ? AND company_id = ? FOR UPDATE",
                    Long.class,
                    subscriptionId,
                    companyId
                );
                var lockedReplay = byIdempotency(hash);
                if (lockedReplay != null) {
                    return prepareReplay(lockedReplay, companyId, subscriptionId, fingerprint);
                }
                var inFlightIds = jdbc.query(
                    "SELECT id FROM company_billing_selection_changes WHERE subscription_id = ? AND status = 'PENDING_STRIPE' FOR UPDATE",
                    (rs, rowNum) -> rs.getLong(1),
                    subscriptionId
                );
                if (!inFlightIds.isEmpty()) {
                    var inFlight = byId(inFlightIds.getFirst());
                    if (fingerprint.equals(inFlight.fingerprint())
                        && effectiveAt.equals(inFlight.effectiveAt())) {
                        return new PreparedChange(inFlight, true, false);
                    }
                    throw new IllegalStateException("Ya hay un cambio comercial comunicándose con Stripe. Intenta nuevamente en unos segundos.");
                }
                var scheduledCutoffs = jdbc.query(
                    "SELECT effective_at FROM company_billing_selection_changes WHERE subscription_id = ? AND status = 'SCHEDULED' FOR UPDATE",
                    (rs, rowNum) -> instant(rs.getTimestamp(1)),
                    subscriptionId
                );
                if (scheduledCutoffs.stream().anyMatch(cutoff -> !effectiveAt.equals(cutoff))) {
                    throw new IllegalStateException(
                        "Hay un cambio de un corte anterior esperando confirmación de pago. Resuelve esa factura antes de programar otro."
                    );
                }
                var id = insert(
                    companyId, subscriptionId, "RENEWAL", "PENDING_STRIPE",
                    "renewal-write:" + subscriptionId, effectiveAt, actorUserId, authority(actorUserId),
                    hash, fingerprint, selection
                );
                insertProducts(id, selection);
                return new PreparedChange(byId(id), false, false);
            });
            if (created == null) throw new IllegalStateException("No se pudo preparar el cambio comercial.");
            return created;
        } catch (DuplicateKeyException conflict) {
            throw new IllegalStateException("Ya hay un cambio comercial en proceso para esta fecha de corte.", conflict);
        }
    }

    public StoredChange markStripeScheduled(long changeId) {
        return transactions.execute(status -> {
            var change = byIdForUpdate(changeId);
            if (change == null) throw new IllegalStateException("El cambio comercial ya no existe.");
            if ("SCHEDULED".equals(change.status())) return change;
            if (!"PENDING_STRIPE".equals(change.status())) {
                throw new IllegalStateException("El cambio comercial no puede programarse en su estado actual.");
            }
            jdbc.update(
                "UPDATE company_billing_selection_changes SET status = 'SUPERSEDED', active_scope = NULL, superseded_by_change_id = ? WHERE subscription_id = ? AND status = 'SCHEDULED' AND id <> ?",
                change.id(), change.subscriptionId(), change.id()
            );
            jdbc.update(
                "UPDATE company_billing_selection_changes SET status = 'SCHEDULED', active_scope = ?, stripe_applied_at = CURRENT_TIMESTAMP(6), failure_code = NULL, failure_message = NULL WHERE id = ?",
                "renewal:" + change.subscriptionId(),
                change.id()
            );
            return byId(change.id());
        });
    }

    public void markFailed(long changeId, RuntimeException failure) {
        var code = failure.getClass().getSimpleName();
        var message = failure.getMessage() == null ? "Stripe rechazó el cambio." : failure.getMessage();
        if (message.length() > 500) message = message.substring(0, 500);
        jdbc.update(
            "UPDATE company_billing_selection_changes SET status = 'FAILED', active_scope = NULL, failure_code = ?, failure_message = ? WHERE id = ? AND status = 'PENDING_STRIPE'",
            code, message, changeId
        );
    }

    public boolean applyDue(
        long companyId,
        String stripeSubscriptionId,
        String sourceEventId,
        Instant invoicePeriodStartsAt
    ) {
        if (stripeSubscriptionId == null || stripeSubscriptionId.isBlank() || invoicePeriodStartsAt == null) {
            return false;
        }
        var cutoff = invoicePeriodStartsAt;
        var applied = transactions.execute(status -> {
            var affected = new LinkedHashSet<Long>();
            var rows = jdbc.query(
                """
                    SELECT id
                    FROM company_billing_selection_changes
                    WHERE company_id = ? AND change_kind = 'RENEWAL' AND status = 'SCHEDULED'
                      AND subscription_id = (
                          SELECT id FROM company_billing_subscriptions
                          WHERE company_id = ? AND stripe_subscription_id = ?
                          ORDER BY id DESC LIMIT 1
                      )
                      AND effective_at <= ?
                    ORDER BY effective_at DESC, id DESC
                    LIMIT 1
                    FOR UPDATE
                    """,
                (rs, rowNum) -> rs.getLong(1),
                companyId,
                companyId,
                stripeSubscriptionId,
                Timestamp.from(cutoff)
            );
            if (rows.isEmpty()) return false;
            var change = byId(rows.getFirst());
            var oldIds = productIdsForSubscription(change.subscriptionId());
            var newIds = change.products().stream().map(StoredProduct::id).toList();
            affected.addAll(oldIds);
            affected.addAll(newIds);
            jdbc.update(
                """
                    UPDATE company_billing_subscriptions
                    SET catalog_version_id = ?, offer_code = ?, billing_interval = ?, currency = ?,
                        included_seats = ?, extra_seats = ?, subtotal_amount_cents = ?,
                        discount_amount_cents = ?, promotion_code = ?
                    WHERE id = ? AND company_id = ?
                    """,
                change.catalogVersionId(), change.offerCode(), change.billingInterval(), change.currency(),
                change.includedSeats(), change.extraSeats(), change.subtotalAmountCents(),
                change.discountAmountCents(), change.promotionCode(), change.subscriptionId(), companyId
            );
            jdbc.update("DELETE FROM company_billing_subscription_products WHERE subscription_id = ?", change.subscriptionId());
            for (var product : change.products()) {
                jdbc.update(
                    "INSERT INTO company_billing_subscription_products (subscription_id, catalog_product_id, source) VALUES (?, ?, 'SCHEDULED_CHANGE')",
                    change.subscriptionId(), product.id()
                );
            }
            jdbc.update(
                """
                    INSERT INTO company_seat_states (
                        company_id, included_seats, purchased_extra_seats, reserved_seats, version
                    ) VALUES (?, ?, ?, 0, 0)
                    ON DUPLICATE KEY UPDATE included_seats = VALUES(included_seats),
                        purchased_extra_seats = VALUES(purchased_extra_seats), version = version + 1
                    """,
                companyId, change.includedSeats(), change.extraSeats()
            );
            jdbc.update(
                "UPDATE company_billing_selection_changes SET status = 'APPLIED', active_scope = NULL, applied_at = CURRENT_TIMESTAMP(6), applied_event_id = ? WHERE id = ?",
                sourceEventId, change.id()
            );
            affected.forEach(productId -> platformAdmin.synchronizeProductModuleAccess(companyId, productId));
            audit.record(
                change.requestedByUserId(), "BILLING_SELECTION_CHANGE_APPLIED", "COMPANY",
                Long.toString(companyId), companyId, "SUCCESS",
                Map.of(
                    "stripe_event_id", sourceEventId == null ? "" : sourceEventId,
                    "effective_at", cutoff.toString()
                )
            );
            return true;
        });
        return Boolean.TRUE.equals(applied);
    }

    public void completeCheckoutDraft(long companyId) {
        jdbc.update(
            "UPDATE company_billing_selection_changes SET status = 'APPLIED', active_scope = NULL, applied_at = CURRENT_TIMESTAMP(6) WHERE company_id = ? AND change_kind = 'CHECKOUT_DRAFT' AND status = 'DRAFT'",
            companyId
        );
    }

    private StoredChange active(String kind, long companyId, Long subscriptionId) {
        var sql = subscriptionId == null
            ? "SELECT id FROM company_billing_selection_changes WHERE company_id = ? AND change_kind = ? AND status = 'DRAFT' ORDER BY id DESC LIMIT 1"
            : "SELECT id FROM company_billing_selection_changes WHERE company_id = ? AND subscription_id = ? AND change_kind = ? AND status = 'SCHEDULED' ORDER BY id DESC LIMIT 1";
        var ids = subscriptionId == null
            ? jdbc.query(sql, (rs, rowNum) -> rs.getLong(1), companyId, kind)
            : jdbc.query(sql, (rs, rowNum) -> rs.getLong(1), companyId, subscriptionId, kind);
        return ids.isEmpty() ? null : byId(ids.getFirst());
    }

    private StoredChange byId(long id) {
        return jdbc.query(
            selectSql() + " WHERE change_row.id = ?",
            (rs, rowNum) -> row(rs),
            id
        ).stream().findFirst().orElse(null);
    }

    private StoredChange byIdForUpdate(long id) {
        return jdbc.query(
            "SELECT id FROM company_billing_selection_changes WHERE id = ? FOR UPDATE",
            (rs, rowNum) -> rs.getLong(1), id
        ).stream().findFirst().map(this::byId).orElse(null);
    }

    private StoredChange byIdempotency(String hash) {
        return jdbc.query(
            selectSql() + " WHERE change_row.idempotency_key_hash = ?",
            (rs, rowNum) -> row(rs),
            hash
        ).stream().findFirst().orElse(null);
    }

    private StoredChange requireReplay(StoredChange change, long companyId, String kind, String fingerprint) {
        if (change.companyId() != companyId || !kind.equals(change.kind()) || !fingerprint.equals(change.fingerprint())) {
            throw new IllegalStateException("La llave de idempotencia ya fue usada con otra selección comercial.");
        }
        return change;
    }

    private PreparedChange prepareReplay(
        StoredChange replay,
        long companyId,
        long subscriptionId,
        String fingerprint
    ) {
        var checked = requireReplay(replay, companyId, "RENEWAL", fingerprint);
        if ("FAILED".equals(checked.status())) {
            reopen(checked.id(), subscriptionId);
            checked = byId(checked.id());
        }
        // PENDING_STRIPE is the only replay state allowed to retry the same
        // idempotent Stripe write. Terminal and superseded rows are read-only.
        return new PreparedChange(
            checked,
            true,
            !"PENDING_STRIPE".equals(checked.status())
        );
    }

    private void reopen(long changeId, long subscriptionId) {
        try {
            jdbc.update(
                "UPDATE company_billing_selection_changes SET status = 'PENDING_STRIPE', active_scope = ?, failure_code = NULL, failure_message = NULL WHERE id = ? AND status = 'FAILED'",
                "renewal-write:" + subscriptionId, changeId
            );
        } catch (DuplicateKeyException conflict) {
            throw new IllegalStateException("Ya hay otro cambio comercial en proceso.", conflict);
        }
    }

    private long insert(
        long companyId,
        Long subscriptionId,
        String kind,
        String status,
        String activeScope,
        Instant effectiveAt,
        long actorUserId,
        String authority,
        String idempotencyHash,
        String fingerprint,
        CommercialOfferSelection selection
    ) {
        jdbc.update(
            """
                INSERT INTO company_billing_selection_changes (
                    public_reference, company_id, subscription_id, change_kind, status, active_scope,
                    effective_at, catalog_version_id, offer_code, billing_interval, currency,
                    included_seats, extra_seats, base_amount_cents, extra_seat_unit_amount_cents,
                    complementary_amount_cents, subtotal_amount_cents, discount_amount_cents,
                    estimated_amount_cents, promotion_code, external_promotion_code_id,
                    request_fingerprint, idempotency_key_hash, requested_by_user_id, requested_by_authority
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
            UUID.randomUUID().toString(), companyId, subscriptionId, kind, status, activeScope,
            effectiveAt == null ? null : Timestamp.from(effectiveAt), selection.catalogVersionId(),
            selection.offerCode(), selection.billingInterval().name(), selection.currency(),
            selection.includedSeats(), selection.extraSeats(), selection.baseAmountCents(),
            selection.extraSeatUnitAmountCents(), selection.complementaryAmountCents(),
            selection.subtotalAmountCents(), selection.discountAmountCents(), selection.estimatedAmountCents(),
            selection.promotionCode(), selection.externalPromotionCodeId(), fingerprint, idempotencyHash,
            actorUserId, authority
        );
        var id = jdbc.queryForObject("SELECT LAST_INSERT_ID()", Long.class);
        if (id == null) throw new IllegalStateException("No se pudo registrar el cambio comercial.");
        return id;
    }

    private void insertProducts(long changeId, CommercialOfferSelection selection) {
        var order = 0;
        for (var product : selection.products()) {
            jdbc.update(
                "INSERT INTO company_billing_selection_change_products (change_id, catalog_product_id, sort_order) VALUES (?, ?, ?)",
                changeId, product.id(), order++
            );
        }
    }

    private List<Long> productIdsForSubscription(Long subscriptionId) {
        if (subscriptionId == null) return List.of();
        return jdbc.query(
            "SELECT catalog_product_id FROM company_billing_subscription_products WHERE subscription_id = ?",
            (rs, rowNum) -> rs.getLong(1), subscriptionId
        );
    }

    private StoredChange row(ResultSet rs) throws SQLException {
        var id = rs.getLong("id");
        var products = jdbc.query(
            """
                SELECT product.id, product.product_code, product.display_name, product.product_type,
                       product.commercial_kind
                FROM company_billing_selection_change_products selected
                JOIN billing_catalog_products product ON product.id = selected.catalog_product_id
                WHERE selected.change_id = ?
                ORDER BY selected.sort_order, product.id
                """,
            (productRs, rowNum) -> new StoredProduct(
                productRs.getLong("id"), productRs.getString("product_code"),
                productRs.getString("display_name"), productRs.getString("product_type"),
                productRs.getString("commercial_kind")
            ),
            id
        );
        return new StoredChange(
            id, rs.getString("public_reference"), rs.getLong("company_id"),
            (Long) rs.getObject("subscription_id"), rs.getString("change_kind"), rs.getString("status"),
            instant(rs.getTimestamp("effective_at")), rs.getLong("catalog_version_id"),
            rs.getString("catalog_version"), rs.getString("offer_code"), rs.getString("billing_interval"),
            rs.getString("currency"), rs.getInt("included_seats"), rs.getInt("extra_seats"),
            (Long) rs.getObject("base_amount_cents"), rs.getLong("extra_seat_unit_amount_cents"),
            rs.getLong("complementary_amount_cents"), (Long) rs.getObject("subtotal_amount_cents"),
            rs.getLong("discount_amount_cents"), (Long) rs.getObject("estimated_amount_cents"),
            rs.getString("promotion_code"), rs.getString("external_promotion_code_id"),
            rs.getString("request_fingerprint"), rs.getLong("requested_by_user_id"),
            rs.getString("requested_by_authority"), List.copyOf(products)
        );
    }

    private String selectSql() {
        return """
            SELECT change_row.*, version_row.version_code AS catalog_version
            FROM company_billing_selection_changes change_row
            JOIN billing_catalog_versions version_row ON version_row.id = change_row.catalog_version_id
            """;
    }

    private String authority(long actorUserId) {
        var root = jdbc.queryForObject(
            "SELECT COUNT(*) FROM platform_administrators WHERE user_id = ? AND status = 'ACTIVE' AND platform_role = 'PLATFORM_ROOT'",
            Integer.class,
            actorUserId
        );
        return root != null && root > 0 ? "PLATFORM_ROOT" : "CUSTOMER";
    }

    private String idempotencyHash(long companyId, String key) {
        return BillingHashing.sha256("billing-selection-change:" + companyId + ":" + key);
    }

    private String fingerprint(CommercialOfferSelection selection) {
        var codes = new ArrayList<>(selection.products().stream().map(CommercialOfferSelection.Product::code).toList());
        codes.replaceAll(value -> value.toLowerCase(Locale.ROOT));
        codes.sort(String::compareTo);
        return BillingHashing.sha256(String.join("|",
            selection.catalogVersion(), selection.offerCode(), selection.billingInterval().name(),
            Integer.toString(selection.extraSeats()), Long.toString(selection.estimatedAmountCents() == null ? -1 : selection.estimatedAmountCents()),
            selection.promotionCode() == null ? "" : selection.promotionCode(), String.join(",", codes)
        ));
    }

    private Instant instant(Timestamp value) {
        return value == null ? null : value.toInstant();
    }

    public record PreparedChange(StoredChange change, boolean replayed, boolean alreadyScheduled) {
    }

    public record StoredProduct(long id, String code, String displayName, String productType, String commercialKind) {
    }

    public record StoredChange(
        long id,
        String reference,
        long companyId,
        Long subscriptionId,
        String kind,
        String status,
        Instant effectiveAt,
        long catalogVersionId,
        String catalogVersion,
        String offerCode,
        String billingInterval,
        String currency,
        int includedSeats,
        int extraSeats,
        Long baseAmountCents,
        long extraSeatUnitAmountCents,
        long complementaryAmountCents,
        Long subtotalAmountCents,
        long discountAmountCents,
        Long estimatedAmountCents,
        String promotionCode,
        String externalPromotionCodeId,
        String fingerprint,
        long requestedByUserId,
        String requestedByAuthority,
        List<StoredProduct> products
    ) {
        public List<String> productCodes() {
            return products.stream().map(StoredProduct::code).toList();
        }
    }
}
