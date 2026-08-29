package com.indice.erp.billing.subscription;

import com.indice.erp.billing.BillingHashing;
import com.indice.erp.billing.catalog.CommercialOfferSelection;
import com.indice.erp.billing.catalog.CommercialOfferSelectionService;
import com.indice.erp.billing.seats.SeatService;
import com.indice.erp.billing.stripe.StripeBillingGateway;
import com.indice.erp.billing.stripe.StripePhaseTwoProperties;
import com.indice.erp.platformadmin.PlatformAdminService;
import com.indice.erp.platformadmin.PlatformAuditService;
import com.stripe.exception.StripeException;
import com.stripe.model.SubscriptionItem;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;

@Service
public class BillingProductSelectionService {

    private final JdbcTemplate jdbcTemplate;
    private final TransactionTemplate transactions;
    private final CommercialOfferSelectionService offers;
    private final StripePhaseTwoProperties stripeProperties;
    private final StripeBillingGateway stripeGateway;
    private final SeatService seats;
    private final PlatformAdminService platformAdminService;
    private final PlatformAuditService audit;

    public BillingProductSelectionService(
        JdbcTemplate jdbcTemplate,
        TransactionTemplate transactions,
        CommercialOfferSelectionService offers,
        StripePhaseTwoProperties stripeProperties,
        StripeBillingGateway stripeGateway,
        SeatService seats,
        PlatformAdminService platformAdminService,
        PlatformAuditService audit
    ) {
        this.jdbcTemplate = jdbcTemplate;
        this.transactions = transactions;
        this.offers = offers;
        this.stripeProperties = stripeProperties;
        this.stripeGateway = stripeGateway;
        this.seats = seats;
        this.platformAdminService = platformAdminService;
        this.audit = audit;
    }

    public BillingSelectionResponse current(long companyId) {
        var state = state(companyId);
        var selectedCodes = selectedCodes(companyId, state);
        var interval = state == null ? "MONTH" : state.billingInterval();
        var extraSeats = state == null ? purchasedExtraSeats(companyId) : state.extraSeats();
        var historicalCatalog = state != null
            && state.catalogVersionId() != null
            && !state.catalogVersionId().equals(activeCatalogVersionId());
        CommercialOfferSelection selection = selectedCodes.isEmpty() || historicalCatalog
            ? null
            : offers.select(selectedCodes, interval, extraSeats);
        return response(companyId, state, selection, selectedCodes, false);
    }

    public BillingSelectionResponse preview(long companyId, BillingSelectionRequest request) {
        var state = state(companyId);
        var interval = interval(request, state);
        requireStableActiveInterval(state, interval);
        var extraSeats = requestedExtraSeats(request, state, companyId);
        var selection = offers.select(
            request == null ? null : request.product_codes(), interval, extraSeats,
            request == null ? null : request.promotion_code()
        );
        return response(companyId, state, selection, selection.products().stream().map(CommercialOfferSelection.Product::code).toList(), false);
    }

    public BillingSelectionResponse update(
        long companyId,
        long actorUserId,
        String idempotencyKey,
        BillingSelectionRequest request
    ) {
        var cleanKey = requireIdempotencyKey(idempotencyKey);
        var state = state(companyId);
        var interval = interval(request, state);
        requireStableActiveInterval(state, interval);
        var extraSeats = requestedExtraSeats(request, state, companyId);
        var selection = offers.select(
            request == null ? null : request.product_codes(), interval, extraSeats,
            request == null ? null : request.promotion_code()
        );
        validateCapacity(companyId, selection);
        var oldProductIds = selectedProductIds(companyId, state);
        var selectedProductIds = selection.products().stream().map(CommercialOfferSelection.Product::id).toList();
        var chargedNow = false;

        if (state != null && state.stripeManaged()) {
            chargedNow = updateStripe(state, selection, cleanKey);
            transactions.executeWithoutResult(ignored -> replaceSubscriptionSelection(state, selection));
        } else {
            if (request != null && request.extra_seats() != null && request.extra_seats() != purchasedExtraSeats(companyId)) {
                throw new IllegalStateException("Registra un método de pago antes de cambiar usuarios adicionales.");
            }
            transactions.executeWithoutResult(ignored -> replaceCourtesySelection(
                companyId,
                actorUserId,
                cleanKey,
                selectedProductIds
            ));
        }

        var affected = new LinkedHashSet<Long>();
        affected.addAll(oldProductIds);
        affected.addAll(selectedProductIds);
        affected.forEach(productId -> platformAdminService.synchronizeProductModuleAccess(companyId, productId));
        audit.record(actorUserId, "BILLING_SELECTION_CHANGED", "COMPANY", Long.toString(companyId), companyId, "SUCCESS", Map.of(
            "offer_code", selection.offerCode(),
            "product_codes", selection.products().stream().map(CommercialOfferSelection.Product::code).toList(),
            "extra_seats", selection.extraSeats(),
            "change_timing", timing(state),
            "charged_now", chargedNow
        ));
        return response(
            companyId,
            state(companyId),
            selection,
            selection.products().stream().map(CommercialOfferSelection.Product::code).toList(),
            chargedNow
        );
    }

