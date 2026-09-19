package com.indice.erp.sales;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.auth.SessionAuthService;
import com.indice.erp.auth.SessionCsrfService;
import com.indice.erp.hr.HrOperationalScope;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(SalesApiController.class)
class SalesKpiWorkspaceApiControllerTest {

    @Autowired private MockMvc mockMvc;
    @MockBean private SessionAuthService sessionAuthService;
    @MockBean private SessionCsrfService sessionCsrfService;
    @MockBean private SalesService salesService;
    @MockBean private SalesCommissionCutService commissionCutService;
    @MockBean private com.indice.erp.kpis.KpiRequestAccessService kpiAccess;

    @Test
    void requiresAnAuthenticatedSession() throws Exception {
        given(sessionAuthService.currentUser(any())).willReturn(Optional.empty());

        mockMvc.perform(get("/api/v1/sales/kpis/workspace"))
            .andExpect(status().isUnauthorized());
    }

    @Test
    void derivesTenantAndOperationalScopeOnTheServer() throws Exception {
        var user = new AuthSessionUser(5L, 23L, 71L, "Demo", "admin");
        var scope = HrOperationalScope.businessOffice(7L, 19L);
        given(sessionAuthService.currentUser(any())).willReturn(Optional.of(user));
        given(kpiAccess.monetary(any(), eq("SALES_TOTAL"))).willReturn(scope);
        given(salesService.kpiWorkspace(23L, scope)).willReturn(new SalesKpiWorkspaceDtos.WorkspaceResponse(
            List.of(), List.of(), List.of(), List.of(),
            List.of(new SalesKpiWorkspaceDtos.UnitOption(7L, "North")),
            List.of(new SalesKpiWorkspaceDtos.BusinessOption(19L, 7L, "Branch")),
            LocalDate.of(2026, 9, 16), "America/Toronto", "sales-kpi-v1"));

        mockMvc.perform(get("/api/v1/sales/kpis/workspace"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.asOfDate").value("2026-09-16"))
            .andExpect(jsonPath("$.timeZone").value("America/Toronto"))
            .andExpect(jsonPath("$.units[0].id").value(7))
            .andExpect(jsonPath("$.businesses[0].unitId").value(7));

        then(salesService).should().kpiWorkspace(23L, scope);
    }
}
