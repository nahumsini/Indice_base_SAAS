package com.indice.erp.auth;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.List;
import org.junit.jupiter.api.Test;

class BasicModuleCatalogTest {

    @Test
    void launchOfferAlwaysIncludesKpisAsAPlatformCoreModule() {
        var modules = BasicModuleCatalog.launchOfferModules();

        assertTrue(modules.contains(BasicModuleCatalog.CORE_MODULE));
        assertTrue(modules.contains(BasicModuleCatalog.KPI_MODULE));
        assertEquals(1, modules.stream().filter(BasicModuleCatalog.KPI_MODULE::equals).count());
    }

    @Test
    void paidEntitlementsKeepKpisWhenItWasNotSelectedExplicitly() {
        var modules = BasicModuleCatalog.paidEntitlementModules(List.of("human_resources"));

        assertEquals(
            List.of("config_center", "kpis", "human_resources"),
            modules
        );
    }

    @Test
    void paidEntitlementsDoNotDuplicateKpisFromLegacySelections() {
        var modules = BasicModuleCatalog.paidEntitlementModules(List.of("kpis", "expenses"));

        assertEquals(
            List.of("config_center", "kpis", "expenses"),
            modules
        );
    }
}