    private boolean updateStripe(SubscriptionState state, CommercialOfferSelection selection, String idempotencyKey) {
        if (!Set.of("TRIALING", "ACTIVE", "PAST_DUE").contains(state.status())) {
            throw new IllegalStateException("La suscripción no permite modificar módulos en su estado actual.");
        }
        if (selection.lineItems().stream().noneMatch(line -> "BASE".equals(line.itemType()))) {
            return updateVersionedStripeOffer(state, selection, idempotencyKey);
        }
        var basePriceId = resolvedPriceId(
            selection.baseExternalPriceId(), selection.offerCode(), selection.billingInterval().name()
        );
        var seatPriceId = resolvedPriceId(
            selection.extraSeatExternalPriceId(), "extra_seat", selection.billingInterval().name()
        );
        var complementaryProducts = selection.products().stream()
            .filter(CommercialOfferSelection.Product::complementary)
            .toList();
        if (!validStripePrice(basePriceId)
            || (selection.extraSeats() > 0 && !validStripePrice(seatPriceId))
            || complementaryProducts.stream().anyMatch(product -> !validStripePrice(product.externalPriceId()))) {
            throw new IllegalStateException("Los precios de Stripe para esta selección aún no están configurados.");
        }
        try {
            var stripeSubscription = stripeGateway.retrieveSubscription(state.stripeSubscriptionId());
            var items = stripeSubscription.getItems() == null ? List.<SubscriptionItem>of() : stripeSubscription.getItems().getData();
            var mutations = new ArrayList<Map<String, Object>>();
            var currentBaseItem = baseItem(items);
            mutations.add(Map.of("id", currentBaseItem.getId(), "price", basePriceId));
            var seatItem = extraSeatItem(items, state.stripeExtraSeatItemId());
            if (selection.extraSeats() == 0 && seatItem != null) {
                mutations.add(Map.of("id", seatItem.getId(), "deleted", true));
            } else if (selection.extraSeats() > 0 && seatItem != null) {
                mutations.add(Map.of(
                    "id", seatItem.getId(),
                    "price", seatPriceId,
                    "quantity", selection.extraSeats()
                ));
            } else if (selection.extraSeats() > 0) {
                mutations.add(Map.of("price", seatPriceId, "quantity", selection.extraSeats()));
            }
            var complementaryPriceIds = allComplementaryPriceIds();
            var existingComplementary = new LinkedHashMap<String, SubscriptionItem>();
            for (var item : items) {
                if (item.getPrice() == null || item.getPrice().getId() == null) continue;
                var code = complementaryPriceIds.get(item.getPrice().getId());
                if (code != null) existingComplementary.put(code, item);
            }
            for (var product : complementaryProducts) {
                var currentItem = existingComplementary.remove(product.code());
                if (currentItem == null) {
                    mutations.add(Map.of("price", product.externalPriceId(), "quantity", 1));
                } else {
                    mutations.add(Map.of("id", currentItem.getId(), "price", product.externalPriceId(), "quantity", 1));
                }
            }
            existingComplementary.values().forEach(item -> mutations.add(Map.of("id", item.getId(), "deleted", true)));
            var parameters = new LinkedHashMap<String, Object>();
            parameters.put("items", mutations);
            // Access is updated immediately, but Stripe must not create an off-cycle
            // invoice. The full new recurring amount is collected at renewal.
            parameters.put("proration_behavior", "none");
            parameters.put("metadata", Map.of(
                "indice_offer_code", selection.offerCode(),
                "indice_product_codes", String.join(",", selection.products().stream().map(CommercialOfferSelection.Product::code).toList()),
                "indice_change_timing", timing(state)
            ));
            var updatedSubscription = stripeGateway.updateSubscription(
                state.stripeSubscriptionId(),
                parameters,
                "indice.billing.selection." + state.companyId() + "." + idempotencyKey
            );
            synchronizeStripeItems(state, selection, updatedSubscription.getItems() == null
                ? List.of()
                : updatedSubscription.getItems().getData());
            return false;
        } catch (StripeException exception) {
            throw new IllegalStateException("Stripe no pudo actualizar la selección comercial.", exception);
        }
    }

