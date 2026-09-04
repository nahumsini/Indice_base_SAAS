package com.indice.erp.platformadmin;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;

class PlatformAdminActiveCommercialCatalogTest {

    @Test
    @SuppressWarnings("unchecked")
    void exposesOnlySelectableRowsFromTheActiveCatalogVersion() {
        var activeVersion = Map.<String, Object>of("id", 11L, "status", "ACTIVE", "version_code", "active-v1");
        var draftVersion = Map.<String, Object>of("id", 12L, "status", "DRAFT", "version_code", "draft-v2");
        var catalog = Map.<String, Object>of(
            "versions", List.of(draftVersion, activeVersion),
            "products", List.of(
                product(11L, "basic_expenses", true, true),
                product(11L, "inactive_product", false, true),
                product(11L, "unavailable_product", true, false),
                product(12L, "module_expenses", true, true)
            ),
            "prices", List.of(
                Map.of("catalog_version_id", 11L, "billable_code", "basic_expenses"),
                Map.of("catalog_version_id", 12L, "billable_code", "module_expenses")
            ),
            "promotions", List.of(
                Map.of("catalog_version_id", 11L, "promotion_code", "ACTIVE", "active", true),
                Map.of("catalog_version_id", 11L, "promotion_code", "INACTIVE", "active", false),
                Map.of("catalog_version_id", 12L, "promotion_code", "DRAFT", "active", true)
            ),
            "stripe_environment", Map.of("mode", "TEST")
        );

        var result = PlatformAdminService.activeCommercialCatalog(catalog);

        assertThat((List<Map<String, Object>>) result.get("versions"))
            .containsExactly(activeVersion);
        assertThat((List<Map<String, Object>>) result.get("products"))
            .extracting(product -> product.get("product_code"))
            .containsExactly("basic_expenses");
        assertThat((List<Map<String, Object>>) result.get("prices"))
            .extracting(price -> price.get("billable_code"))
            .containsExactly("basic_expenses");
        assertThat((List<Map<String, Object>>) result.get("promotions"))
            .extracting(promotion -> promotion.get("promotion_code"))
            .containsExactly("ACTIVE");
        assertThat(result.get("stripe_environment")).isEqualTo(Map.of("mode", "TEST"));
        assertThat(catalog.get("versions")).isEqualTo(List.of(draftVersion, activeVersion));
    }

    @Test
    void failsClosedWhenThereIsNoActiveCatalog() {
        var catalog = Map.<String, Object>of(
            "versions", List.of(Map.of("id", 12L, "status", "DRAFT")),
            "products", List.of()
        );

        assertThatThrownBy(() -> PlatformAdminService.activeCommercialCatalog(catalog))
            .isInstanceOf(IllegalStateException.class)
            .hasMessage("Active commercial catalog not found.");
    }

    private Map<String, Object> product(
        long catalogVersionId,
        String productCode,
        boolean active,
        boolean commerciallyAvailable
    ) {
        return Map.of(
            "catalog_version_id", catalogVersionId,
            "product_code", productCode,
            "active", active,
            "commercially_available", commerciallyAvailable
        );
    }
}
