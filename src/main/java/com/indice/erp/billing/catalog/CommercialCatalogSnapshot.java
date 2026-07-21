package com.indice.erp.billing.catalog;

import java.util.List;
import java.util.Map;

public record CommercialCatalogSnapshot(
    String version,
    String enforcement_mode,
    List<Product> products,
    Map<String, String> aliases,
    List<String> core_capabilities,
    List<String> effective_capabilities
) {

    public record Product(
        String code,
        String name,
        String type,
        List<String> capabilities
    ) {
    }
}