    private boolean updateVersionedStripeOffer(
        SubscriptionState state,
        CommercialOfferSelection selection,
        String idempotencyKey
    ) {
        var desired = new LinkedHashMap<String, CommercialOfferSelection.LineItem>();
        for (var line : selection.lineItems()) {
            if (!validStripePrice(line.externalPriceId())) {
                throw new IllegalStateException("Los precios de Stripe para esta selección aún no están configurados.");
            }
            desired.put(line.billableCode(), line);
        }
        try {
            var stripeSubscription = stripeGateway.retrieveSubscription(state.stripeSubscriptionId());
            var items = stripeSubscription.getItems() == null ? List.<SubscriptionItem>of() : stripeSubscription.getItems().getData();
            var codeByPrice = allCommercialPriceIds();
            var existing = new LinkedHashMap<String, SubscriptionItem>();
            for (var item : items) {
                if (item.getPrice() == null || item.getPrice().getId() == null) continue;
                var code = codeByPrice.get(item.getPrice().getId());
                if (code != null) existing.put(code, item);
            }
            var mutations = new ArrayList<Map<String, Object>>();
            for (var line : desired.values()) {
                var current = existing.remove(line.billableCode());
                if (current == null) {
                    mutations.add(Map.of("price", line.externalPriceId(), "quantity", line.quantity()));
                } else {
                    mutations.add(Map.of(
                        "id", current.getId(), "price", line.externalPriceId(), "quantity", line.quantity()
                    ));
                }
            }
            existing.values().forEach(item -> mutations.add(Map.of("id", item.getId(), "deleted", true)));
            var parameters = new LinkedHashMap<String, Object>();
            parameters.put("items", mutations);
            parameters.put("proration_behavior", "none");
            var metadata = new LinkedHashMap<String, Object>();
            metadata.put("indice_offer_code", selection.offerCode());
            metadata.put(
                "indice_product_codes",
                String.join(",", selection.products().stream().map(CommercialOfferSelection.Product::code).toList())
            );
            metadata.put("indice_change_timing", timing(state));
            if (selection.externalPromotionCodeId() != null && !selection.externalPromotionCodeId().isBlank()) {
                metadata.put("indice_promotion_code", selection.promotionCode());
                parameters.put("discounts", List.of(Map.of("promotion_code", selection.externalPromotionCodeId())));
            } else {
                parameters.put("discounts", List.of());
            }
            parameters.put("metadata", metadata);
            var updated = stripeGateway.updateSubscription(
                state.stripeSubscriptionId(), parameters,
                "indice.billing.selection." + state.companyId() + "." + idempotencyKey
            );
            synchronizeVersionedStripeItems(
                state, selection, updated.getItems() == null ? List.of() : updated.getItems().getData()
            );
            return false;
        } catch (StripeException exception) {
            throw new IllegalStateException("Stripe no pudo actualizar la selección comercial.", exception);
        }
    }

