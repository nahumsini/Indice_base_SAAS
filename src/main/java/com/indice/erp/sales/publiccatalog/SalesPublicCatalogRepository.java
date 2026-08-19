package com.indice.erp.sales.publiccatalog;

import com.indice.erp.sales.publiccatalog.SalesPublicCatalogDtos.PublicItem;
import com.indice.erp.sales.publiccatalog.SalesPublicCatalogDtos.RequestItemResponse;
import com.indice.erp.sales.publiccatalog.SalesPublicCatalogDtos.RequestResponse;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.stereotype.Repository;

@Repository
public class SalesPublicCatalogRepository {

    private final JdbcTemplate jdbcTemplate;

    public SalesPublicCatalogRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public List<CatalogRecord> list(long companyId) {
        return jdbcTemplate.query(catalogSelect() + """
            WHERE catalog.company_id = ? AND catalog.deleted_at IS NULL
            ORDER BY catalog.name, catalog.id
            """, this::mapCatalog, companyId);
    }

    public Optional<CatalogRecord> find(long companyId, long catalogId) {
        return jdbcTemplate.query(catalogSelect() + """
            WHERE catalog.company_id = ? AND catalog.id = ? AND catalog.deleted_at IS NULL
            """, this::mapCatalog, companyId, catalogId).stream().findFirst();
    }

    public Optional<CatalogRecord> findById(long catalogId) {
        return jdbcTemplate.query(catalogSelect() + """
            WHERE catalog.id = ? AND catalog.deleted_at IS NULL
            """, this::mapCatalog, catalogId).stream().findFirst();
    }

