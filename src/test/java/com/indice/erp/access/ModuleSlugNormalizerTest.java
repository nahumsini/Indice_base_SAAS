package com.indice.erp.access;

import static org.junit.jupiter.api.Assertions.assertEquals;

import org.junit.jupiter.api.Test;

class ModuleSlugNormalizerTest {

    @Test
    void normalizesLegacyAndRouteStyleModuleAliases() {
        assertEquals("config_center", ModuleSlugNormalizer.normalize("home-panel"));
        assertEquals("config_center", ModuleSlugNormalizer.normalize("panel_inicial"));
        assertEquals("human_resources", ModuleSlugNormalizer.normalize("human-resources"));
        assertEquals("petty_cash", ModuleSlugNormalizer.normalize("petty-cash"));
        assertEquals("pos", ModuleSlugNormalizer.normalize("point-of-sale"));
        assertEquals("crm", ModuleSlugNormalizer.normalize("sales"));
        assertEquals("processes", ModuleSlugNormalizer.normalize("processes-tasks"));
        assertEquals("kpis", ModuleSlugNormalizer.normalize("kpi"));
    }
}