    private void synchronizeVersionedStripeItems(
        SubscriptionState state,
        CommercialOfferSelection selection,
        List<SubscriptionItem> items
    ) {
        jdbcTemplate.update(
            "DELETE FROM company_billing_subscription_items WHERE subscription_id = ? AND item_type <> 'STORAGE'",
            state.id()
        );
        var lineByPrice = new LinkedHashMap<String, CommercialOfferSelection.LineItem>();
        selection.lineItems().forEach(line -> lineByPrice.put(line.externalPriceId(), line));
        for (var item : items) {
            if (item.getPrice() == null) continue;
            var line = lineByPrice.get(item.getPrice().getId());
            if (line == null) continue;
            jdbcTemplate.update(
                "INSERT INTO company_billing_subscription_items (subscription_id, item_type, catalog_product_id, billable_code, billing_interval, external_price_id, stripe_subscription_item_id, quantity, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE')",
                state.id(), "SEAT".equals(line.itemType()) ? "SEAT" : "PRODUCT", line.productId(),
                line.billableCode(), selection.billingInterval().name(), line.externalPriceId(), item.getId(),
                item.getQuantity() == null ? line.quantity() : item.getQuantity().intValue()
            );
        }
    }

    private Map<String, String> allCommercialPriceIds() {
        var rows = jdbcTemplate.query(
            "SELECT external_price_id, billable_code FROM billing_catalog_prices WHERE price_type IN ('BASE', 'ADDON', 'PRODUCT', 'PACKAGE', 'SEAT') AND external_price_id IS NOT NULL",
            (rs, rowNum) -> Map.entry(rs.getString(1), rs.getString(2))
        );
        var result = new LinkedHashMap<String, String>();
        rows.forEach(entry -> result.put(entry.getKey(), entry.getValue()));
        return result;
    }

    private void synchronizeStripeItems(
        SubscriptionState state,
        CommercialOfferSelection selection,
        List<SubscriptionItem> items
    ) {
        jdbcTemplate.update("DELETE FROM company_billing_subscription_items WHERE subscription_id = ?", state.id());
        var productByPrice = new LinkedHashMap<String, CommercialOfferSelection.Product>();
        selection.products().stream()
            .filter(CommercialOfferSelection.Product::complementary)
            .filter(product -> validStripePrice(product.externalPriceId()))
            .forEach(product -> productByPrice.put(product.externalPriceId(), product));
        var basePriceId = resolvedPriceId(selection.baseExternalPriceId(), selection.offerCode(), selection.billingInterval().name());
        var seatPriceId = resolvedPriceId(selection.extraSeatExternalPriceId(), "extra_seat", selection.billingInterval().name());
        for (var item : items) {
            if (item.getPrice() == null || item.getPrice().getId() == null) continue;
            var priceId = item.getPrice().getId();
            var product = productByPrice.get(priceId);
            var type = product != null ? "PRODUCT" : priceId.equals(basePriceId) ? "BASE" : priceId.equals(seatPriceId) ? "SEAT" : null;
            if (type == null) continue;
            var code = product == null ? ("BASE".equals(type) ? selection.offerCode() : "extra_seat") : product.code();
            jdbcTemplate.update(
                "INSERT INTO company_billing_subscription_items (subscription_id, item_type, catalog_product_id, billable_code, billing_interval, external_price_id, stripe_subscription_item_id, quantity, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE')",
                state.id(), type, product == null ? null : product.id(), code,
                selection.billingInterval().name(), priceId, item.getId(), item.getQuantity() == null ? 1 : item.getQuantity().intValue()
            );
        }
    }

    private Map<String, String> allComplementaryPriceIds() {
        var rows = jdbcTemplate.query(
            "SELECT external_price_id, billable_code FROM billing_catalog_prices WHERE price_type = 'ADDON' AND billable_code <> 'extra_seat' AND external_price_id IS NOT NULL",
            (rs, rowNum) -> Map.entry(rs.getString(1), rs.getString(2))
        );
        var result = new LinkedHashMap<String, String>();
        rows.forEach(entry -> result.put(entry.getKey(), entry.getValue()));
        return result;
    }

    private String resolvedPriceId(String catalogPriceId, String billableCode, String interval) {
        return validStripePrice(catalogPriceId) ? catalogPriceId : stripeProperties.priceId(billableCode, interval);
    }

