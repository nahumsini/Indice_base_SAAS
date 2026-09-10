package com.indice.erp.sales;

import com.indice.erp.pos.PosApiException;
import com.indice.erp.pos.PosContext;
import java.math.BigDecimal;
import java.sql.Statement;
import java.util.Locale;
import java.util.UUID;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.stereotype.Service;

/**
 * Explicit Sales/Inventory owner contract used by Procurement when an approved supplier
 * submission creates or updates an authoritative catalog product.
 */
@Service
public class ProcurementProductCatalogService {

    private final JdbcTemplate jdbc;

    public ProcurementProductCatalogService(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public CatalogResolution approveExisting(
            PosContext context,
            long productId,
            BigDecimal supplierCost,
            BigDecimal approvedSalePrice,
            String transactionCurrency) {
        var product = requireProductForUpdate(context, productId);
        var currency = currency(transactionCurrency);
        if (!currency.equals(product.currencyCode())) {
            throw PosApiException.conflict(
                "Supplier cost and catalog sale price must use the same currency.");
        }
        var salePrice = requiredSalePrice(approvedSalePrice, supplierCost);
        var updated = jdbc.update("""
            UPDATE sales_products
            SET cost = ?, price = ?, updated_by_user_id = ?, updated_at = CURRENT_TIMESTAMP,
                metadata_json = JSON_SET(
                    CASE WHEN JSON_TYPE(metadata_json) = 'OBJECT'
                         THEN metadata_json ELSE JSON_OBJECT() END,
                    '$.lastProcurementReview.source', 'SUPPLIER_SUBMISSION',
                    '$.lastProcurementReview.actorUserId', ?)
            WHERE company_id = ? AND id = ? AND deleted_at IS NULL
            """, supplierCost, salePrice, context.userId(), context.userId(),
            context.companyId(), productId);
        if (updated != 1) {
            throw PosApiException.conflict("Catalog product could not be updated.");
        }
        return new CatalogResolution(
            product.id(), product.sku(), product.name(), product.cost(), product.salePrice(),
            salePrice, product.currencyCode(), false);
    }

    public CatalogResolution createNew(
            PosContext context,
            String productCode,
            String sku,
            String name,
            String description,
            String category,
            String taxCategory,
            BigDecimal supplierCost,
            BigDecimal approvedSalePrice,
            String transactionCurrency) {
        var currency = currency(transactionCurrency);
        var salePrice = requiredSalePrice(approvedSalePrice, supplierCost);
        var normalizedName = requiredText(name, "New product name is required.", 220);
        var normalizedCode = nullableText(productCode, 40);
        if (normalizedCode == null) {
            normalizedCode = "PRD-" + UUID.randomUUID().toString().substring(0, 12)
                .toUpperCase(Locale.ROOT);
        }
        var key = new GeneratedKeyHolder();
        try {
            var finalCode = normalizedCode;
            jdbc.update(connection -> {
                var statement = connection.prepareStatement("""
                    INSERT INTO sales_products
                      (company_id, product_code, sku, name, description, category, type,
                       price, cost, currency, tax_category, status, visibility,
                       inventory_ready, pos_ready, custom_fields_json, metadata_json,
                       created_by_user_id, updated_by_user_id)
                    VALUES (?, ?, ?, ?, ?, ?, 'PRODUCT', ?, ?, ?, ?, 'ACTIVE', 'COMMERCIAL',
                            1, 1,
                            JSON_OBJECT('stockPrepared', TRUE, 'warehousePrepared', TRUE),
                            JSON_OBJECT('source', 'SUPPLIER_SUBMISSION'), ?, ?)
                    """, Statement.RETURN_GENERATED_KEYS);
                statement.setLong(1, context.companyId());
                statement.setString(2, finalCode);
                statement.setString(3, nullableText(sku, 80));
                statement.setString(4, normalizedName);
                statement.setString(5, nullableText(description, 4000));
                statement.setString(6, defaultText(category, "Other", 100));
                statement.setBigDecimal(7, salePrice);
                statement.setBigDecimal(8, supplierCost);
                statement.setString(9, currency);
                statement.setString(10, defaultText(taxCategory, "STANDARD_VAT", 80));
                statement.setLong(11, context.userId());
                statement.setLong(12, context.userId());
                return statement;
            }, key);
        } catch (DuplicateKeyException exception) {
            throw PosApiException.conflict("Product code already exists in this company.");
        }
        if (key.getKey() == null) {
            throw PosApiException.conflict("Catalog product could not be created.");
        }
        var productId = key.getKey().longValue();
        return new CatalogResolution(
            productId, nullableText(sku, 80), normalizedName, null, null,
            salePrice, currency, true);
    }

    private CatalogProduct requireProductForUpdate(PosContext context, long productId) {
        return jdbc.query("""
            SELECT id, sku, name, cost, price, UPPER(currency) currency
            FROM sales_products
            WHERE company_id = ? AND id = ? AND deleted_at IS NULL
              AND LOWER(TRIM(status)) = 'active'
              AND UPPER(type) IN ('PRODUCT', 'PACKAGE')
            FOR UPDATE
            """, (rs, row) -> new CatalogProduct(
                rs.getLong("id"), rs.getString("sku"), rs.getString("name"),
                rs.getBigDecimal("cost"), rs.getBigDecimal("price"), rs.getString("currency")),
            context.companyId(), productId).stream().findFirst().orElseThrow(() ->
                PosApiException.badRequest("The selected catalog product is not active for inventory."));
    }

    private BigDecimal requiredSalePrice(BigDecimal salePrice, BigDecimal supplierCost) {
        if (salePrice == null) {
            throw PosApiException.badRequest("Sale price is required for every approved supplier product.");
        }
        if (salePrice.signum() < 0 || salePrice.compareTo(supplierCost) < 0) {
            throw PosApiException.conflict("Sale price cannot be lower than the supplier cost.");
        }
        var canonical = salePrice.stripTrailingZeros();
        var fractionDigits = Math.max(0, canonical.scale());
        var integerDigits = Math.max(0, canonical.precision() - canonical.scale());
        if (fractionDigits > 4 || integerDigits > 15) {
            throw PosApiException.badRequest("Sale price supports up to 15 integers and four decimals.");
        }
        return salePrice.setScale(4);
    }

    private String currency(String value) {
        var normalized = value == null ? "" : value.trim().toUpperCase(Locale.ROOT);
        if (!normalized.matches("[A-Z]{3}")) {
            throw PosApiException.badRequest("A valid three-letter currency is required.");
        }
        return normalized;
    }

    private String requiredText(String value, String message, int maximum) {
        var normalized = nullableText(value, maximum);
        if (normalized == null) throw PosApiException.badRequest(message);
        return normalized;
    }

    private String defaultText(String value, String fallback, int maximum) {
        var normalized = nullableText(value, maximum);
        return normalized == null ? fallback : normalized;
    }

    private String nullableText(String value, int maximum) {
        if (value == null || value.isBlank()) return null;
        var normalized = value.trim();
        return normalized.length() <= maximum ? normalized : normalized.substring(0, maximum);
    }

    private record CatalogProduct(
        long id,
        String sku,
        String name,
        BigDecimal cost,
        BigDecimal salePrice,
        String currencyCode
    ) { }

    public record CatalogResolution(
        long productId,
        String sku,
        String name,
        BigDecimal previousCost,
        BigDecimal previousSalePrice,
        BigDecimal approvedSalePrice,
        String currencyCode,
        boolean created
    ) { }
}
