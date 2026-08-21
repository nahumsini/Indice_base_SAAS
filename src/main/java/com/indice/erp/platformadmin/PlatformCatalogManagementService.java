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
        jdbcTemplate.update(
            "UPDATE billing_catalog_products SET display_name = ?, sort_order = ?, active = ? WHERE id = ?",
            displayName, sortOrder, active, productId
        );
        if (request != null && request.capabilities() != null) {
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
        var productCode = uniqueProductCode(draftId, displayName);
        var sortOrder = request.sort_order() == null ? 500 : request.sort_order();
        jdbcTemplate.update(
            "INSERT INTO billing_catalog_products (catalog_version_id, product_code, display_name, product_type, sort_order, active) VALUES (?, ?, ?, 'ADDON', ?, ?)",
            draftId, productCode, displayName, sortOrder, request.active() == null || request.active()
        );
        var productId = jdbcTemplate.queryForObject(
            "SELECT id FROM billing_catalog_products WHERE catalog_version_id = ? AND BINARY product_code = BINARY ?",
            Long.class, draftId, productCode
        );
        if (productId == null) throw new IllegalStateException("No se pudo crear el paquete.");
        replaceCapabilities(productId, request.capabilities() == null ? List.of() : request.capabilities());
        jdbcTemplate.update(
            """
                INSERT INTO billing_catalog_prices (
                    catalog_version_id, catalog_product_id, billable_code, price_type,
                    billing_interval, currency, unit_amount_cents, included_quantity,
                    external_price_id, status
                ) VALUES (?, ?, ?, 'ADDON', 'MONTH', 'USD', NULL, 1, NULL, 'DRAFT'),
                         (?, ?, ?, 'ADDON', 'YEAR', 'USD', NULL, 1, NULL, 'DRAFT')
                """,
            draftId, productId, productCode, draftId, productId, productCode
        );
        audit.record(actorUserId, "CATALOG_PRODUCT_CREATED", "BILLING_PRODUCT", Long.toString(productId), null, "SUCCESS", Map.of(
            "product_code", productCode, "display_name", displayName
        ));
        return productMap(product(productId));
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
        jdbcTemplate.update(
            "UPDATE billing_catalog_prices SET unit_amount_cents = ?, external_price_id = ?, status = ? WHERE id = ?",
            amount, externalPriceId, status, priceId
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
        if (!existing.isEmpty()) return existing.getFirst();
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
                    catalog_version_id, product_code, display_name, product_type, sort_order, active
                )
                SELECT ?, product_code, display_name, product_type, sort_order, active
                FROM billing_catalog_products WHERE catalog_version_id = ?
                """,
            draftId,
            active.id()
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
                    external_price_id, status, effective_from, effective_to
                )
                SELECT ?, draft_product.id, price.billable_code, price.price_type,
                       price.billing_interval, price.currency, price.unit_amount_cents,
                       price.included_quantity, price.external_price_id,
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
        audit.record(actorUserId, "CATALOG_DRAFT_CREATED", "BILLING_CATALOG", Long.toString(draftId), null, "SUCCESS", Map.of(
            "source_version_id", active.id(), "version_code", code
        ));
        return versionMap(draftId, code, "DRAFT");
    }

    private ProductRow editableProduct(long actorUserId, ProductRow current) {
        if ("DRAFT".equals(current.versionStatus())) return current;
        var draft = ensureDraft(actorUserId);
        return jdbcTemplate.query(
            """
                SELECT product.id, product.product_code, product.display_name, product.product_type,
                       product.sort_order, product.active, version.status
                FROM billing_catalog_products product
                JOIN billing_catalog_versions version ON version.id = product.catalog_version_id
                WHERE product.catalog_version_id = ? AND BINARY product.product_code = BINARY ?
                """,
            (rs, rowNum) -> new ProductRow(rs.getLong(1), rs.getString(2), rs.getString(3), rs.getString(4), rs.getInt(5), rs.getBoolean(6), rs.getString(7)),
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

    private List<Map<String, Object>> draftBlockers(long versionId) {
        var blockers = new ArrayList<Map<String, Object>>();
        var requiredBaseRates = List.of(
            Map.entry("basic_1", "Un módulo"),
            Map.entry("basic_2", "Dos módulos"),
            Map.entry("basic_3", "Tres módulos"),
            Map.entry("basic_all", "Cuatro o más módulos"),
            Map.entry("extra_seat", "Usuario adicional")
        );
        for (var requiredRate : requiredBaseRates) {
            var readyIntervals = jdbcTemplate.queryForObject(
                """
                    SELECT COUNT(DISTINCT billing_interval) FROM billing_catalog_prices
                    WHERE catalog_version_id = ? AND BINARY billable_code = BINARY ?
                      AND billing_interval IN ('MONTH', 'YEAR') AND unit_amount_cents > 0
                      AND LEFT(external_price_id, 6) = 'price_'
                      AND status IN ('READY', 'ACTIVE')
                    """,
                Integer.class,
                versionId,
                requiredRate.getKey()
            );
            if (readyIntervals == null || readyIntervals < 2) {
                blockers.add(Map.of(
                    "code", "MISSING_BILLING_RATES",
                    "product_code", requiredRate.getKey(),
                    "message", "Faltan las tarifas mensual y anual conectadas con Stripe para " + requiredRate.getValue() + "."
                ));
            }
        }
        var products = jdbcTemplate.query(
            "SELECT id, product_code, display_name FROM billing_catalog_products WHERE catalog_version_id = ? AND active = 1 AND product_type IN ('ADDON', 'PACKAGE')",
            (rs, rowNum) -> Map.<String, Object>of("id", rs.getLong(1), "code", rs.getString(2), "name", rs.getString(3)),
            versionId
        );
        for (var product : products) {
            var productId = ((Number) product.get("id")).longValue();
            var readyIntervals = jdbcTemplate.queryForObject(
                """
                    SELECT COUNT(DISTINCT billing_interval) FROM billing_catalog_prices
                    WHERE catalog_product_id = ? AND billing_interval IN ('MONTH', 'YEAR')
                      AND unit_amount_cents > 0 AND LEFT(external_price_id, 6) = 'price_'
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
            var readyCapabilities = jdbcTemplate.queryForObject(
                """
                    SELECT COUNT(*) FROM billing_product_capabilities capability
                    JOIN modules module_row ON BINARY module_row.slug = BINARY capability.capability_code
                    WHERE capability.product_id = ? AND module_row.is_active = 1
                      AND module_row.assignment_enabled = 1
                      AND LOWER(module_row.lifecycle_status) IN ('pilot', 'released')
                    """,
                Integer.class,
                productId
            );
            if (readyCapabilities == null || readyCapabilities == 0) {
                blockers.add(Map.of(
                    "code", "MODULE_NOT_AVAILABLE",
                    "product_code", product.get("code"),
                    "message", "El módulo técnico de " + product.get("name") + " todavía no está disponible para clientes."
                ));
            }
        }
        return blockers;
    }

    private ProductRow product(long productId) {
        return jdbcTemplate.query(
            """
                SELECT product.id, product.product_code, product.display_name, product.product_type,
                       product.sort_order, product.active, version.status
                FROM billing_catalog_products product
                JOIN billing_catalog_versions version ON version.id = product.catalog_version_id
                WHERE product.id = ?
                """,
            (rs, rowNum) -> new ProductRow(
                rs.getLong(1), rs.getString(2), rs.getString(3), rs.getString(4), rs.getInt(5), rs.getBoolean(6), rs.getString(7)
            ),
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
        result.put("sort_order", row.sortOrder());
        result.put("active", row.active());
        return result;
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

    private String uniqueProductCode(long versionId, String displayName) {
        var base = displayName.toLowerCase(Locale.ROOT)
            .replaceAll("[^a-z0-9]+", "_")
            .replaceAll("^_+|_+$", "");
        if (base.isBlank()) base = "paquete";
        if (base.length() > 68) base = base.substring(0, 68);
        base = "package_" + base;
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

    public record ProductUpdateRequest(String display_name, Integer sort_order, Boolean active, List<String> capabilities) {
        public ProductUpdateRequest(String display_name, Integer sort_order, Boolean active) {
            this(display_name, sort_order, active, null);
        }
    }

    public record ProductCreateRequest(String display_name, Integer sort_order, Boolean active, List<String> capabilities) {
    }

    public record PriceUpdateRequest(Long unit_amount_cents, String external_price_id, String status) {
    }

    private record ProductRow(long id, String productCode, String displayName, String productType, int sortOrder, boolean active, String versionStatus) {
    }

    private record PriceRow(long id, String billableCode, String billingInterval, Long unitAmountCents, String externalPriceId, String status, String versionStatus, String currency) {
        private PriceRow(long id, String billableCode, String billingInterval, Long unitAmountCents, String externalPriceId, String status, String versionStatus) {
            this(id, billableCode, billingInterval, unitAmountCents, externalPriceId, status, versionStatus, "USD");
        }
    }

    private record VersionRow(long id, String versionCode, String status) {
    }
}
