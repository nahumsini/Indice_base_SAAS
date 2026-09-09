package com.indice.erp.kiosk.engine;

import static org.assertj.core.api.Assertions.assertThat;

import com.indice.erp.finance.providers.ProviderCenterReviewService;
import com.indice.erp.finance.shared.FinanceContext;
import com.indice.erp.finance.shared.FinanceScope;
import com.indice.erp.pos.PosContext;
import com.indice.erp.pos.PosScope;
import com.indice.erp.pos.purchaseorder.PurchaseOrderRepository;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest(properties = {
    "app.email.enabled=false",
    "app.entitlements.projection-enabled=false"
})
class ProviderCenterMigrationIntegrationTest {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private ProviderCenterReviewService reviews;

    @Autowired
    private PurchaseOrderRepository purchaseOrders;

    @Test
    void providerCenterSchemaIsAvailableAfterFlywayStartup() {
        assertThat(tableExists("provider_registration_requests")).isTrue();
        assertThat(tableExists("provider_profile_change_requests")).isTrue();
        assertThat(tableExists("provider_private_profiles")).isTrue();
        assertThat(tableExists("pos_supplier_quote_requests")).isTrue();
        assertThat(tableExists("pos_supplier_quote_request_items")).isTrue();
        assertThat(tableExists("pos_purchase_order_supplier_responses")).isTrue();
        assertThat(columnExists("multi_kiosk_definitions", "audience_type")).isTrue();
        assertThat(columnExists("multi_kiosk_definitions", "provider_company_id")).isTrue();
        assertThat(columnExists("multi_kiosk_sessions", "identity_type")).isTrue();
        assertThat(columnExists("provider_profile_change_requests", "protected_changes")).isTrue();
        assertThat(columnExists("pos_supplier_submissions", "quote_request_id")).isTrue();
        assertThat(indexExists("multi_kiosk_definitions", "uq_multi_kiosk_provider_company")).isTrue();
    }

    @Test
    @Transactional
    void providerCenterCatalogGateAcceptsOnlyActiveProductsFromTheSameCompany() {
        var companyId = id("SELECT id FROM companies ORDER BY id LIMIT 1");
        var suffix = UUID.randomUUID().toString().substring(0, 8);
        jdbcTemplate.update(
            """
                INSERT INTO sales_products (
                    company_id, product_code, sku, name, currency, status)
                VALUES (?, ?, ?, ?, 'MXN', 'active'),
                       (?, ?, ?, ?, 'MXN', 'inactive')
                """,
            companyId, "PC-ACT-" + suffix, "PC-ACT-" + suffix,
            "Provider Center Active " + suffix,
            companyId, "PC-INACT-" + suffix, "PC-INACT-" + suffix,
            "Provider Center Inactive " + suffix);
        var activeProductId = id(
            "SELECT id FROM sales_products WHERE company_id = ? AND product_code = ?",
            companyId, "PC-ACT-" + suffix);
        var inactiveProductId = id(
            "SELECT id FROM sales_products WHERE company_id = ? AND product_code = ?",
            companyId, "PC-INACT-" + suffix);

        assertThat(purchaseOrders.supplierCompanyProductAllowed(companyId, activeProductId)).isTrue();
        assertThat(purchaseOrders.supplierCompanyProductAllowed(companyId, inactiveProductId)).isFalse();
        assertThat(purchaseOrders.supplierCompanyProductAllowed(companyId + 1_000_000, activeProductId)).isFalse();
    }

    @Test
    @Transactional
    void fiscalApprovalMergesWithTheExistingPrivateProfile() {
        var companyId = id("SELECT id FROM companies ORDER BY id LIMIT 1");
        var userId = id("SELECT id FROM users ORDER BY id LIMIT 1");
        var business = jdbcTemplate.queryForMap(
            "SELECT id, unit_id FROM businesses WHERE company_id = ? AND unit_id IS NOT NULL ORDER BY id LIMIT 1",
            companyId);
        var providerId = createProvider(
            companyId, userId,
            ((Number) business.get("unit_id")).longValue(),
            ((Number) business.get("id")).longValue());
        jdbcTemplate.update(
            """
                INSERT INTO provider_private_profiles (
                    provider_id, company_id, fiscal_profile_json, updated_by_user_id)
                VALUES (?, ?, CAST(? AS JSON), ?)
                """,
            providerId, companyId,
            "{\"fiscal_address\":\"Domicilio anterior\",\"tax_regime\":\"ANTERIOR\"}", userId);
        jdbcTemplate.update(
            """
                INSERT INTO provider_profile_change_requests (
                    company_id, provider_id, category, status, changes_json,
                    submitted_by_name, submitted_by_email)
                VALUES (?, ?, 'FISCAL', 'SUBMITTED', CAST(? AS JSON), 'Contacto', 'proveedor@example.com')
                """,
            companyId, providerId, "{\"tax_regime\":\"NUEVO\"}");
        var requestId = id(
            "SELECT MAX(id) FROM provider_profile_change_requests WHERE company_id = ? AND provider_id = ?",
            companyId, providerId);

        reviews.reviewFinanceChange(
            new FinanceContext(userId, companyId, "Finance", "admin", true, FinanceScope.corporateOffice()),
            requestId, true, "Validado");

        assertThat(profileValue(providerId, "$.fiscal_address")).isEqualTo("Domicilio anterior");
        assertThat(profileValue(providerId, "$.tax_regime")).isEqualTo("NUEVO");
    }

