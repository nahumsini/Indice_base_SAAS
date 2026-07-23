package com.indice.erp.billing.catalog;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.indice.erp.auth.AuthSessionResponse;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest
class CommercialCatalogIntegrationTest {

    @Autowired
    private CommercialCatalogService service;

    @Test
    void loadsTheVersionedPremiumCatalogAndNormalizesLegacyAssignments() {
        var company = new AuthSessionResponse.CompanyInfo(
            71L,
            "Corazón del Caribe",
            81L,
            "admin",
            new AuthSessionResponse.ScopeInfo("corporate_office", null, null),
            true,
            new AuthSessionResponse.SubscriptionInfo("active", "legacy", "", true, "")
        );
        var session = new AuthSessionResponse(
            new AuthSessionResponse.UserInfo(
                91L,
                "Usuario",
                "admin",
                List.of("crm", "human_resources"),
                List.of(),
                false
            ),
            company,
            List.of(company)
        );

        var catalog = service.activeCatalog(session);

        assertEquals("2026.07-premium-v1", catalog.version());
        assertEquals("shadow", catalog.enforcement_mode());
        assertEquals(7, catalog.products().size());
        assertTrue(catalog.core_capabilities().containsAll(List.of(
            "dashboard",
            "config_center",
            "kpis",
            "security",
            "billing"
        )));
        assertTrue(catalog.effective_capabilities().contains("sales"));
        assertTrue(catalog.effective_capabilities().contains("human_resources"));
        assertEquals("sales", catalog.aliases().get("crm"));
    }
}