    private void replaceSubscriptionSelection(SubscriptionState state, CommercialOfferSelection selection) {
        jdbcTemplate.update(
            "UPDATE company_billing_subscriptions SET catalog_version_id = ?, offer_code = ?, billing_interval = ?, extra_seats = ?, subtotal_amount_cents = ?, discount_amount_cents = ?, promotion_code = ? WHERE id = ?",
            selection.catalogVersionId(),
            selection.offerCode(),
            selection.billingInterval().name(),
            selection.extraSeats(),
            selection.subtotalAmountCents(),
            selection.discountAmountCents(),
            selection.promotionCode(),
            state.id()
        );
        jdbcTemplate.update("DELETE FROM company_billing_subscription_products WHERE subscription_id = ?", state.id());
        for (var product : selection.products()) {
            jdbcTemplate.update(
                "INSERT INTO company_billing_subscription_products (subscription_id, catalog_product_id, source) VALUES (?, ?, 'SELF_SERVICE')",
                state.id(),
                product.id()
            );
        }
        jdbcTemplate.update(
            "UPDATE company_seat_states SET included_seats = ?, purchased_extra_seats = ?, version = version + 1 WHERE company_id = ?",
            selection.includedSeats(),
            selection.extraSeats(),
            state.companyId()
        );
        if (state.signupIntentId() != null && state.trialStartsAt() != null && state.trialEndsAt() != null) {
            jdbcTemplate.update(
                "DELETE FROM company_trial_product_grants WHERE company_id = ? AND source_signup_intent_id = ?",
                state.companyId(),
                state.signupIntentId()
            );
            for (var product : selection.products()) {
                jdbcTemplate.update(
                    "INSERT INTO company_trial_product_grants (company_id, catalog_product_id, source_signup_intent_id, status, starts_at, ends_at) VALUES (?, ?, ?, 'ACTIVE', ?, ?)",
                    state.companyId(),
                    product.id(),
                    state.signupIntentId(),
                    Timestamp.from(state.trialStartsAt()),
                    Timestamp.from(state.trialEndsAt())
                );
            }
        }
    }

    private void replaceCourtesySelection(long companyId, long actorUserId, String idempotencyKey, List<Long> selectedIds) {
        var current = effectiveCourtesyBenefits(companyId);
        var selected = new LinkedHashSet<>(selectedIds);
        for (var benefit : current) {
            if (!selected.contains(benefit.productId())) {
                jdbcTemplate.update(
                    "UPDATE company_benefit_grants SET status = 'REVOKED', revoked_by_user_id = ?, revoked_at = CURRENT_TIMESTAMP(6) WHERE id = ? AND status = 'ACTIVE'",
                    actorUserId,
                    benefit.id()
                );
            }
        }
        var existingIds = current.stream().map(CourtesyBenefit::productId).collect(java.util.stream.Collectors.toSet());
        var expiry = current.stream().map(CourtesyBenefit::endsAt).filter(java.util.Objects::nonNull).max(Instant::compareTo).orElse(null);
        for (var productId : selected) {
            if (existingIds.contains(productId)) continue;
            var reference = UUID.randomUUID().toString().replace("-", "");
            var hash = BillingHashing.sha256("billing-selection:" + companyId + ":" + idempotencyKey + ":" + productId);
            jdbcTemplate.update(
                "INSERT INTO company_benefit_grants (public_reference, company_id, benefit_type, catalog_product_id, quantity, source_type, status, starts_at, ends_at, reason, idempotency_key_hash, created_by_user_id) VALUES (?, ?, 'PRODUCT', ?, 1, 'COURTESY', 'ACTIVE', CURRENT_TIMESTAMP(6), ?, ?, ?, ?)",
                reference,
                companyId,
                productId,
                expiry == null ? null : Timestamp.from(expiry),
                "Selección actualizada desde Administración de suscripción.",
                hash,
                actorUserId
            );
        }
    }

