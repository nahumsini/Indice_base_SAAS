package com.indice.erp.platformadmin;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.NoSuchElementException;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PlatformCatalogManagementService {

    private static final List<String> PRICE_STATUSES = List.of("DRAFT", "READY", "ACTIVE", "ARCHIVED");

    private final JdbcTemplate jdbcTemplate;
    private final PlatformAdminAccessService accessService;
    private final PlatformAuditService audit;

    public PlatformCatalogManagementService(
        JdbcTemplate jdbcTemplate,
        PlatformAdminAccessService accessService,
        PlatformAuditService audit
    ) {
        this.jdbcTemplate = jdbcTemplate;
        this.accessService = accessService;
        this.audit = audit;
    }

    @Transactional
    public Map<String, Object> synchronizeComplementaryProducts(long actorUserId) {
        accessService.require(actorUserId, "PLATFORM_MODULES_WRITE");
        var draft = ensureDraft(actorUserId);
        var draftId = ((Number) draft.get("id")).longValue();
        var insertedProducts = jdbcTemplate.update(
            """
                INSERT INTO billing_catalog_products (
                    catalog_version_id, product_code, display_name, product_type, sort_order, active
                )
                SELECT version_row.id, CONCAT('addon_', module_row.slug), module_row.name,
                       'ADDON', 1000 + module_row.sort_order, 0
                FROM billing_catalog_versions version_row
                JOIN modules module_row ON module_row.module_category IN ('complementary', 'ai')
                WHERE version_row.id = ?
                  AND NOT EXISTS (
                      SELECT 1 FROM billing_catalog_products existing_product
                      WHERE existing_product.catalog_version_id = version_row.id
                        AND BINARY existing_product.product_code = BINARY CONCAT('addon_', module_row.slug)
                  )
                """,
            draftId
        );
        var insertedCapabilities = jdbcTemplate.update(
            """
                INSERT INTO billing_product_capabilities (product_id, capability_code)
                SELECT product.id, module_row.slug
                FROM billing_catalog_products product
                JOIN billing_catalog_versions version_row
                  ON version_row.id = product.catalog_version_id AND version_row.id = ?
                JOIN modules module_row ON BINARY product.product_code = BINARY CONCAT('addon_', module_row.slug)
                WHERE product.product_type = 'ADDON'
                  AND module_row.module_category IN ('complementary', 'ai')
                  AND NOT EXISTS (
                      SELECT 1 FROM billing_product_capabilities existing_capability
                      WHERE existing_capability.product_id = product.id
                        AND BINARY existing_capability.capability_code = BINARY module_row.slug
                  )
                """,
            draftId
        );
        var insertedPrices = jdbcTemplate.update(
            """
                INSERT INTO billing_catalog_prices (
                    catalog_version_id, catalog_product_id, billable_code, price_type,
                    billing_interval, currency, unit_amount_cents, included_quantity,
                    external_price_id, status
                )
                SELECT product.catalog_version_id, product.id, product.product_code, 'ADDON',
                       interval_row.billing_interval, 'USD', NULL, 1, NULL, 'DRAFT'
                FROM billing_catalog_products product
                JOIN billing_catalog_versions version_row
                  ON version_row.id = product.catalog_version_id AND version_row.id = ?
                JOIN (SELECT 'MONTH' AS billing_interval UNION ALL SELECT 'YEAR') interval_row
                WHERE product.product_type = 'ADDON'
                  AND NOT EXISTS (
                      SELECT 1 FROM billing_catalog_prices existing_price
                      WHERE existing_price.catalog_version_id = product.catalog_version_id
                        AND BINARY existing_price.billable_code = BINARY product.product_code
                        AND existing_price.billing_interval = interval_row.billing_interval
                        AND existing_price.currency = 'USD'
                  )
                """,
            draftId
        );
        audit.record(actorUserId, "CATALOG_COMPLEMENTARIES_SYNCHRONIZED", "BILLING_CATALOG", String.valueOf(draftId), null, "SUCCESS", Map.of(
            "products_created", insertedProducts,
            "capabilities_created", insertedCapabilities,
            "prices_created", insertedPrices
        ));
        return Map.of(
            "catalog_version_id", draftId,
            "version_code", draft.get("version_code"),
            "products_created", insertedProducts,
            "capabilities_created", insertedCapabilities,
            "prices_created", insertedPrices
        );
    }

    @Transactional
    public Map<String, Object> updateProduct(long actorUserId, long productId, ProductUpdateRequest request) {
        accessService.require(actorUserId, "PLATFORM_MODULES_WRITE");
        var current = editableProduct(actorUserId, product(productId));
        productId = current.id();
        var displayName = request == null || request.display_name() == null
            ? current.displayName()
            : request.display_name().trim();
        if (displayName.length() < 2 || displayName.length() > 160) {
            throw new IllegalArgumentException("El nombre comercial debe tener entre 2 y 160 caracteres.");
        }
        var active = request == null || request.active() == null ? current.active() : request.active();
        var sortOrder = request == null || request.sort_order() == null ? current.sortOrder() : request.sort_order();
        var commercialKind = request == null || request.commercial_kind() == null
            ? current.commercialKind()
            : commercialKind(request.commercial_kind(), current.productType());
        var description = request == null || request.description() == null
            ? current.description()
            : nullable(request.description());
        jdbcTemplate.update(
            "UPDATE billing_catalog_products SET display_name = ?, description = ?, commercial_kind = ?, sort_order = ?, active = ? WHERE id = ?",
            displayName, description, commercialKind, sortOrder, active, productId
        );
        if (request != null && request.included_product_codes() != null) {
            replacePackageItems(productId, current.catalogVersionId(), request.included_product_codes());
        } else if (request != null && request.capabilities() != null) {
            replaceCapabilities(productId, request.capabilities());
        }
        audit.record(actorUserId, "CATALOG_PRODUCT_UPDATED", "BILLING_PRODUCT", Long.toString(productId), null, "SUCCESS", Map.of(
            "product_code", current.productCode(), "active", active, "display_name", displayName
        ));
        return productMap(product(productId));
    }

    @Transactional
    public Map<String, Object> createProduct(long actorUserId, ProductCreateRequest request) {
        accessService.require(actorUserId, "PLATFORM_MODULES_WRITE");
        if (request == null || request.display_name() == null) {
            throw new IllegalArgumentException("El nombre comercial es obligatorio.");
        }
        var displayName = request.display_name().trim();
        if (displayName.length() < 2 || displayName.length() > 160) {
            throw new IllegalArgumentException("El nombre comercial debe tener entre 2 y 160 caracteres.");
        }
        var draft = ensureDraft(actorUserId);
        var draftId = ((Number) draft.get("id")).longValue();
        var commercialKind = commercialKind(request.commercial_kind() == null ? "PACKAGE" : request.commercial_kind(), "ADDON");
        if (!List.of("MODULE", "PACKAGE").contains(commercialKind)) {
            throw new IllegalArgumentException("Sólo se pueden crear módulos comerciales o paquetes.");
        }
        var productCode = uniqueProductCode(draftId, displayName, commercialKind);
        var sortOrder = request.sort_order() == null ? 500 : request.sort_order();
        jdbcTemplate.update(
            "INSERT INTO billing_catalog_products (catalog_version_id, product_code, display_name, description, product_type, commercial_kind, sort_order, active) VALUES (?, ?, ?, ?, 'ADDON', ?, ?, ?)",
            draftId, productCode, displayName, nullable(request.description()), commercialKind,
            sortOrder, request.active() == null || request.active()
        );
        var productId = jdbcTemplate.queryForObject(
            "SELECT id FROM billing_catalog_products WHERE catalog_version_id = ? AND BINARY product_code = BINARY ?",
            Long.class, draftId, productCode
        );
        if (productId == null) throw new IllegalStateException("No se pudo crear el paquete.");
        if ("PACKAGE".equals(commercialKind) && request.included_product_codes() != null) {
            replacePackageItems(productId, draftId, request.included_product_codes());
        } else {
            replaceCapabilities(productId, request.capabilities() == null ? List.of() : request.capabilities());
        }
        var priceType = "PACKAGE".equals(commercialKind) ? "PACKAGE" : "PRODUCT";
        jdbcTemplate.update(
            """
                INSERT INTO billing_catalog_prices (
                    catalog_version_id, catalog_product_id, billable_code, price_type,
                    billing_interval, currency, unit_amount_cents, included_quantity,
                    external_price_id, status
                ) VALUES (?, ?, ?, ?, 'MONTH', 'USD', NULL, 1, NULL, 'DRAFT'),
                         (?, ?, ?, ?, 'YEAR', 'USD', NULL, 1, NULL, 'DRAFT')
                """,
            draftId, productId, productCode, priceType, draftId, productId, productCode, priceType
        );
        audit.record(actorUserId, "CATALOG_PRODUCT_CREATED", "BILLING_PRODUCT", Long.toString(productId), null, "SUCCESS", Map.of(
            "product_code", productCode, "display_name", displayName
        ));
        return productMap(product(productId));
    }

    @Transactional
    public Map<String, Object> createPromotion(long actorUserId, PromotionRequest request) {
        accessService.require(actorUserId, "PLATFORM_MODULES_WRITE");
        var draft = ensureDraft(actorUserId);
        var draftId = ((Number) draft.get("id")).longValue();
        var normalized = validatedPromotion(request);
        var exists = Boolean.TRUE.equals(jdbcTemplate.queryForObject(
            "SELECT EXISTS(SELECT 1 FROM billing_catalog_promotions WHERE catalog_version_id = ? AND UPPER(promotion_code) = ?)",
            Boolean.class, draftId, normalized.code()
        ));
        if (exists) throw new IllegalArgumentException("Ya existe una promoción con ese código.");
        jdbcTemplate.update(
            """
                INSERT INTO billing_catalog_promotions (
                    catalog_version_id, promotion_code, display_name, description, discount_type,
                    percent_basis_points, amount_off_cents, currency, duration_type, duration_cycles,
                    starts_at, ends_at, external_promotion_code_id, active, sort_order
                ) VALUES (?, ?, ?, ?, ?, ?, ?, 'USD', ?, ?, ?, ?, ?, ?, ?)
                """,
            draftId, normalized.code(), normalized.displayName(), normalized.description(),
            normalized.discountType(), normalized.percentBasisPoints(), normalized.amountOffCents(),
            normalized.durationType(), normalized.durationCycles(), normalized.startsAt(), normalized.endsAt(),
            normalized.externalPromotionCodeId(), normalized.active(), normalized.sortOrder()
        );
        var promotionId = jdbcTemplate.queryForObject(
            "SELECT id FROM billing_catalog_promotions WHERE catalog_version_id = ? AND UPPER(promotion_code) = ?",
            Long.class, draftId, normalized.code()
        );
        if (promotionId == null) throw new IllegalStateException("No se pudo crear la promoción.");
        replacePromotionProducts(promotionId, draftId, normalized.productCodes());
        audit.record(actorUserId, "CATALOG_PROMOTION_CREATED", "BILLING_PROMOTION", Long.toString(promotionId), null, "SUCCESS", Map.of(
            "promotion_code", normalized.code(), "active", normalized.active()
        ));
        return promotionMap(promotionId);
    }

    @Transactional
    public Map<String, Object> updatePromotion(long actorUserId, long promotionId, PromotionRequest request) {
        accessService.require(actorUserId, "PLATFORM_MODULES_WRITE");
        var current = editablePromotion(actorUserId, promotionId);
        var normalized = validatedPromotion(request);
        jdbcTemplate.update(
            """
                UPDATE billing_catalog_promotions
                SET promotion_code = ?, display_name = ?, description = ?, discount_type = ?,
                    percent_basis_points = ?, amount_off_cents = ?, duration_type = ?, duration_cycles = ?,
                    starts_at = ?, ends_at = ?, external_promotion_code_id = ?, active = ?, sort_order = ?
                WHERE id = ?
                """,
            normalized.code(), normalized.displayName(), normalized.description(), normalized.discountType(),
            normalized.percentBasisPoints(), normalized.amountOffCents(), normalized.durationType(),
            normalized.durationCycles(), normalized.startsAt(), normalized.endsAt(),
            normalized.externalPromotionCodeId(), normalized.active(), normalized.sortOrder(), current.id()
        );
        replacePromotionProducts(current.id(), current.catalogVersionId(), normalized.productCodes());
        audit.record(actorUserId, "CATALOG_PROMOTION_UPDATED", "BILLING_PROMOTION", Long.toString(current.id()), null, "SUCCESS", Map.of(
            "promotion_code", normalized.code(), "active", normalized.active()
        ));
        return promotionMap(current.id());
    }

    @Transactional
    public Map<String, Object> updatePrice(long actorUserId, long priceId, PriceUpdateRequest request) {
        accessService.require(actorUserId, "PLATFORM_MODULES_WRITE");
        var current = editablePrice(actorUserId, price(priceId));
        priceId = current.id();
        var amount = request == null || request.unit_amount_cents() == null
            ? current.unitAmountCents()
            : request.unit_amount_cents();
        if (amount != null && amount < 0) throw new IllegalArgumentException("El importe no puede ser negativo.");
        var status = request == null || request.status() == null
            ? current.status()
            : request.status().trim().toUpperCase(Locale.ROOT);
        if (!PRICE_STATUSES.contains(status)) throw new IllegalArgumentException("Estado de tarifa inválido.");
        if (List.of("READY", "ACTIVE").contains(status) && (amount == null || amount <= 0)) {
            throw new IllegalArgumentException("Una tarifa lista debe tener un importe mayor a cero.");
        }
        var externalPriceId = request == null || request.external_price_id() == null
            ? current.externalPriceId()
            : nullable(request.external_price_id());
        if (!java.util.Objects.equals(amount, current.unitAmountCents()) &&
            java.util.Objects.equals(externalPriceId, current.externalPriceId())) {
            externalPriceId = null;
            status = "DRAFT";
        }
        if (externalPriceId != null && !externalPriceId.startsWith("price_")) {
            throw new IllegalArgumentException("El Stripe Price ID debe comenzar con price_.");
        }
        var preservesStripeVerification = java.util.Objects.equals(amount, current.unitAmountCents())
            && java.util.Objects.equals(externalPriceId, current.externalPriceId());
        jdbcTemplate.update(
            """
                UPDATE billing_catalog_prices
                SET unit_amount_cents = ?, external_price_id = ?, status = ?,
                    stripe_tax_behavior = CASE WHEN ? THEN stripe_tax_behavior ELSE NULL END,
                    stripe_synced_at = CASE WHEN ? THEN stripe_synced_at ELSE NULL END
                WHERE id = ?
                """,
            amount, externalPriceId, status, preservesStripeVerification, preservesStripeVerification, priceId
        );
        audit.record(actorUserId, "CATALOG_PRICE_UPDATED", "BILLING_PRICE", Long.toString(priceId), null, "SUCCESS", Map.of(
            "billable_code", current.billableCode(),
            "billing_interval", current.billingInterval(),
            "status", status,
            "stripe_ready", externalPriceId != null
        ));
        return priceMap(price(priceId));
    }

    @Transactional
    public Map<String, Object> createDraft(long actorUserId) {
        accessService.require(actorUserId, "PLATFORM_MODULES_WRITE");
        return ensureDraft(actorUserId);
    }

    public Map<String, Object> validateDraft(long actorUserId, long versionId) {
        accessService.require(actorUserId, "PLATFORM_MODULES_WRITE");
        var version = version(versionId);
        if (!"DRAFT".equals(version.status())) {
            throw new IllegalStateException("Sólo una versión en borrador puede validarse.");
        }
        var blockers = draftBlockers(versionId);
        return Map.of(
            "catalog_version_id", versionId,
            "version_code", version.versionCode(),
            "ready", blockers.isEmpty(),
            "blockers", blockers,
            "stripe_mode", "TEST"
        );
    }

    @Transactional
    public Map<String, Object> publishDraft(long actorUserId, long versionId) {
        var authority = accessService.require(actorUserId, "PLATFORM_MODULES_WRITE");
        if (!"PLATFORM_ROOT".equals(authority.role())) {
            throw new PlatformAdminForbiddenException("Sólo Root puede publicar una versión comercial.");
        }
        var validation = validateDraft(actorUserId, versionId);
        @SuppressWarnings("unchecked")
        var blockers = (List<Map<String, Object>>) validation.get("blockers");
        if (!blockers.isEmpty()) {
            throw new IllegalStateException("La versión tiene pendientes y todavía no puede publicarse.");
        }
        var now = java.sql.Timestamp.from(Instant.now());
        jdbcTemplate.update(
            "UPDATE billing_catalog_versions SET status = 'SUPERSEDED', effective_to = ? WHERE status = 'ACTIVE'",
            now
        );
        var updated = jdbcTemplate.update(
            "UPDATE billing_catalog_versions SET status = 'ACTIVE', effective_from = ?, effective_to = NULL WHERE id = ? AND status = 'DRAFT'",
            now,
            versionId
        );
        if (updated != 1) throw new IllegalStateException("La versión dejó de estar disponible para publicación.");
        jdbcTemplate.update(
            "UPDATE billing_catalog_prices SET status = 'ACTIVE', effective_from = ?, effective_to = NULL WHERE catalog_version_id = ? AND status IN ('READY', 'ACTIVE')",
            now,
            versionId
        );
        var version = version(versionId);
        audit.record(actorUserId, "CATALOG_VERSION_PUBLISHED", "BILLING_CATALOG", Long.toString(versionId), null, "SUCCESS", Map.of(
            "version_code", version.versionCode(), "stripe_mode", "TEST"
        ));
        return Map.of(
            "catalog_version_id", versionId,
            "version_code", version.versionCode(),
            "status", version.status(),
            "published", true,
            "stripe_mode", "TEST"
        );
    }

    private Map<String, Object> ensureDraft(long actorUserId) {
        var existing = jdbcTemplate.query(
            "SELECT id, version_code, status FROM billing_catalog_versions WHERE status = 'DRAFT' ORDER BY id DESC LIMIT 1",
            (rs, rowNum) -> versionMap(rs.getLong(1), rs.getString(2), rs.getString(3))
        );
        if (!existing.isEmpty()) {
            prepareNormalizedDraft(((Number) existing.getFirst().get("id")).longValue());
            return existing.getFirst();
        }
        var active = jdbcTemplate.query(
            "SELECT id, version_code, status FROM billing_catalog_versions WHERE status = 'ACTIVE' ORDER BY effective_from DESC, id DESC LIMIT 1",
            (rs, rowNum) -> new VersionRow(rs.getLong(1), rs.getString(2), rs.getString(3))
        ).stream().findFirst().orElseThrow(() -> new IllegalStateException("No existe un catálogo activo para preparar la siguiente versión."));
        var code = active.versionCode() + "-draft-" + Instant.now().getEpochSecond();
        jdbcTemplate.update(
            "INSERT INTO billing_catalog_versions (version_code, status, effective_from) VALUES (?, 'DRAFT', NULL)",
            code
        );
        var draftId = jdbcTemplate.queryForObject(
            "SELECT id FROM billing_catalog_versions WHERE version_code = ?",
            Long.class,
            code
        );
        if (draftId == null) throw new IllegalStateException("No se pudo preparar la versión de trabajo.");
        jdbcTemplate.update(
            """
                INSERT INTO billing_catalog_products (
                    catalog_version_id, product_code, display_name, description, product_type,
                    commercial_kind, external_product_id, stripe_tax_code, stripe_synced_at,
                    sort_order, active
                )
                SELECT ?, product_code, display_name, description, product_type,
                       commercial_kind, external_product_id, stripe_tax_code, stripe_synced_at,
                       sort_order, active
                FROM billing_catalog_products WHERE catalog_version_id = ?
                """,
            draftId,
            active.id()
        );
        jdbcTemplate.update(
            """
                INSERT INTO billing_package_items (package_product_id, included_product_id, sort_order)
                SELECT draft_package.id, draft_item.id, item.sort_order
                FROM billing_package_items item
                JOIN billing_catalog_products active_package ON active_package.id = item.package_product_id
                JOIN billing_catalog_products active_item ON active_item.id = item.included_product_id
                JOIN billing_catalog_products draft_package
                  ON draft_package.catalog_version_id = ? AND BINARY draft_package.product_code = BINARY active_package.product_code
                JOIN billing_catalog_products draft_item
                  ON draft_item.catalog_version_id = ? AND BINARY draft_item.product_code = BINARY active_item.product_code
                WHERE active_package.catalog_version_id = ?
                """,
            draftId, draftId, active.id()
        );
        jdbcTemplate.update(
            """
                INSERT INTO billing_product_capabilities (product_id, capability_code)
                SELECT draft_product.id, capability.capability_code
                FROM billing_product_capabilities capability
                JOIN billing_catalog_products active_product ON active_product.id = capability.product_id
                JOIN billing_catalog_products draft_product
                  ON draft_product.catalog_version_id = ?
                 AND BINARY draft_product.product_code = BINARY active_product.product_code
                WHERE active_product.catalog_version_id = ?
                """,
            draftId,
            active.id()
        );
        jdbcTemplate.update(
            """
                INSERT INTO billing_catalog_promotions (
                    catalog_version_id, promotion_code, display_name, description, discount_type,
                    percent_basis_points, amount_off_cents, currency, duration_type, duration_cycles,
                    starts_at, ends_at, external_promotion_code_id, active, sort_order
                )
                SELECT ?, promotion_code, display_name, description, discount_type,
                       percent_basis_points, amount_off_cents, currency, duration_type, duration_cycles,
                       starts_at, ends_at, external_promotion_code_id, active, sort_order
                FROM billing_catalog_promotions WHERE catalog_version_id = ?
                """,
            draftId, active.id()
        );
        jdbcTemplate.update(
            """
                INSERT INTO billing_catalog_promotion_products (promotion_id, catalog_product_id)
                SELECT draft_promotion.id, draft_product.id
                FROM billing_catalog_promotion_products link
                JOIN billing_catalog_promotions active_promotion ON active_promotion.id = link.promotion_id
                JOIN billing_catalog_products active_product ON active_product.id = link.catalog_product_id
                JOIN billing_catalog_promotions draft_promotion
                  ON draft_promotion.catalog_version_id = ?
                 AND BINARY draft_promotion.promotion_code = BINARY active_promotion.promotion_code
                JOIN billing_catalog_products draft_product
                  ON draft_product.catalog_version_id = ?
                 AND BINARY draft_product.product_code = BINARY active_product.product_code
                WHERE active_promotion.catalog_version_id = ?
                """,
            draftId, draftId, active.id()
        );
        jdbcTemplate.update(
            """
                INSERT INTO billing_capability_aliases (
                    catalog_version_id, alias_code, canonical_code, compatibility_note
                )
                SELECT ?, alias_code, canonical_code, compatibility_note
                FROM billing_capability_aliases WHERE catalog_version_id = ?
                """,
            draftId,
            active.id()
        );
        jdbcTemplate.update(
            """
                INSERT INTO billing_catalog_prices (
                    catalog_version_id, catalog_product_id, billable_code, price_type,
                    billing_interval, currency, unit_amount_cents, included_quantity,
                    external_price_id, stripe_tax_behavior, stripe_synced_at,
                    status, effective_from, effective_to
                )
                SELECT ?, draft_product.id, price.billable_code, price.price_type,
                       price.billing_interval, price.currency, price.unit_amount_cents,
                       price.included_quantity, price.external_price_id,
                       price.stripe_tax_behavior, price.stripe_synced_at,
                       CASE WHEN price.status = 'ACTIVE' THEN 'READY' ELSE price.status END,
                       NULL, NULL
                FROM billing_catalog_prices price
                LEFT JOIN billing_catalog_products active_product ON active_product.id = price.catalog_product_id
                LEFT JOIN billing_catalog_products draft_product
                  ON draft_product.catalog_version_id = ?
                 AND BINARY draft_product.product_code = BINARY active_product.product_code
                WHERE price.catalog_version_id = ?
                """,
            draftId,
            draftId,
            active.id()
        );
        prepareNormalizedDraft(draftId);
        audit.record(actorUserId, "CATALOG_DRAFT_CREATED", "BILLING_CATALOG", Long.toString(draftId), null, "SUCCESS", Map.of(
            "source_version_id", active.id(), "version_code", code
        ));
        return versionMap(draftId, code, "DRAFT");
    }

    private void prepareNormalizedDraft(long draftId) {
        jdbcTemplate.update(
            """
                UPDATE billing_catalog_prices price
                JOIN billing_catalog_products product ON product.id = price.catalog_product_id
                SET price.price_type = CASE product.commercial_kind WHEN 'PACKAGE' THEN 'PACKAGE' ELSE 'PRODUCT' END
                WHERE product.catalog_version_id = ? AND product.commercial_kind IN ('MODULE', 'PACKAGE')
                  AND BINARY price.billable_code = BINARY product.product_code
                """,
            draftId
        );
        jdbcTemplate.update(
            """
                INSERT INTO billing_catalog_products (
                    catalog_version_id, product_code, display_name, product_type,
                    commercial_kind, sort_order, active
                )
                SELECT ?, CONCAT('module_', module_row.slug), module_row.name,
                       CASE WHEN module_row.module_category = 'basic' THEN 'BASIC' ELSE 'ADDON' END,
                       'MODULE', 200 + module_row.sort_order, 0
                FROM modules module_row
                WHERE module_row.is_core = 0 AND module_row.is_active = 1
                  AND module_row.assignment_enabled = 1
                  AND LOWER(module_row.lifecycle_status) IN ('pilot', 'released')
                  AND NOT EXISTS (
                      SELECT 1 FROM billing_catalog_products represented_product
                      JOIN billing_product_capabilities represented_capability
                        ON represented_capability.product_id = represented_product.id
                      WHERE represented_product.catalog_version_id = ?
                        AND represented_product.commercial_kind = 'MODULE'
                        AND BINARY (CASE represented_capability.capability_code WHEN 'sales' THEN 'crm' ELSE represented_capability.capability_code END)
                            = BINARY module_row.slug
                  )
                """,
            draftId, draftId
        );
        jdbcTemplate.update(
            """
                INSERT IGNORE INTO billing_product_capabilities (product_id, capability_code)
                SELECT product.id, module_row.slug
                FROM billing_catalog_products product
                JOIN modules module_row ON BINARY product.product_code = BINARY CONCAT('module_', module_row.slug)
                WHERE product.catalog_version_id = ? AND product.commercial_kind = 'MODULE'
                """,
            draftId
        );
        jdbcTemplate.update(
            """
                INSERT IGNORE INTO billing_package_items (package_product_id, included_product_id, sort_order)
                SELECT package_product.id, module_product.id, module_product.sort_order
                FROM billing_catalog_products package_product
                JOIN billing_product_capabilities package_capability ON package_capability.product_id = package_product.id
                JOIN billing_catalog_products module_product
                  ON module_product.catalog_version_id = package_product.catalog_version_id
                 AND module_product.commercial_kind = 'MODULE'
                JOIN billing_product_capabilities module_capability ON module_capability.product_id = module_product.id
                WHERE package_product.catalog_version_id = ? AND package_product.commercial_kind = 'PACKAGE'
                  AND BINARY (CASE package_capability.capability_code WHEN 'sales' THEN 'crm' ELSE package_capability.capability_code END)
                    = BINARY (CASE module_capability.capability_code WHEN 'sales' THEN 'crm' ELSE module_capability.capability_code END)
                """,
            draftId
        );
        jdbcTemplate.update(
            """
                INSERT INTO billing_catalog_prices (
                    catalog_version_id, catalog_product_id, billable_code, price_type,
                    billing_interval, currency, unit_amount_cents, included_quantity,
                    external_price_id, status
                )
                SELECT product.catalog_version_id, product.id, product.product_code,
                       CASE product.commercial_kind WHEN 'PACKAGE' THEN 'PACKAGE' ELSE 'PRODUCT' END,
                       interval_row.billing_interval, 'USD', NULL, 1, NULL, 'DRAFT'
                FROM billing_catalog_products product
                JOIN (SELECT 'MONTH' AS billing_interval UNION ALL SELECT 'YEAR') interval_row
                WHERE product.catalog_version_id = ? AND product.commercial_kind IN ('MODULE', 'PACKAGE')
                  AND NOT EXISTS (
                      SELECT 1 FROM billing_catalog_prices price
                      WHERE price.catalog_version_id = product.catalog_version_id
                        AND BINARY price.billable_code = BINARY product.product_code
                        AND price.billing_interval = interval_row.billing_interval AND price.currency = 'USD'
                  )
                """,
            draftId
        );
        jdbcTemplate.update(
            """
                INSERT INTO billing_catalog_products (
                    catalog_version_id, product_code, display_name, product_type,
                    commercial_kind, sort_order, active
                )
                SELECT ?, 'extra_user', 'Usuario adicional', 'ADDON', 'SEAT', 9000, 1
                WHERE NOT EXISTS (
                    SELECT 1 FROM billing_catalog_products product
                    WHERE product.catalog_version_id = ? AND BINARY product.product_code = BINARY 'extra_user'
                )
                """,
            draftId, draftId
        );
        jdbcTemplate.update(
            """
                INSERT INTO billing_catalog_prices (
                    catalog_version_id, catalog_product_id, billable_code, price_type,
                    billing_interval, currency, unit_amount_cents, included_quantity,
                    external_price_id, status
                )
                SELECT ?, seat.id, 'extra_user', 'SEAT', interval_row.billing_interval, 'USD',
                       legacy.unit_amount_cents, 1, legacy.external_price_id,
                       CASE WHEN legacy.external_price_id LIKE 'price_%' AND legacy.unit_amount_cents > 0 THEN 'READY' ELSE 'DRAFT' END
                FROM billing_catalog_products seat
                JOIN (SELECT 'MONTH' AS billing_interval UNION ALL SELECT 'YEAR') interval_row
                LEFT JOIN billing_catalog_prices legacy
                  ON legacy.catalog_version_id = ? AND BINARY legacy.billable_code = BINARY 'extra_seat'
                 AND legacy.billing_interval = interval_row.billing_interval AND legacy.currency = 'USD'
                WHERE seat.catalog_version_id = ? AND BINARY seat.product_code = BINARY 'extra_user'
                  AND NOT EXISTS (
                      SELECT 1 FROM billing_catalog_prices price
                      WHERE price.catalog_version_id = ? AND BINARY price.billable_code = BINARY 'extra_user'
                        AND price.billing_interval = interval_row.billing_interval AND price.currency = 'USD'
                  )
                """,
            draftId, draftId, draftId, draftId
        );
    }

    private ProductRow editableProduct(long actorUserId, ProductRow current) {
        if ("DRAFT".equals(current.versionStatus())) return current;
        var draft = ensureDraft(actorUserId);
        return jdbcTemplate.query(
            """
                SELECT product.id, product.catalog_version_id, product.product_code, product.display_name,
                       product.product_type, product.commercial_kind, product.description,
                       product.sort_order, product.active, version.status
                FROM billing_catalog_products product
                JOIN billing_catalog_versions version ON version.id = product.catalog_version_id
                WHERE product.catalog_version_id = ? AND BINARY product.product_code = BINARY ?
                """,
            (rs, rowNum) -> productRow(rs),
            draft.get("id"),
            current.productCode()
        ).stream().findFirst().orElseThrow(() -> new IllegalStateException("No se pudo localizar el producto en la versión de trabajo."));
    }

    private PriceRow editablePrice(long actorUserId, PriceRow current) {
        if ("DRAFT".equals(current.versionStatus())) return current;
        var draft = ensureDraft(actorUserId);
        return jdbcTemplate.query(
            """
                SELECT price.id, price.billable_code, price.billing_interval, price.unit_amount_cents,
                       price.external_price_id, price.status, version.status
                FROM billing_catalog_prices price
                JOIN billing_catalog_versions version ON version.id = price.catalog_version_id
                WHERE price.catalog_version_id = ? AND BINARY price.billable_code = BINARY ?
                  AND price.billing_interval = ? AND price.currency = ?
                """,
            (rs, rowNum) -> new PriceRow(rs.getLong(1), rs.getString(2), rs.getString(3), (Long) rs.getObject(4), rs.getString(5), rs.getString(6), rs.getString(7)),
            draft.get("id"), current.billableCode(), current.billingInterval(), current.currency()
        ).stream().findFirst().orElseThrow(() -> new IllegalStateException("No se pudo localizar la tarifa en la versión de trabajo."));
    }

    private PromotionRow editablePromotion(long actorUserId, long promotionId) {
        var current = jdbcTemplate.query(
            """
                SELECT promotion.id, promotion.catalog_version_id, promotion.promotion_code, version.status
                FROM billing_catalog_promotions promotion
                JOIN billing_catalog_versions version ON version.id = promotion.catalog_version_id
                WHERE promotion.id = ?
                """,
            (rs, rowNum) -> new PromotionRow(rs.getLong(1), rs.getLong(2), rs.getString(3), rs.getString(4)),
            promotionId
        ).stream().findFirst().orElseThrow(() -> new NoSuchElementException("Promoción no encontrada."));
        if ("DRAFT".equals(current.versionStatus())) return current;
        var draft = ensureDraft(actorUserId);
        return jdbcTemplate.query(
            "SELECT id, catalog_version_id, promotion_code, 'DRAFT' FROM billing_catalog_promotions WHERE catalog_version_id = ? AND BINARY promotion_code = BINARY ?",
            (rs, rowNum) -> new PromotionRow(rs.getLong(1), rs.getLong(2), rs.getString(3), rs.getString(4)),
            draft.get("id"), current.code()
        ).stream().findFirst().orElseThrow(() -> new IllegalStateException("No se pudo localizar la promoción en la versión de trabajo."));
    }

    private List<Map<String, Object>> draftBlockers(long versionId) {
        var blockers = new ArrayList<Map<String, Object>>();
        var invalidatedPrices = jdbcTemplate.query(
            """
                SELECT billable_code FROM billing_catalog_prices
                WHERE catalog_version_id = ? AND status = 'DRAFT' AND unit_amount_cents > 0
                """,
            (rs, rowNum) -> rs.getString(1), versionId
        );
        invalidatedPrices.forEach(code -> blockers.add(Map.of(
            "code", "MISSING_BILLING_RATES", "product_code", code,
            "message", "La tarifa de " + code + " cambió y debe conectarse nuevamente con Stripe."
        )));
        var products = jdbcTemplate.query(
            "SELECT id, product_code, display_name, commercial_kind FROM billing_catalog_products WHERE catalog_version_id = ? AND active = 1 AND commercial_kind IN ('MODULE', 'PACKAGE', 'SEAT')",
            (rs, rowNum) -> Map.<String, Object>of(
                "id", rs.getLong(1), "code", rs.getString(2), "name", rs.getString(3), "kind", rs.getString(4)
            ),
            versionId
        );
        if (products.stream().noneMatch(product -> "MODULE".equals(product.get("kind")) || "PACKAGE".equals(product.get("kind")))) {
            blockers.add(Map.of(
                "code", "EMPTY_OFFER",
                "product_code", "catalog",
                "message", "Activa por lo menos un módulo o paquete para publicar la oferta."
            ));
        }
        if (products.stream().noneMatch(product -> "SEAT".equals(product.get("kind")))) {
            blockers.add(Map.of(
                "code", "MISSING_EXTRA_USER",
                "product_code", "extra_user",
                "message", "Falta el producto de usuario adicional."
            ));
        }
        for (var product : products) {
            var productId = ((Number) product.get("id")).longValue();
            var readyIntervals = jdbcTemplate.queryForObject(
                """
                    SELECT COUNT(DISTINCT billing_interval) FROM billing_catalog_prices
                    WHERE catalog_product_id = ? AND billing_interval IN ('MONTH', 'YEAR')
                      AND unit_amount_cents > 0 AND LEFT(external_price_id, 6) = 'price_'
                      AND stripe_tax_behavior = 'EXCLUSIVE' AND stripe_synced_at IS NOT NULL
                      AND status IN ('READY', 'ACTIVE')
                    """,
                Integer.class,
                productId
            );
            if (readyIntervals == null || readyIntervals < 2) {
                blockers.add(Map.of(
                    "code", "MISSING_BILLING_RATES",
                    "product_code", product.get("code"),
                    "message", "Faltan las tarifas mensual y anual conectadas con Stripe para " + product.get("name") + "."
                ));
            }
            if ("SEAT".equals(product.get("kind"))) continue;
            var invalidCapabilities = jdbcTemplate.queryForObject(
                """
                    SELECT COUNT(*) FROM billing_product_capabilities capability
                    LEFT JOIN modules module_row
                      ON BINARY module_row.slug = BINARY (CASE capability.capability_code WHEN 'sales' THEN 'crm' ELSE capability.capability_code END)
                    WHERE capability.product_id = ?
                      AND (module_row.id IS NULL OR module_row.is_active = 0 OR module_row.assignment_enabled = 0
                           OR LOWER(module_row.lifecycle_status) NOT IN ('pilot', 'released'))
                    """,
                Integer.class,
                productId
            );
            var capabilityCount = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM billing_product_capabilities WHERE product_id = ?",
                Integer.class, productId
            );
            if (capabilityCount == null || capabilityCount == 0 || (invalidCapabilities != null && invalidCapabilities > 0)) {
                blockers.add(Map.of(
                    "code", "MODULE_NOT_AVAILABLE",
                    "product_code", product.get("code"),
                    "message", "El módulo técnico de " + product.get("name") + " todavía no está disponible para clientes."
                ));
            }
            if ("PACKAGE".equals(product.get("kind"))) {
                var itemCount = jdbcTemplate.queryForObject(
                    "SELECT COUNT(*) FROM billing_package_items WHERE package_product_id = ?",
                    Integer.class, productId
                );
                if (itemCount == null || itemCount < 2) {
                    blockers.add(Map.of(
                        "code", "PACKAGE_NEEDS_MODULES",
                        "product_code", product.get("code"),
                        "message", "El paquete " + product.get("name") + " debe incluir al menos dos módulos."
                    ));
                }
            }
        }
        var invalidPromotions = jdbcTemplate.query(
            """
                SELECT promotion_code, display_name FROM billing_catalog_promotions
                WHERE catalog_version_id = ? AND active = 1
                  AND (external_promotion_code_id IS NULL OR external_promotion_code_id NOT LIKE 'promo_%'
                       OR (discount_type = 'PERCENT' AND (percent_basis_points IS NULL OR percent_basis_points < 1 OR percent_basis_points > 10000))
                       OR (discount_type = 'FIXED' AND (amount_off_cents IS NULL OR amount_off_cents < 1)))
                """,
            (rs, rowNum) -> Map.entry(rs.getString(1), rs.getString(2)), versionId
        );
        invalidPromotions.forEach(promotion -> blockers.add(Map.of(
            "code", "PROMOTION_NOT_READY", "product_code", promotion.getKey(),
            "message", "La promoción " + promotion.getValue() + " no está lista o no está conectada con Stripe."
        )));
        return blockers;
    }

    private ProductRow product(long productId) {
        return jdbcTemplate.query(
            """
                SELECT product.id, product.catalog_version_id, product.product_code, product.display_name,
                       product.product_type, product.commercial_kind, product.description,
                       product.sort_order, product.active, version.status
                FROM billing_catalog_products product
                JOIN billing_catalog_versions version ON version.id = product.catalog_version_id
                WHERE product.id = ?
                """,
            (rs, rowNum) -> productRow(rs),
            productId
        ).stream().findFirst().orElseThrow(() -> new NoSuchElementException("Producto de catálogo no encontrado."));
    }

    private PriceRow price(long priceId) {
        return jdbcTemplate.query(
            """
                SELECT price.id, price.billable_code, price.billing_interval, price.unit_amount_cents,
                       price.external_price_id, price.status, version.status, price.currency
                FROM billing_catalog_prices price
                JOIN billing_catalog_versions version ON version.id = price.catalog_version_id
                WHERE price.id = ?
                """,
            (rs, rowNum) -> new PriceRow(
                rs.getLong(1), rs.getString(2), rs.getString(3),
                (Long) rs.getObject(4), rs.getString(5), rs.getString(6), rs.getString(7), rs.getString(8)
            ),
            priceId
        ).stream().findFirst().orElseThrow(() -> new NoSuchElementException("Tarifa no encontrada."));
    }

    private Map<String, Object> productMap(ProductRow row) {
        var result = new LinkedHashMap<String, Object>();
        result.put("id", row.id());
        result.put("product_code", row.productCode());
        result.put("display_name", row.displayName());
        result.put("product_type", row.productType());
        result.put("commercial_kind", row.commercialKind());
        result.put("description", row.description());
        result.put("sort_order", row.sortOrder());
        result.put("active", row.active());
        return result;
    }

    private ProductRow productRow(java.sql.ResultSet rs) throws java.sql.SQLException {
        return new ProductRow(
            rs.getLong("id"), rs.getLong("catalog_version_id"), rs.getString("product_code"),
            rs.getString("display_name"), rs.getString("product_type"), rs.getString("commercial_kind"),
            rs.getString("description"), rs.getInt("sort_order"), rs.getBoolean("active"), rs.getString("status")
        );
    }

    private Map<String, Object> priceMap(PriceRow row) {
        var result = new LinkedHashMap<String, Object>();
        result.put("id", row.id());
        result.put("billable_code", row.billableCode());
        result.put("billing_interval", row.billingInterval());
        result.put("unit_amount_cents", row.unitAmountCents());
        result.put("external_price_id", row.externalPriceId());
        result.put("status", row.status());
        return result;
    }

    private String nullable(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private void replaceCapabilities(long productId, List<String> rawCapabilities) {
        var capabilities = new LinkedHashSet<String>();
        for (var rawCapability : rawCapabilities) {
            var capability = rawCapability == null ? "" : rawCapability.trim();
            if (!capability.matches("[A-Za-z0-9_.-]{1,80}")) {
                throw new IllegalArgumentException("Uno de los módulos incluidos no es válido.");
            }
            capabilities.add(capability);
        }
        jdbcTemplate.update("DELETE FROM billing_product_capabilities WHERE product_id = ?", productId);
        capabilities.forEach(capability -> jdbcTemplate.update(
            "INSERT INTO billing_product_capabilities (product_id, capability_code) VALUES (?, ?)",
            productId, capability
        ));
    }

    private void replacePackageItems(long packageProductId, long versionId, List<String> rawProductCodes) {
        var productCodes = new LinkedHashSet<String>();
        for (var rawCode : rawProductCodes) {
            var code = rawCode == null ? "" : rawCode.trim();
            if (!code.matches("[A-Za-z0-9_.-]{1,80}")) {
                throw new IllegalArgumentException("Uno de los productos del paquete no es válido.");
            }
            productCodes.add(code);
        }
        if (productCodes.isEmpty()) throw new IllegalArgumentException("Un paquete debe incluir al menos un módulo.");
        var placeholders = String.join(",", java.util.Collections.nCopies(productCodes.size(), "?"));
        var params = new ArrayList<Object>();
        params.add(versionId);
        params.add(packageProductId);
        params.addAll(productCodes);
        var included = jdbcTemplate.query(
            "SELECT id, product_code FROM billing_catalog_products WHERE catalog_version_id = ? AND id <> ? AND commercial_kind = 'MODULE' AND product_code IN (" + placeholders + ") ORDER BY sort_order, id",
            (rs, rowNum) -> Map.entry(rs.getLong(1), rs.getString(2)),
            params.toArray()
        );
        if (included.size() != productCodes.size()) {
            throw new IllegalArgumentException("Todos los elementos del paquete deben ser módulos comerciales de la misma versión.");
        }
        jdbcTemplate.update("DELETE FROM billing_package_items WHERE package_product_id = ?", packageProductId);
        var order = 0;
        for (var item : included) {
            jdbcTemplate.update(
                "INSERT INTO billing_package_items (package_product_id, included_product_id, sort_order) VALUES (?, ?, ?)",
                packageProductId, item.getKey(), order++
            );
        }
        jdbcTemplate.update("DELETE FROM billing_product_capabilities WHERE product_id = ?", packageProductId);
        jdbcTemplate.update(
            """
                INSERT INTO billing_product_capabilities (product_id, capability_code)
                SELECT ?, capability.capability_code
                FROM billing_package_items item
                JOIN billing_product_capabilities capability ON capability.product_id = item.included_product_id
                WHERE item.package_product_id = ?
                GROUP BY capability.capability_code
                """,
            packageProductId, packageProductId
        );
    }

    private NormalizedPromotion validatedPromotion(PromotionRequest request) {
        if (request == null) throw new IllegalArgumentException("La promoción es obligatoria.");
        var code = request.promotion_code() == null ? "" : request.promotion_code().trim().toUpperCase(Locale.ROOT);
        if (!code.matches("[A-Z0-9_-]{3,80}")) {
            throw new IllegalArgumentException("El código debe tener de 3 a 80 caracteres, sin espacios.");
        }
        var displayName = request.display_name() == null ? "" : request.display_name().trim();
        if (displayName.length() < 3 || displayName.length() > 160) {
            throw new IllegalArgumentException("El nombre de la promoción debe tener entre 3 y 160 caracteres.");
        }
        var discountType = request.discount_type() == null ? "" : request.discount_type().trim().toUpperCase(Locale.ROOT);
        if (!List.of("PERCENT", "FIXED").contains(discountType)) {
            throw new IllegalArgumentException("El descuento debe ser porcentual o fijo.");
        }
        var basisPoints = "PERCENT".equals(discountType) ? request.percent_basis_points() : null;
        var amount = "FIXED".equals(discountType) ? request.amount_off_cents() : null;
        if ("PERCENT".equals(discountType) && (basisPoints == null || basisPoints < 1 || basisPoints > 10_000)) {
            throw new IllegalArgumentException("El porcentaje debe ser mayor a 0 y no superar 100%.");
        }
        if ("FIXED".equals(discountType) && (amount == null || amount < 1)) {
            throw new IllegalArgumentException("El descuento fijo debe ser mayor a cero.");
        }
        var duration = request.duration_type() == null ? "ONCE" : request.duration_type().trim().toUpperCase(Locale.ROOT);
        if (!List.of("ONCE", "REPEATING", "FOREVER").contains(duration)) {
            throw new IllegalArgumentException("Duración de promoción inválida.");
        }
        var cycles = "REPEATING".equals(duration) ? request.duration_cycles() : null;
        if ("REPEATING".equals(duration) && (cycles == null || cycles < 1 || cycles > 60)) {
            throw new IllegalArgumentException("La promoción repetible debe durar entre 1 y 60 ciclos.");
        }
        var stripeId = nullable(request.external_promotion_code_id());
        if (stripeId != null && !stripeId.startsWith("promo_")) {
            throw new IllegalArgumentException("El Stripe Promotion Code ID debe comenzar con promo_.");
        }
        return new NormalizedPromotion(
            code, displayName, nullable(request.description()), discountType, basisPoints, amount,
            duration, cycles,
            request.starts_at() == null ? null : java.sql.Timestamp.from(request.starts_at()),
            request.ends_at() == null ? null : java.sql.Timestamp.from(request.ends_at()),
            stripeId, request.active() != null && request.active(),
            request.sort_order() == null ? 0 : request.sort_order(),
            request.product_codes() == null ? List.of() : request.product_codes()
        );
    }

    private void replacePromotionProducts(long promotionId, long versionId, List<String> rawCodes) {
        var codes = new LinkedHashSet<String>();
        rawCodes.forEach(raw -> {
            if (raw != null && !raw.isBlank()) codes.add(raw.trim());
        });
        jdbcTemplate.update("DELETE FROM billing_catalog_promotion_products WHERE promotion_id = ?", promotionId);
        if (codes.isEmpty()) return;
        var placeholders = String.join(",", java.util.Collections.nCopies(codes.size(), "?"));
        var params = new ArrayList<Object>();
        params.add(versionId);
        params.addAll(codes);
        var productIds = jdbcTemplate.query(
            "SELECT id FROM billing_catalog_products WHERE catalog_version_id = ? AND product_code IN (" + placeholders + ")",
            (rs, rowNum) -> rs.getLong(1), params.toArray()
        );
        if (productIds.size() != codes.size()) throw new IllegalArgumentException("Uno de los productos de la promoción no existe en el borrador.");
        productIds.forEach(productId -> jdbcTemplate.update(
            "INSERT INTO billing_catalog_promotion_products (promotion_id, catalog_product_id) VALUES (?, ?)",
            promotionId, productId
        ));
    }

    private Map<String, Object> promotionMap(long promotionId) {
        return jdbcTemplate.query(
            """
                SELECT id, catalog_version_id, promotion_code, display_name, discount_type,
                       percent_basis_points, amount_off_cents, active
                FROM billing_catalog_promotions WHERE id = ?
                """,
            (rs, rowNum) -> Map.<String, Object>of(
                "id", rs.getLong(1), "catalog_version_id", rs.getLong(2),
                "promotion_code", rs.getString(3), "display_name", rs.getString(4),
                "discount_type", rs.getString(5),
                "percent_basis_points", rs.getObject(6) == null ? 0 : rs.getInt(6),
                "amount_off_cents", rs.getObject(7) == null ? 0L : rs.getLong(7),
                "active", rs.getBoolean(8)
            ), promotionId
        ).stream().findFirst().orElseThrow(() -> new NoSuchElementException("Promoción no encontrada."));
    }

    private String commercialKind(String rawValue, String productType) {
        if ("CORE".equalsIgnoreCase(productType)) return "CORE";
        var value = rawValue == null ? "MODULE" : rawValue.trim().toUpperCase(Locale.ROOT);
        if (!List.of("MODULE", "PACKAGE", "SEAT").contains(value)) {
            throw new IllegalArgumentException("Tipo comercial inválido.");
        }
        return value;
    }

    private String uniqueProductCode(long versionId, String displayName, String commercialKind) {
        var base = displayName.toLowerCase(Locale.ROOT)
            .replaceAll("[^a-z0-9]+", "_")
            .replaceAll("^_+|_+$", "");
        if (base.isBlank()) base = "paquete";
        if (base.length() > 68) base = base.substring(0, 68);
        base = ("PACKAGE".equals(commercialKind) ? "package_" : "module_") + base;
        var candidate = base;
        var suffix = 2;
        while (Boolean.TRUE.equals(jdbcTemplate.queryForObject(
            "SELECT EXISTS(SELECT 1 FROM billing_catalog_products WHERE catalog_version_id = ? AND BINARY product_code = BINARY ?)",
            Boolean.class, versionId, candidate
        ))) candidate = base + "_" + suffix++;
        return candidate;
    }

    private VersionRow version(long versionId) {
        return jdbcTemplate.query(
            "SELECT id, version_code, status FROM billing_catalog_versions WHERE id = ?",
            (rs, rowNum) -> new VersionRow(rs.getLong(1), rs.getString(2), rs.getString(3)),
            versionId
        ).stream().findFirst().orElseThrow(() -> new NoSuchElementException("Versión de catálogo no encontrada."));
    }

    private Map<String, Object> versionMap(long id, String code, String status) {
        return Map.of("id", id, "version_code", code, "status", status, "stripe_mode", "TEST");
    }

    public record ProductUpdateRequest(
        String display_name,
        Integer sort_order,
        Boolean active,
        List<String> capabilities,
        String commercial_kind,
        String description,
        List<String> included_product_codes
    ) {
        public ProductUpdateRequest(String display_name, Integer sort_order, Boolean active, List<String> capabilities) {
            this(display_name, sort_order, active, capabilities, null, null, null);
        }

        public ProductUpdateRequest(String display_name, Integer sort_order, Boolean active) {
            this(display_name, sort_order, active, null);
        }
    }

    public record ProductCreateRequest(
        String display_name,
        Integer sort_order,
        Boolean active,
        List<String> capabilities,
        String commercial_kind,
        String description,
        List<String> included_product_codes
    ) {
        public ProductCreateRequest(String display_name, Integer sort_order, Boolean active, List<String> capabilities) {
            this(display_name, sort_order, active, capabilities, null, null, null);
        }
    }

    public record PriceUpdateRequest(Long unit_amount_cents, String external_price_id, String status) {
    }

    public record PromotionRequest(
        String promotion_code,
        String display_name,
        String description,
        String discount_type,
        Integer percent_basis_points,
        Long amount_off_cents,
        String duration_type,
        Integer duration_cycles,
        Instant starts_at,
        Instant ends_at,
        String external_promotion_code_id,
        Boolean active,
        Integer sort_order,
        List<String> product_codes
    ) {
    }

    private record ProductRow(
        long id,
        long catalogVersionId,
        String productCode,
        String displayName,
        String productType,
        String commercialKind,
        String description,
        int sortOrder,
        boolean active,
        String versionStatus
    ) {
    }

    private record PriceRow(long id, String billableCode, String billingInterval, Long unitAmountCents, String externalPriceId, String status, String versionStatus, String currency) {
        private PriceRow(long id, String billableCode, String billingInterval, Long unitAmountCents, String externalPriceId, String status, String versionStatus) {
            this(id, billableCode, billingInterval, unitAmountCents, externalPriceId, status, versionStatus, "USD");
        }
    }

    private record VersionRow(long id, String versionCode, String status) {
    }

    private record PromotionRow(long id, long catalogVersionId, String code, String versionStatus) {
    }

    private record NormalizedPromotion(
        String code,
        String displayName,
        String description,
        String discountType,
        Integer percentBasisPoints,
        Long amountOffCents,
        String durationType,
        Integer durationCycles,
        java.sql.Timestamp startsAt,
        java.sql.Timestamp endsAt,
        String externalPromotionCodeId,
        boolean active,
        int sortOrder,
        List<String> productCodes
    ) {
    }
}
