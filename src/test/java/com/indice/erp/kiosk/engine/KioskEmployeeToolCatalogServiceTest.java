package com.indice.erp.kiosk.engine;

import com.indice.erp.access.module.ModuleAccessService;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.JdbcTemplate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verifyNoInteractions;

@ExtendWith(MockitoExtension.class)
class KioskEmployeeToolCatalogServiceTest {

    @Mock private JdbcTemplate jdbcTemplate;
    @Mock private ModuleAccessService moduleAccess;
    @Mock private KioskEngineFeatureFlags featureFlags;

    private KioskEmployeeToolCatalogService catalog;

    @BeforeEach
    void setUp() {
        catalog = new KioskEmployeeToolCatalogService(
            jdbcTemplate, moduleAccess, featureFlags);
    }

    @Test
    void catalogIsCodeOwnedAndReturnsOnlyEntitledEnabledTools() {
        given(moduleAccess.companyCanAccess(7L, "human_resources")).willReturn(true);
        given(moduleAccess.companyCanAccess(7L, "processes")).willReturn(false);
        given(featureFlags.adapterEnabled("HUMAN_RESOURCES")).willReturn(true);

        var tools = catalog.availableTools(7L);

        assertThat(tools).singleElement().satisfies(tool -> {
            assertThat(tool)
                .containsEntry("key", KioskEmployeeToolCatalogService.ATTENDANCE_TOOL_KEY)
                .containsEntry("tool_key", KioskEmployeeToolCatalogService.ATTENDANCE_TOOL_KEY)
                .containsEntry("workspace_kind", "ATTENDANCE")
                .containsEntry("audience_policy", "COMPANY_MEMBERS")
                .containsEntry("readiness", "AVAILABLE");
            assertThat(tool.get("required_tab_scopes")).isEqualTo(List.of(
                "human_resources.attendance", "human_resources.control"));
        });
        verifyNoInteractions(jdbcTemplate);
    }

    @Test
    void bothNativeToolsAppearWithoutAnyKioskDefinitions() {
        given(moduleAccess.companyCanAccess(1L, "human_resources")).willReturn(true);
        given(moduleAccess.companyCanAccess(1L, "processes")).willReturn(true);
        given(featureFlags.adapterEnabled("HUMAN_RESOURCES")).willReturn(true);
        given(featureFlags.adapterEnabled("PROCESS_TASKS")).willReturn(true);

        assertThat(catalog.availableTools(1L))
            .extracting(tool -> tool.get("key"))
            .containsExactly(
                KioskEmployeeToolCatalogService.ATTENDANCE_TOOL_KEY,
                KioskEmployeeToolCatalogService.MY_TASKS_TOOL_KEY);

        // Catalog discovery must not depend on any previously created kiosk definition.
        verifyNoInteractions(jdbcTemplate);
    }

    @Test
    void disabledAdapterClosesTheCatalogEvenWithEntitlement() {
        given(moduleAccess.companyCanAccess(7L, "human_resources")).willReturn(true);
        given(moduleAccess.companyCanAccess(7L, "processes")).willReturn(true);
        given(featureFlags.adapterEnabled("HUMAN_RESOURCES")).willReturn(false);
        given(featureFlags.adapterEnabled("PROCESS_TASKS")).willReturn(true);

        assertThat(catalog.availableTools(7L))
            .extracting(tool -> tool.get("key"))
            .containsExactly(KioskEmployeeToolCatalogService.MY_TASKS_TOOL_KEY);
        verifyNoInteractions(jdbcTemplate);
    }

    @Test
    void normalizesAndDeduplicatesOnlyCanonicalToolKeys() {
        assertThat(catalog.normalizeToolKeys(List.of(
            " Employee.Attendance@1 ", "employee.attendance@1")))
            .containsExactly(KioskEmployeeToolCatalogService.ATTENDANCE_TOOL_KEY);

        assertThatThrownBy(() -> catalog.normalizeToolKeys(List.of("employee.unknown@1")))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("unsupported");
    }
}
