package com.indice.erp.entitlement;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class CapabilityRouteClassifierTest {

    private final CapabilityRouteClassifier classifier = new CapabilityRouteClassifier();

    @Test
    void classifiesAuthenticatedCommercialRoutes() {
        assertThat(classifier.classify("/api/v1/hr/attendance")).contains("human_resources");
        assertThat(classifier.classify("/api/v1/process-tasks/42")).contains("processes");
        assertThat(classifier.classify("/api/v1/finance/expenses")).contains("expenses");
        assertThat(classifier.classify("/api/v1/finance/petty-cash/funds")).contains("petty_cash");
        assertThat(classifier.classify("/api/v1/finance/receivables")).contains("receivables");
        assertThat(classifier.classify("/api/v1/pos/shifts")).contains("pos");
        assertThat(classifier.classify("/api/v1/sales/orders")).contains("sales");
        assertThat(classifier.classify("/api/v1/sales/products")).contains("inventory");
        assertThat(classifier.classify("/api/v1/sales/products/42")).contains("inventory");
        assertThat(classifier.classify("/api/v1/sales/inventory-operations/commit")).contains("inventory");
        assertThat(classifier.classify("/api/v1/sales/inventory-warehouses")).contains("inventory");
        assertThat(classifier.classify("/api/v1/sales/inventory-balances")).contains("inventory");
        assertThat(classifier.classify("/api/v1/sales/inventory-movements")).contains("inventory");
        assertThat(classifier.classify("/api/v1/sales/products-archive")).contains("sales");
        assertThat(classifier.classify("/api/v1/kpis/executive")).contains("kpis");
    }

    @Test
    void productReadsAcceptInventoryOrSalesButWritesAndImagesRequireInventory() {
        assertCandidates("GET", "/api/v1/sales/products", "inventory", "sales");
        assertCandidates("GET", "/api/v1/sales/products/42", "inventory", "sales");

        assertCandidates("POST", "/api/v1/sales/products", "inventory");
        assertCandidates("PUT", "/api/v1/sales/products/42", "inventory");
        assertCandidates("DELETE", "/api/v1/sales/products/42", "inventory");
        assertCandidates("GET", "/api/v1/sales/products/images/presign-upload", "inventory");
        assertCandidates("POST", "/api/v1/sales/products/images/presign-upload", "inventory");
        assertCandidates("GET", "/api/v1/sales/products/42/images", "inventory");
        assertCandidates("POST", "/api/v1/sales/products/42/images", "inventory");
    }

    @Test
    void warehouseReadsAcceptInventoryOrSalesButWritesRequireInventory() {
        assertCandidates("GET", "/api/v1/sales/inventory-warehouses", "inventory", "sales");
        assertCandidates("GET", "/api/v1/sales/inventory-warehouses/3", "inventory", "sales");
        assertCandidates("POST", "/api/v1/sales/inventory-warehouses", "inventory");
        assertCandidates("PUT", "/api/v1/sales/inventory-warehouses/3", "inventory");
        assertCandidates("DELETE", "/api/v1/sales/inventory-warehouses/3", "inventory");
    }

    @Test
    void inventoryPrefixMatchingIsSegmentBounded() {
        assertCandidates("GET", "/api/v1/sales/products-archive", "sales");
        assertCandidates("DELETE", "/api/v1/sales/products-archive/42", "sales");
        assertCandidates("GET", "/api/v1/sales/inventory-warehouses-archive", "sales");
        assertCandidates("PUT", "/api/v1/sales/inventory-warehouses-archive/3", "sales");
    }

    @Test
    void neverClassifiesPublicOrPlatformSurfacesFromAnErpSessionCookie() {
        assertThat(classifier.classify("/api/v1/hr/attendance/public-kiosk/token")).isEmpty();
        assertThat(classifier.classify("/api/v1/process-tasks/public-kiosk/token")).isEmpty();
        assertThat(classifier.classify("/api/v1/finance/public-payable-kiosks/token")).isEmpty();
        assertThat(classifier.classify("/api/v1/sales/public-catalogs/token")).isEmpty();
        assertThat(classifier.classify("/api/v1/billing/signup/checkout")).isEmpty();
        assertThat(classifier.classify("/api/v1/platform/catalog")).isEmpty();
    }

    private void assertCandidates(String method, String path, String... expected) {
        var requirement = classifier.classify(method, path);

        assertThat(requirement).isPresent();
        assertThat(requirement.orElseThrow().candidates()).containsExactly(expected);
    }
}
