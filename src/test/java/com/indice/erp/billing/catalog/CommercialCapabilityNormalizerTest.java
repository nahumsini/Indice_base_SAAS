package com.indice.erp.billing.catalog;

import static org.junit.jupiter.api.Assertions.assertEquals;

import org.junit.jupiter.api.Test;

class CommercialCapabilityNormalizerTest {

    @Test
    void normalizesCommercialAndLegacyAliases() {
        assertEquals("sales", CommercialCapabilityNormalizer.normalize("CRM"));
        assertEquals("config_center", CommercialCapabilityNormalizer.normalize("panel-inicial"));
        assertEquals("petty_cash", CommercialCapabilityNormalizer.normalize("caja chica"));
        assertEquals("receivables", CommercialCapabilityNormalizer.normalize("accounts_receivable"));
        assertEquals("processes", CommercialCapabilityNormalizer.normalize("processes_tasks"));
    }
}
