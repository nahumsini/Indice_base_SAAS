package com.indice.erp.hr;

import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.auth.SessionAuthService;
import com.indice.erp.hr.HrAccessService.HrTab;
import com.indice.erp.hr.payroll.HrPayrollApiController;
import com.indice.erp.hr.payroll.HrPayrollService;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;


@WebMvcTest(HrPayrollApiController.class)
class HrPayrollApiControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private SessionAuthService sessionAuthService;

    @MockBean
    private HrPayrollService hrPayrollService;

    @MockBean
    private HrAccessService hrAccessService;

    @BeforeEach
    void allowHrAccessByDefault() {
        given(hrAccessService.canAccessManagementTab(any(AuthSessionUser.class), any(HrTab.class)))
            .willReturn(true);
    }

    @Test
    void overviewRequiresAuthentication() throws Exception {
        given(sessionAuthService.currentUser(any())).willReturn(Optional.empty());

        mockMvc.perform(get("/api/v1/hr/payroll/overview"))
            .andExpect(status().isUnauthorized())
            .andExpect(jsonPath("$.message").value("Unauthorized"));
    }

    @Test
    void overviewReturnsForbiddenWhenPayrollTabIsDenied() throws Exception {
        var currentUser = new AuthSessionUser(1L, 1L, "Usuario Demo", "admin");
        given(sessionAuthService.currentUser(any())).willReturn(Optional.of(currentUser));
        given(hrAccessService.canAccessManagementTab(currentUser, HrTab.PAYROLL)).willReturn(false);

        mockMvc.perform(get("/api/v1/hr/payroll/overview"))
            .andExpect(status().isForbidden())
            .andExpect(jsonPath("$.message").value("Forbidden"));
    }


    @Test
    void preferencesUpdateReturnsBadRequestFromServiceValidation() throws Exception {
        var currentUser = new AuthSessionUser(1L, 1L, "Usuario Demo", "admin");
        given(sessionAuthService.currentUser(any())).willReturn(Optional.of(currentUser));
        given(hrPayrollService.savePreferences(eq(1L), anyMap()))
            .willThrow(new IllegalArgumentException("grouping_mode must be single, unit, or business."));

        mockMvc.perform(
            put("/api/v1/hr/payroll/preferences")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "grouping_mode": "invalid"
                    }
                    """)
        )
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.message").value("grouping_mode must be single, unit, or business."));
    }

    @Test
    void createRunsReturnsCreatedPayload() throws Exception {
        var currentUser = new AuthSessionUser(1L, 1L, "Usuario Demo", "admin");
        given(sessionAuthService.currentUser(any())).willReturn(Optional.of(currentUser));
        given(hrPayrollService.createRuns(eq(1L), eq(1L), anyMap())).willReturn(Map.of(
            "items", List.of(Map.of(
                "id", 5,
                "status", "draft",
                "pay_period", "weekly",
                "users_count", 2
            ))
        ));

        mockMvc.perform(
            post("/api/v1/hr/payroll/runs")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "pay_period": "weekly",
                      "grouping_mode": "single",
                      "period_start_date": "2026-04-06",
                      "period_end_date": "2026-04-12"
                    }
                    """)
        )
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.items[0].id").value(5))
            .andExpect(jsonPath("$.items[0].status").value("draft"))
            .andExpect(jsonPath("$.items[0].users_count").value(2));
    }

    @Test
    void createRunsReturnsBadRequestWhenNoHrUsersMatchSelectedFrequency() throws Exception {
        var currentUser = new AuthSessionUser(1L, 1L, "Usuario Demo", "admin");
        given(sessionAuthService.currentUser(any())).willReturn(Optional.of(currentUser));
        given(hrPayrollService.createRuns(eq(1L), eq(1L), anyMap()))
            .willThrow(new IllegalArgumentException("No active HR users are configured for the selected pay frequency."));

        mockMvc.perform(
            post("/api/v1/hr/payroll/runs")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "pay_period": "biweekly",
                      "grouping_mode": "single",
                      "period_start_date": "2026-04-01",
                      "period_end_date": "2026-04-14"
                    }
                    """)
        )
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.message").value("No active HR users are configured for the selected pay frequency."));
    }
}