    private BillingSelectionResponse response(
        long companyId,
        SubscriptionState state,
        CommercialOfferSelection selection,
        List<String> selectedCodes,
        boolean chargedNow
    ) {
        var snapshot = seats.snapshot(companyId);
        var source = state != null && state.stripeManaged() ? "STRIPE" : "COURTESY";
        var status = state == null ? commercialStatus(companyId) : state.status();
        var availableSeats = selection == null
            ? snapshot.available()
            : Math.max(
                0,
                selection.includedSeats() + selection.extraSeats() + snapshot.benefitExtra() - snapshot.usedAndReserved()
            );
        return new BillingSelectionResponse(
            source,
            status,
            selection == null
                ? (state != null && !state.catalogVersion().isBlank() ? state.catalogVersion() : activeCatalogVersion())
                : selection.catalogVersion(),
            selection == null ? (state == null ? "" : state.offerCode()) : selection.offerCode(),
            selection == null ? (state == null ? "MONTH" : state.billingInterval()) : selection.billingInterval().name(),
            selection == null ? "USD" : selection.currency(),
            selection == null ? snapshot.included() : selection.includedSeats(),
            selection == null ? purchasedExtraSeats(companyId) : selection.extraSeats(),
            snapshot.usedAndReserved(),
            availableSeats,
            selection == null ? null : selection.baseAmountCents(),
            selection == null ? 0 : selection.extraSeatUnitAmountCents(),
            selection == null ? 0 : selection.complementaryAmountCents(),
            selection == null ? storedEstimatedAmount(state) : selection.estimatedAmountCents(),
            state == null || state.trialEndsAt() == null ? courtesyEnd(companyId) : state.trialEndsAt().toString(),
            timing(state),
            chargedNow,
            !(state != null && state.stripeManaged()),
            true,
            selectedCodes,
            availableProducts(selection == null ? (state == null ? "MONTH" : state.billingInterval()) : selection.billingInterval().name())
        );
    }

    private List<BillingSelectionResponse.Product> availableProducts(String interval) {
        var products = offers.activeProducts(interval);
        return products.stream().map(product -> new BillingSelectionResponse.Product(
            product.id(),
            product.code(),
            product.displayName(),
            product.productType(),
            product.commercialKind(),
            product.unitAmountCents(),
            validStripePrice(product.externalPriceId()) || (!product.complementary() && product.unitAmountCents() == null),
            product.capabilities().isEmpty() ? jdbcTemplate.query(
                "SELECT capability_code FROM billing_product_capabilities WHERE product_id = ? ORDER BY capability_code",
                (rs, rowNum) -> rs.getString(1), product.id()
            ) : product.capabilities(),
            product.includedProductCodes()
        )).toList();
    }

    private SubscriptionState state(long companyId) {
        return jdbcTemplate.query(
            """
                SELECT subscription.id, subscription.company_id, subscription.stripe_subscription_id,
                       subscription.stripe_extra_seat_item_id, subscription.status,
                       COALESCE(subscription.billing_interval, 'MONTH') AS billing_interval,
                       COALESCE(subscription.extra_seats, 0) AS extra_seats,
                       subscription.signup_intent_id, subscription.trial_starts_at,
                       subscription.trial_ends_at, subscription.catalog_version_id,
                       COALESCE(version_row.version_code, '') AS catalog_version,
                       COALESCE(subscription.offer_code, '') AS offer_code,
                       subscription.subtotal_amount_cents,
                       COALESCE(subscription.discount_amount_cents, 0) AS discount_amount_cents
                FROM company_billing_subscriptions subscription
                LEFT JOIN billing_catalog_versions version_row
                  ON version_row.id = subscription.catalog_version_id
                WHERE subscription.company_id = ?
                ORDER BY subscription.last_event_created_at DESC, subscription.id DESC
                LIMIT 1
                """,
            (rs, rowNum) -> new SubscriptionState(
                rs.getLong("id"),
                rs.getLong("company_id"),
                rs.getString("stripe_subscription_id"),
                rs.getString("stripe_extra_seat_item_id"),
                text(rs.getString("status")).toUpperCase(Locale.ROOT),
                text(rs.getString("billing_interval")).toUpperCase(Locale.ROOT),
                rs.getInt("extra_seats"),
                (Long) rs.getObject("signup_intent_id"),
                instant(rs.getTimestamp("trial_starts_at")),
                instant(rs.getTimestamp("trial_ends_at")),
                (Long) rs.getObject("catalog_version_id"),
                text(rs.getString("catalog_version")),
                text(rs.getString("offer_code")),
                (Long) rs.getObject("subtotal_amount_cents"),
                rs.getLong("discount_amount_cents")
            ),
            companyId
        ).stream().findFirst().orElse(null);
    }