    public long insert(
            long companyId,
            long userId,
            String code,
            SalesPublicCatalogDtos.SaveRequest request,
            String tokenHint,
            String protectedToken) {
        var keys = new GeneratedKeyHolder();
        jdbcTemplate.update(connection -> {
            var statement = connection.prepareStatement("""
                INSERT INTO sales_public_catalogs (
                    company_id, unit_id, business_id, code, name, title, description, cover_image_url,
                    contact_cta_label, contact_method, contact_value, status, expires_at,
                    public_token_hint, protected_public_token, show_prices, show_wholesale_prices, show_stock_status,
                    show_item_type_badges, show_categories, allow_cart, allow_purchase_request,
                    created_by_user_id, updated_by_user_id
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, Statement.RETURN_GENERATED_KEYS);
            var index = 1;
            statement.setLong(index++, companyId);
            statement.setLong(index++, request.unitId());
            statement.setLong(index++, request.businessId());
            statement.setString(index++, code);
            statement.setString(index++, request.name().trim());
            statement.setString(index++, request.title().trim());
            statement.setString(index++, trim(request.description()));
            statement.setString(index++, trim(request.coverImageUrl()));
            statement.setString(index++, request.contactCtaLabel().trim());
            statement.setString(index++, request.contactMethod().trim().toLowerCase());
            statement.setString(index++, trim(request.contactValue()));
            statement.setTimestamp(index++, timestamp(request.expiresAt()));
            statement.setString(index++, tokenHint);
            statement.setString(index++, protectedToken);
            statement.setBoolean(index++, defaultTrue(request.showPrices()));
            statement.setBoolean(index++, Boolean.TRUE.equals(request.showWholesalePrices()));
            statement.setBoolean(index++, defaultTrue(request.showStockStatus()));
            statement.setBoolean(index++, defaultTrue(request.showItemTypeBadges()));
            statement.setBoolean(index++, defaultTrue(request.showCategories()));
            statement.setBoolean(index++, defaultTrue(request.allowCart()));
            statement.setBoolean(index++, defaultTrue(request.allowPurchaseRequest()));
            statement.setLong(index++, userId);
            statement.setLong(index, userId);
            return statement;
        }, keys);
        return keys.getKey().longValue();
    }

    public boolean update(
            long companyId,
            long userId,
            long catalogId,
            SalesPublicCatalogDtos.SaveRequest request,
            long version) {
        return jdbcTemplate.update("""
            UPDATE sales_public_catalogs
            SET unit_id = ?, business_id = ?, name = ?, title = ?, description = ?, cover_image_url = ?,
                contact_cta_label = ?, contact_method = ?, contact_value = ?, expires_at = ?,
                show_prices = ?, show_wholesale_prices = ?, show_stock_status = ?,
                show_item_type_badges = ?, show_categories = ?, allow_cart = ?,
                allow_purchase_request = ?, updated_by_user_id = ?, version = version + 1
            WHERE company_id = ? AND id = ? AND version = ? AND deleted_at IS NULL
              AND status <> 'REVOKED'
            """,
            request.unitId(), request.businessId(), request.name().trim(), request.title().trim(), trim(request.description()),
            trim(request.coverImageUrl()), request.contactCtaLabel().trim(),
            request.contactMethod().trim().toLowerCase(), trim(request.contactValue()),
            timestamp(request.expiresAt()), defaultTrue(request.showPrices()),
            Boolean.TRUE.equals(request.showWholesalePrices()), defaultTrue(request.showStockStatus()),
            defaultTrue(request.showItemTypeBadges()), defaultTrue(request.showCategories()),
            defaultTrue(request.allowCart()), defaultTrue(request.allowPurchaseRequest()), userId,
            companyId, catalogId, version) > 0;
    }

    public boolean updateStatus(long companyId, long userId, long catalogId, String status) {
        return jdbcTemplate.update("""
            UPDATE sales_public_catalogs
            SET status = ?, updated_by_user_id = ?, version = version + 1
            WHERE company_id = ? AND id = ? AND deleted_at IS NULL
            """, status, userId, companyId, catalogId) > 0;
    }

    public boolean updateToken(long companyId, long userId, long catalogId, String hint, String protectedToken) {
        return jdbcTemplate.update("""
            UPDATE sales_public_catalogs
            SET public_token_hint = ?, protected_public_token = ?,
                updated_by_user_id = ?, version = version + 1
            WHERE company_id = ? AND id = ? AND deleted_at IS NULL AND status <> 'REVOKED'
            """, hint, protectedToken, userId, companyId, catalogId) > 0;
    }

    public boolean physicalDelete(long companyId, long catalogId) {
        return jdbcTemplate.update("""
            DELETE FROM sales_public_catalogs
            WHERE company_id = ? AND id = ?
            """, companyId, catalogId) > 0;
    }

    public boolean codeExists(long companyId, String code) {
        var count = jdbcTemplate.queryForObject("""
            SELECT COUNT(*) FROM sales_public_catalogs
            WHERE company_id = ? AND code = ? AND deleted_at IS NULL
            """, Long.class, companyId, code);
        return count != null && count > 0;
    }

    public boolean productsBelongToCompany(long companyId, List<Long> productIds) {
        if (productIds.isEmpty()) return true;
        var placeholders = String.join(",", java.util.Collections.nCopies(productIds.size(), "?"));
        var params = new java.util.ArrayList<Object>();
        params.add(companyId);
        params.addAll(productIds);
        var count = jdbcTemplate.queryForObject("""
            SELECT COUNT(DISTINCT id) FROM sales_products
            WHERE company_id = ? AND deleted_at IS NULL AND id IN (""" + placeholders + ")",
            Long.class, params.toArray());
        return count != null && count == productIds.stream().distinct().count();
    }

    public boolean productsArePublishable(long companyId, List<Long> productIds) {
        if (productIds.isEmpty()) return true;
        var placeholders = String.join(",", java.util.Collections.nCopies(productIds.size(), "?"));
        var params = new java.util.ArrayList<Object>();
        params.add(companyId);
        params.addAll(productIds);
        var count = jdbcTemplate.queryForObject("""
            SELECT COUNT(DISTINCT id) FROM sales_products
            WHERE company_id = ? AND deleted_at IS NULL
              AND LOWER(status) = 'active'
              AND LOWER(COALESCE(visibility, 'public')) <> 'internal'
              AND price IS NOT NULL AND price >= 0
              AND currency IS NOT NULL AND CHAR_LENGTH(TRIM(currency)) = 3
              AND id IN (""" + placeholders + ")",
            Long.class, params.toArray());
        return count != null && count == productIds.stream().distinct().count();
    }

    public Optional<ScopeRecord> scope(long companyId, long unitId, long businessId) {
        return jdbcTemplate.query("""
            SELECT unit.id AS unit_id, unit.name AS unit_name,
                   business.id AS business_id, business.name AS business_name
            FROM units unit
            JOIN businesses business ON business.unit_id = unit.id
            WHERE unit.id = ? AND business.id = ?
              AND (unit.company_id = ? OR unit.company_id IS NULL)
              AND (business.company_id = ? OR business.company_id IS NULL)
              AND LOWER(COALESCE(unit.status, 'active')) IN ('active', 'activo')
              AND LOWER(COALESCE(business.status, 'active')) IN ('active', 'activo')
            LIMIT 1
            """, (rs, rowNum) -> new ScopeRecord(
                rs.getLong("unit_id"), rs.getString("unit_name"),
                rs.getLong("business_id"), rs.getString("business_name")),
            unitId, businessId, companyId, companyId).stream().findFirst();
    }

    public void replaceProducts(long companyId, long catalogId, List<Long> productIds) {
        jdbcTemplate.update("DELETE FROM sales_public_catalog_products WHERE catalog_id = ?", catalogId);
        for (int index = 0; index < productIds.size(); index++) {
            jdbcTemplate.update("""
                INSERT INTO sales_public_catalog_products (catalog_id, company_id, product_id, sort_order)
                VALUES (?, ?, ?, ?)
                """, catalogId, companyId, productIds.get(index), index);
        }
    }

    public List<Long> productIds(long companyId, long catalogId) {
        return jdbcTemplate.queryForList("""
            SELECT product_id FROM sales_public_catalog_products
            WHERE company_id = ? AND catalog_id = ? ORDER BY sort_order, product_id
            """, Long.class, companyId, catalogId);
    }

    public List<PublicItem> publicItems(CatalogRecord catalog) {
        return jdbcTemplate.query("""
            SELECT product.id,
                   COALESCE(NULLIF(product.sku, ''), product.product_code) AS sku,
                   product.name, product.type, product.category, product.description,
                   JSON_UNQUOTE(JSON_EXTRACT(product.metadata_json, '$.imageUrl')) AS image_url,
                   JSON_UNQUOTE(JSON_EXTRACT(product.metadata_json, '$.imageAlt')) AS image_alt,
                   product.price,
                   CAST(JSON_UNQUOTE(JSON_EXTRACT(product.metadata_json, '$.packaging.wholesalePrice')) AS DECIMAL(15,4)) AS wholesale_price,
                   CAST(JSON_UNQUOTE(JSON_EXTRACT(product.metadata_json, '$.packaging.wholesaleMinimumQuantity')) AS DECIMAL(15,4)) AS wholesale_min_quantity,
                   product.currency, product.inventory_ready,
                   COALESCE((SELECT SUM(balance.available_quantity)
                      FROM sales_inventory_balances balance
                      JOIN sales_inventory_warehouses warehouse
                        ON warehouse.id = balance.warehouse_id
                       AND warehouse.company_id = balance.company_id
                       AND warehouse.deleted_at IS NULL
                       AND LOWER(warehouse.status) = 'active'
                      WHERE balance.company_id = product.company_id
                        AND balance.product_id = product.id AND balance.deleted_at IS NULL
                        AND TRIM(warehouse.business_unit_id) = CAST(? AS CHAR)
                        AND TRIM(warehouse.business_id) = CAST(? AS CHAR)), 0) AS available_quantity,
                   product.visibility
            FROM sales_public_catalog_products selected
            JOIN sales_products product ON product.id = selected.product_id
            WHERE selected.company_id = ? AND selected.catalog_id = ?
              AND product.company_id = ? AND product.deleted_at IS NULL
              AND LOWER(product.status) = 'active'
              AND LOWER(COALESCE(product.visibility, 'public')) <> 'internal'
              AND product.price IS NOT NULL AND product.price >= 0
              AND product.currency IS NOT NULL AND CHAR_LENGTH(TRIM(product.currency)) = 3
            ORDER BY selected.sort_order, product.name
            """, this::mapPublicItem, catalog.unitId(), catalog.businessId(),
            catalog.companyId(), catalog.id(), catalog.companyId());
    }

    public long insertRequest(
            CatalogRecord catalog,
            String requestNumber,
            SalesPublicCatalogDtos.PurchaseRequest request,
            String currency,
            int itemCount,
            java.math.BigDecimal subtotal,
            java.math.BigDecimal discount,
            Long discountRuleId,
            java.math.BigDecimal total) {
        var keys = new GeneratedKeyHolder();
        jdbcTemplate.update(connection -> {
            var statement = connection.prepareStatement("""
                INSERT INTO sales_public_catalog_requests (
                    company_id, catalog_id, catalog_code_snapshot, catalog_name_snapshot,
                    unit_id, business_id, request_number, status, customer_name,
                    contact_value, preferred_contact_method, message, currency_code,
                    item_count, subtotal_amount, discount_amount, discount_rule_id, estimated_total
                ) VALUES (?, ?, ?, ?, ?, ?, ?, 'SUBMITTED', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, Statement.RETURN_GENERATED_KEYS);
            statement.setLong(1, catalog.companyId());
            statement.setLong(2, catalog.id());
            statement.setString(3, catalog.code());
            statement.setString(4, catalog.name());
            statement.setLong(5, catalog.unitId());
            statement.setLong(6, catalog.businessId());
            statement.setString(7, requestNumber);
            statement.setString(8, request.customerName().trim());
            statement.setString(9, request.contact().trim());
            statement.setString(10, request.preferredContactMethod().trim().toLowerCase());
            statement.setString(11, trim(request.message()));
            statement.setString(12, currency);
            statement.setInt(13, itemCount);
            statement.setBigDecimal(14, subtotal);
            statement.setBigDecimal(15, discount);
            statement.setObject(16, discountRuleId);
            statement.setBigDecimal(17, total);
            return statement;
        }, keys);
        return keys.getKey().longValue();
    }

    public long insertRequest(
            CatalogRecord catalog,
            String requestNumber,
            SalesPublicCatalogDtos.PurchaseRequest request,
            String currency,
            int itemCount,
            java.math.BigDecimal total) {
        return insertRequest(catalog, requestNumber, request, currency, itemCount,
            total, java.math.BigDecimal.ZERO, null, total);
    }

    public void insertRequestItem(long companyId, long requestId, RequestItemResponse item, int sortOrder) {
        jdbcTemplate.update("""
            INSERT INTO sales_public_catalog_request_items (
                company_id, request_id, product_id, sku, product_name,
                quantity, unit_price, discount_amount, discount_rule_id, line_total, sort_order
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, companyId, requestId, item.productId(), item.sku(), item.productName(),
            item.quantity(), item.unitPrice(), item.discountAmount(), item.discountRuleId(), item.lineTotal(), sortOrder);
    }

    public Optional<RequestResponse> findRequest(long companyId, long requestId) {
        return jdbcTemplate.query(requestSelect() + """
            WHERE request.company_id = ? AND request.id = ?
            """, this::mapRequest, companyId, requestId).stream().findFirst().map(this::withItems);
    }

    public List<RequestResponse> listRequests(
            long companyId,
            String status,
            SalesPublicCatalogAdminAccess.AdminContext access) {
        var filter = status == null || status.isBlank() ? "" : " AND request.status = ?";
        var params = new java.util.ArrayList<Object>();
        params.add(companyId);
        if (status != null && !status.isBlank()) params.add(status.trim().toUpperCase());
        var scopeFilter = switch (access.scopeType()) {
            case CORPORATE -> "";
            case UNIT -> {
                params.add(access.unitId());
                yield " AND request.unit_id = ?";
            }
            case BUSINESS -> {
                params.add(access.unitId());
                params.add(access.businessId());
                yield " AND request.unit_id = ? AND request.business_id = ?";
            }
        };
        return jdbcTemplate.query(requestSelect() + """
            WHERE request.company_id = ?
            """ + filter + scopeFilter + " ORDER BY request.created_at DESC, request.id DESC",
            this::mapRequest, params.toArray()).stream().map(this::withItems).toList();
    }

    public Optional<RequestScope> requestScope(long companyId, long requestId) {
        return jdbcTemplate.query("""
            SELECT unit_id, business_id
            FROM sales_public_catalog_requests
            WHERE company_id = ? AND id = ?
            LIMIT 1
            """, (rs, rowNum) -> new RequestScope(
                rs.getObject("unit_id", Long.class), rs.getObject("business_id", Long.class)),
            companyId, requestId).stream().findFirst();
    }

    public boolean reviewRequest(long companyId, long userId, long requestId, String status, String note) {
        return jdbcTemplate.update("""
            UPDATE sales_public_catalog_requests
            SET status = ?, review_note = ?, reviewed_by_user_id = ?, reviewed_at = CURRENT_TIMESTAMP
            WHERE company_id = ? AND id = ? AND status IN ('SUBMITTED', 'IN_REVIEW')
            """, status, trim(note), userId, companyId, requestId) > 0;
    }

    public void audit(
            long companyId,
            long catalogId,
            Long requestId,
            String eventType,
            Long actorId,
            String requestCorrelationId,
            String actionId,
            String snapshotJson) {
        jdbcTemplate.update("""
            INSERT INTO sales_public_catalog_audit_events (
                event_id, company_id, catalog_id, request_id, event_type, outcome,
                request_correlation_id, action_id, actor_user_id, snapshot_json, retain_until
            ) VALUES (UUID(), ?, ?, ?, ?, 'SUCCEEDED', ?, ?, ?, ?, CURRENT_TIMESTAMP + INTERVAL 1 YEAR)
            """, companyId, catalogId, requestId, eventType, requestCorrelationId,
            actionId, actorId, snapshotJson);
    }

    public int purgeRetainedPersonalData() {
        return jdbcTemplate.update("""
            UPDATE sales_public_catalog_requests
            SET customer_name = '[retained]', contact_value = '[retained]', message = NULL,
                personal_data_purged_at = CURRENT_TIMESTAMP
            WHERE personal_data_purged_at IS NULL
              AND created_at < CURRENT_TIMESTAMP - INTERVAL 365 DAY
            """);
    }

    public List<Map<String, Object>> listAudit(long companyId, long catalogId) {
        return jdbcTemplate.query("""
            SELECT event_id, event_type, outcome, request_correlation_id, action_id,
                   actor_user_id, snapshot_json, created_at
            FROM sales_public_catalog_audit_events
            WHERE company_id = ? AND catalog_id = ?
            ORDER BY created_at DESC, id DESC
            LIMIT 200
            """, (rs, rowNum) -> {
                var event = new LinkedHashMap<String, Object>();
                event.put("event_id", rs.getString("event_id"));
                event.put("event_type", rs.getString("event_type"));
                event.put("outcome", rs.getString("outcome"));
                if (rs.getString("request_correlation_id") != null) {
                    event.put("request_id", rs.getString("request_correlation_id"));
                }
                if (rs.getString("action_id") != null) {
                    event.put("action_id", rs.getString("action_id"));
                }
                var actor = rs.getObject("actor_user_id", Long.class);
                if (actor != null) event.put("actor_id", actor);
                if (rs.getString("snapshot_json") != null) {
                    event.put("snapshot_json", rs.getString("snapshot_json"));
                }
                event.put("created_at", rs.getTimestamp("created_at").toInstant().toString());
                return java.util.Collections.unmodifiableMap(event);
            }, companyId, catalogId);
    }

    private RequestResponse withItems(RequestResponse row) {
        var items = jdbcTemplate.query("""
            SELECT product_id, sku, product_name, quantity, unit_price, discount_amount, discount_rule_id, line_total
            FROM sales_public_catalog_request_items
            WHERE request_id = ? ORDER BY sort_order, id
            """, (rs, rowNum) -> new RequestItemResponse(
                rs.getLong("product_id"), rs.getString("sku"), rs.getString("product_name"),
                rs.getBigDecimal("quantity"), rs.getBigDecimal("unit_price"),
                rs.getBigDecimal("discount_amount"), rs.getObject("discount_rule_id", Long.class),
                rs.getBigDecimal("line_total")), row.id());
        return new RequestResponse(
            row.id(), row.catalogId(), row.requestNumber(), row.status(), row.customerName(),
            row.contact(), row.preferredContactMethod(), row.message(), row.currencyCode(),
            row.itemCount(), row.subtotalAmount(), row.discountAmount(), row.discountRuleId(),
            row.estimatedTotal(), row.createdAt(), items);
    }

    private String catalogSelect() {
        return """
            SELECT catalog.*, company.name AS company_name,
                   unit.name AS unit_name, business.name AS business_name
            FROM sales_public_catalogs catalog
            JOIN companies company ON company.id = catalog.company_id
            LEFT JOIN units unit ON unit.id = catalog.unit_id
              AND (unit.company_id = catalog.company_id OR unit.company_id IS NULL)
            LEFT JOIN businesses business ON business.id = catalog.business_id
              AND business.unit_id = catalog.unit_id
              AND (business.company_id = catalog.company_id OR business.company_id IS NULL)
            """;
    }

    private String requestSelect() {
        return "SELECT request.* FROM sales_public_catalog_requests request ";
    }

    private CatalogRecord mapCatalog(ResultSet rs, int rowNum) throws SQLException {
        return new CatalogRecord(
            rs.getLong("id"), rs.getLong("company_id"), rs.getString("company_name"),
            rs.getObject("unit_id", Long.class),
            rs.getString("unit_name"), rs.getObject("business_id", Long.class),
            rs.getString("business_name"), rs.getString("code"), rs.getString("name"),
            rs.getString("title"), rs.getString("description"), rs.getString("cover_image_url"),
            rs.getString("contact_cta_label"), rs.getString("contact_method"),
            rs.getString("contact_value"), rs.getString("status"), instant(rs, "expires_at"),
            rs.getString("public_token_hint"), rs.getString("protected_public_token"),
            rs.getBoolean("show_prices"),
            rs.getBoolean("show_wholesale_prices"), rs.getBoolean("show_stock_status"),
            rs.getBoolean("show_item_type_badges"), rs.getBoolean("show_categories"),
            rs.getBoolean("allow_cart"), rs.getBoolean("allow_purchase_request"),
            rs.getLong("version"), instant(rs, "created_at"), instant(rs, "updated_at"));
    }

    private PublicItem mapPublicItem(ResultSet rs, int rowNum) throws SQLException {
        var inventory = rs.getBoolean("inventory_ready");
        var available = rs.getBigDecimal("available_quantity");
        var type = label(rs.getString("type"));
        var status = !inventory ? "noInventoryTracking"
            : available.signum() > 0 ? "inStock" : "askAvailability";
        if ("Service".equals(type) || "Subscription".equals(type)) status = "serviceAvailability";
        if ("quote_only".equalsIgnoreCase(rs.getString("visibility"))) status = "madeToOrder";
        return new PublicItem(
            rs.getLong("id"), rs.getString("name"), rs.getString("sku"), type,
            label(rs.getString("category")), rs.getString("description"), rs.getString("image_url"),
            rs.getString("image_alt"), rs.getBigDecimal("price"), rs.getBigDecimal("wholesale_price"),
            rs.getBigDecimal("wholesale_min_quantity"), rs.getString("currency"), inventory,
            status, true);
    }

    private RequestResponse mapRequest(ResultSet rs, int rowNum) throws SQLException {
        return new RequestResponse(
            rs.getLong("id"), rs.getLong("catalog_id"), rs.getString("request_number"),
            rs.getString("status"), rs.getString("customer_name"), rs.getString("contact_value"),
            rs.getString("preferred_contact_method"), rs.getString("message"),
            rs.getString("currency_code"), rs.getInt("item_count"),
            rs.getBigDecimal("subtotal_amount"), rs.getBigDecimal("discount_amount"),
            rs.getObject("discount_rule_id", Long.class), rs.getBigDecimal("estimated_total"),
            instant(rs, "created_at"), List.of());
    }

    private Instant instant(ResultSet rs, String column) throws SQLException {
        var timestamp = rs.getTimestamp(column);
        return timestamp == null ? null : timestamp.toInstant();
    }

    private Timestamp timestamp(Instant value) {
        return value == null ? null : Timestamp.from(value);
    }

    private boolean defaultTrue(Boolean value) {
        return value == null || value;
    }

    private static String trim(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private String label(String value) {
        if (value == null || value.isBlank()) return "Other";
        var words = value.trim().replace('-', '_').split("_");
        return java.util.Arrays.stream(words)
            .filter(word -> !word.isBlank())
            .map(word -> Character.toUpperCase(word.charAt(0)) + word.substring(1).toLowerCase())
            .collect(java.util.stream.Collectors.joining(" "));
    }

    public record CatalogRecord(
        long id,
        long companyId,
        String companyName,
        Long unitId,
        String unitName,
        Long businessId,
        String businessName,
        String code,
        String name,
        String title,
        String description,
        String coverImageUrl,
        String contactCtaLabel,
        String contactMethod,
        String contactValue,
        String status,
        Instant expiresAt,
        String tokenHint,
        String protectedToken,
        boolean showPrices,
        boolean showWholesalePrices,
        boolean showStockStatus,
        boolean showItemTypeBadges,
        boolean showCategories,
        boolean allowCart,
        boolean allowPurchaseRequest,
        long version,
        Instant createdAt,
        Instant updatedAt
    ) {
    }

    public record ScopeRecord(long unitId, String unitName, long businessId, String businessName) {
    }

    public record RequestScope(Long unitId, Long businessId) {
    }
}