    @Test
    @Transactional
    @SuppressWarnings("unchecked")
    void procurementSeesOnlyTheCurrentPendingSupplierAdjustment() {
        var companyId = id("SELECT id FROM companies ORDER BY id LIMIT 1");
        var userId = id("SELECT id FROM users ORDER BY id LIMIT 1");
        var business = jdbcTemplate.queryForMap(
            """
                SELECT id AS business_id, unit_id
                FROM businesses
                WHERE company_id = ? AND unit_id IS NOT NULL
                ORDER BY id LIMIT 1
                """,
            companyId);
        var unitId = ((Number) business.get("unit_id")).longValue();
        var businessId = ((Number) business.get("business_id")).longValue();
        var warehouseCode = "PC-TEST-" + UUID.randomUUID().toString().substring(0, 8);
        jdbcTemplate.update(
            """
                INSERT INTO sales_inventory_warehouses (
                    company_id, warehouse_code, name, business_unit_id, business_id,
                    status, created_by_user_id)
                VALUES (?, ?, 'Provider Center Test Warehouse', ?, ?, 'active', ?)
                """,
            companyId, warehouseCode, String.valueOf(unitId), String.valueOf(businessId), userId);
        var warehouseId = id(
            "SELECT id FROM sales_inventory_warehouses WHERE company_id = ? AND warehouse_code = ?",
            companyId, warehouseCode);
        var providerId = createProvider(companyId, userId, unitId, businessId);
        var folio = "PO-PC-" + UUID.randomUUID().toString().substring(0, 8);
        jdbcTemplate.update(
            """
                INSERT INTO pos_purchase_orders (
                    company_id, unit_id, business_id, warehouse_id, provider_id,
                    folio, status, currency_code, created_by_user_id)
                VALUES (?, ?, ?, ?, ?, ?, 'NEEDS_CLARIFICATION', 'MXN', ?)
                """,
            companyId, unitId, businessId, warehouseId, providerId, folio, userId);
        var orderId = id(
            "SELECT id FROM pos_purchase_orders WHERE company_id = ? AND folio = ?",
            companyId, folio);
        jdbcTemplate.update(
            """
                INSERT INTO pos_purchase_order_supplier_responses (
                    company_id, purchase_order_id, provider_id, response_type,
                    requested_expected_date, reason, submitted_by_name, submitted_by_email)
                VALUES (?, ?, ?, 'ADJUSTMENT_REQUESTED', '2026-10-15', ?, 'Contacto', 'proveedor@example.com')
                """,
            companyId, orderId, providerId, "Revisar cantidad y fecha de entrega.");

        var inbox = reviews.commercialInbox(
            new PosContext(userId, companyId, "Buyer", "admin", true, PosScope.corporateOffice()));
        var responses = (List<Map<String, Object>>) inbox.get("order_responses");

        assertThat(responses).singleElement().satisfies(response -> {
            assertThat(response.get("purchase_order_id")).isEqualTo(orderId);
            assertThat(response.get("reason")).isEqualTo("Revisar cantidad y fecha de entrega.");
            assertThat(response.get("requested_expected_date")).isEqualTo("2026-10-15");
        });

        jdbcTemplate.update(
            "UPDATE pos_purchase_orders SET status = 'SENT' WHERE company_id = ? AND id = ?",
            companyId, orderId);
        var resolvedInbox = reviews.commercialInbox(
            new PosContext(userId, companyId, "Buyer", "admin", true, PosScope.corporateOffice()));
        assertThat((List<?>) resolvedInbox.get("order_responses")).isEmpty();
    }

    private long createProvider(
            long companyId, long userId, Long unitId, Long businessId) {
        var name = "Provider Center Test " + UUID.randomUUID();
        jdbcTemplate.update(
            """
                INSERT INTO finance_providers (
                    company_id, unit_id, business_id, name, email, status, created_by_user_id)
                VALUES (?, ?, ?, ?, 'provider-center-test@example.com', 'ACTIVE', ?)
                """,
            companyId, unitId, businessId, name, userId);
        return id(
            "SELECT id FROM finance_providers WHERE company_id = ? AND name = ?",
            companyId, name);
    }

    private String profileValue(long providerId, String path) {
        return jdbcTemplate.queryForObject(
            """
                SELECT JSON_UNQUOTE(JSON_EXTRACT(fiscal_profile_json, ?))
                FROM provider_private_profiles WHERE provider_id = ?
                """,
            String.class, path, providerId);
    }

    private long id(String sql, Object... parameters) {
        return jdbcTemplate.queryForObject(sql, Long.class, parameters);
    }

    private boolean tableExists(String tableName) {
        return count(
            "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = ?",
            tableName) == 1;
    }

    private boolean columnExists(String tableName, String columnName) {
        return count(
            """
                SELECT COUNT(*) FROM information_schema.columns
                WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?
                """,
            tableName, columnName) == 1;
    }

    private boolean indexExists(String tableName, String indexName) {
        return count(
            """
                SELECT COUNT(DISTINCT index_name) FROM information_schema.statistics
                WHERE table_schema = DATABASE() AND table_name = ? AND index_name = ?
                """,
            tableName, indexName) == 1;
    }

    private int count(String sql, Object... parameters) {
        return jdbcTemplate.queryForObject(sql, Integer.class, parameters);
    }
}