    private List<String> selectedCodes(long companyId, SubscriptionState state) {
        var ids = selectedProductIds(companyId, state);
        if (ids.isEmpty()) return List.of();
        var placeholders = String.join(",", java.util.Collections.nCopies(ids.size(), "?"));
        return jdbcTemplate.query(
            "SELECT product_code FROM billing_catalog_products WHERE id IN (" + placeholders + ") ORDER BY sort_order, id",
            (rs, rowNum) -> rs.getString(1),
            ids.toArray()
        );
    }

    private List<Long> selectedProductIds(long companyId, SubscriptionState state) {
        if (state != null && state.stripeManaged()) {
            return jdbcTemplate.query(
                "SELECT catalog_product_id FROM company_billing_subscription_products WHERE subscription_id = ? ORDER BY catalog_product_id",
                (rs, rowNum) -> rs.getLong(1),
                state.id()
            );
        }
        return effectiveCourtesyBenefits(companyId).stream().map(CourtesyBenefit::productId).distinct().toList();
    }

    private List<CourtesyBenefit> effectiveCourtesyBenefits(long companyId) {
        return jdbcTemplate.query(
            "SELECT id, catalog_product_id, ends_at FROM company_benefit_grants WHERE company_id = ? AND benefit_type = 'PRODUCT' AND status = 'ACTIVE' AND starts_at <= CURRENT_TIMESTAMP(6) AND (ends_at IS NULL OR ends_at > CURRENT_TIMESTAMP(6)) ORDER BY id",
            (rs, rowNum) -> new CourtesyBenefit(rs.getLong(1), rs.getLong(2), instant(rs.getTimestamp(3))),
            companyId
        );
    }

    private void validateCapacity(long companyId, CommercialOfferSelection selection) {
        var snapshot = seats.snapshot(companyId);
        var projectedLimit = selection.includedSeats() + selection.extraSeats() + snapshot.benefitExtra();
        if (snapshot.usedAndReserved() > projectedLimit) {
            throw new IllegalArgumentException("La capacidad seleccionada es menor que los usuarios activos e invitaciones pendientes.");
        }
    }

    private int requestedExtraSeats(BillingSelectionRequest request, SubscriptionState state, long companyId) {
        if (request != null && request.extra_seats() != null) return request.extra_seats();
        return state == null ? purchasedExtraSeats(companyId) : state.extraSeats();
    }

    private String interval(BillingSelectionRequest request, SubscriptionState state) {
        if (request != null && request.billing_interval() != null && !request.billing_interval().isBlank()) {
            return request.billing_interval();
        }
        return state == null ? "MONTH" : state.billingInterval();
    }

    private int purchasedExtraSeats(long companyId) {
        return jdbcTemplate.query(
            "SELECT purchased_extra_seats FROM company_seat_states WHERE company_id = ?",
            (rs, rowNum) -> rs.getInt(1),
            companyId
        ).stream().findFirst().orElse(0);
    }

    private String commercialStatus(long companyId) {
        return jdbcTemplate.query(
            "SELECT state FROM company_commercial_states WHERE company_id = ?",
            (rs, rowNum) -> text(rs.getString(1)).toUpperCase(Locale.ROOT),
            companyId
        ).stream().findFirst().orElse("COURTESY");
    }

    private String courtesyEnd(long companyId) {
        return jdbcTemplate.query(
            "SELECT MAX(ends_at) FROM company_benefit_grants WHERE company_id = ? AND status = 'ACTIVE'",
            (rs, rowNum) -> {
                var value = instant(rs.getTimestamp(1));
                return value == null ? "" : value.toString();
            },
            companyId
        ).stream().findFirst().orElse("");
    }

    private String activeCatalogVersion() {
        return jdbcTemplate.query(
            "SELECT version_code FROM billing_catalog_versions WHERE status = 'ACTIVE' ORDER BY effective_from DESC, id DESC LIMIT 1",
            (rs, rowNum) -> rs.getString(1)
        ).stream().findFirst().orElse("");
    }

    private Long activeCatalogVersionId() {
        return jdbcTemplate.query(
            "SELECT id FROM billing_catalog_versions WHERE status = 'ACTIVE' ORDER BY effective_from DESC, id DESC LIMIT 1",
            (rs, rowNum) -> rs.getLong(1)
        ).stream().findFirst().orElse(null);
    }

    private Long storedEstimatedAmount(SubscriptionState state) {
        if (state == null || state.subtotalAmountCents() == null) return null;
        return Math.max(0, state.subtotalAmountCents() - state.discountAmountCents());
    }

    private String timing(SubscriptionState state) {
        if (state == null || !state.stripeManaged()) return "PAYMENT_METHOD_REQUIRED";
        return "TRIALING".equals(state.status()) ? "TRIAL_END" : "NEXT_INVOICE";
    }

    private void requireStableActiveInterval(SubscriptionState state, String requestedInterval) {
        if (state == null || !state.stripeManaged() || "TRIALING".equals(state.status())) return;
        if (!state.billingInterval().equalsIgnoreCase(requestedInterval)) {
            throw new IllegalStateException(
                "La periodicidad de una suscripción activa debe programarse para la renovación; no puede cambiarse junto con módulos o usuarios."
            );
        }
    }

    private SubscriptionItem baseItem(List<SubscriptionItem> items) {
        if (items == null || items.isEmpty()) throw new IllegalStateException("La suscripción no tiene un producto base.");
        var basePrices = new LinkedHashSet<>(List.of(
            stripeProperties.getPriceBasic1Monthly(), stripeProperties.getPriceBasic1Annual(),
            stripeProperties.getPriceBasic2Monthly(), stripeProperties.getPriceBasic2Annual(),
            stripeProperties.getPriceBasic3Monthly(), stripeProperties.getPriceBasic3Annual(),
            stripeProperties.getPriceBasicAllMonthly(), stripeProperties.getPriceBasicAllAnnual()
        ));
        basePrices.removeIf(String::isBlank);
        return items.stream()
            .filter(item -> item.getPrice() != null && basePrices.contains(item.getPrice().getId()))
            .findFirst()
            .orElse(items.getFirst());
    }

    private SubscriptionItem extraSeatItem(List<SubscriptionItem> items, String storedItemId) {
        if (storedItemId != null && !storedItemId.isBlank()) {
            var stored = items.stream().filter(item -> storedItemId.equals(item.getId())).findFirst();
            if (stored.isPresent()) return stored.get();
        }
        var priceIds = new LinkedHashSet<>(List.of(
            stripeProperties.getPriceExtraSeatMonthly(),
            stripeProperties.getPriceExtraSeatAnnual()
        ));
        priceIds.removeIf(String::isBlank);
        return items.stream()
            .filter(item -> item.getPrice() != null && priceIds.contains(item.getPrice().getId()))
            .findFirst()
            .orElse(null);
    }

    private String requireIdempotencyKey(String value) {
        var clean = value == null ? "" : value.trim();
        if (clean.length() < 8 || clean.length() > 120) {
            throw new IllegalArgumentException("Se requiere una llave de idempotencia válida.");
        }
        return clean.replaceAll("[^a-zA-Z0-9._-]", "-");
    }

    private boolean validStripePrice(String value) {
        return value != null && value.startsWith("price_");
    }

    private Instant instant(Timestamp value) {
        return value == null ? null : value.toInstant();
    }

    private String text(String value) {
        return value == null ? "" : value.trim();
    }

    private record SubscriptionState(
        long id,
        long companyId,
        String stripeSubscriptionId,
        String stripeExtraSeatItemId,
        String status,
        String billingInterval,
        int extraSeats,
        Long signupIntentId,
        Instant trialStartsAt,
        Instant trialEndsAt,
        Long catalogVersionId,
        String catalogVersion,
        String offerCode,
        Long subtotalAmountCents,
        long discountAmountCents
    ) {
        boolean stripeManaged() {
            return stripeSubscriptionId != null
                && !stripeSubscriptionId.isBlank()
                && !stripeSubscriptionId.startsWith("internal_")
                && !stripeSubscriptionId.startsWith("legacy_");
        }
    }

    private record CourtesyBenefit(long id, long productId, Instant endsAt) {
    }
}
