package com.indice.erp.hr;

import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.auth.SessionAuthService;
import com.indice.erp.auth.SessionCsrfService;
import com.indice.erp.hr.HrAccessDeniedException;
import com.indice.erp.hr.HrAccessService.HrTab;
import com.indice.erp.hr.payroll.HrPayrollApiController;
import com.indice.erp.hr.payroll.HrPayrollAuthorizationService;
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
import static org.mockito.BDDMockito.willThrow;
import static org.mockito.Mockito.verifyNoInteractions;
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

    @MockBean
    private HrPayrollAuthorizationService authorizationService;

    @MockBean
    private SessionCsrfService sessionCsrfService;

    @BeforeEach
    void allowHrAccessByDefault() {
        given(hrAccessService.canAccessManagementTab(any(AuthSessionUser.class), any(HrTab.class)))
            .willReturn(true);
        given(authorizationService.can(any(AuthSessionUser.class), any(HrPayrollAuthorizationService.Action.class)))
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
        given(hrPayrollService.createRuns(eq(currentUser), anyMap())).willReturn(Map.of(
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
        given(hrPayrollService.createRuns(eq(currentUser), anyMap()))
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

    @Test
    void createRunsReturnsForbiddenWhenRoleCannotPreparePayroll() throws Exception {
        var currentUser = new AuthSessionUser(2L, 1L, "Employee", "user");
        given(sessionAuthService.currentUser(any())).willReturn(Optional.of(currentUser));
        given(authorizationService.can(currentUser, HrPayrollAuthorizationService.Action.PREPARE)).willReturn(false);

        mockMvc.perform(
            post("/api/v1/hr/payroll/runs")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "pay_period": "weekly",
                      "grouping_mode": "single",
                      "period_start_date": "2026-04-06"
                    }
                    """)
        )
            .andExpect(status().isForbidden())
            .andExpect(jsonPath("$.message").value("Forbidden"));

        verifyNoInteractions(hrPayrollService);
    }

    @Test
    void createRunsReturnsForbiddenWhenCsrfTokenIsInvalid() throws Exception {
        var currentUser = new AuthSessionUser(1L, 1L, "Usuario Demo", "admin");
        given(sessionAuthService.currentUser(any())).willReturn(Optional.of(currentUser));
        willThrow(new IllegalArgumentException("Invalid CSRF token."))
            .given(sessionCsrfService)
            .requireCsrf(any(), eq("invalid"));

        mockMvc.perform(
            post("/api/v1/hr/payroll/runs")
                .header("X-CSRF-Token", "invalid")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "pay_period": "weekly",
                      "grouping_mode": "single",
                      "period_start_date": "2026-04-06"
                    }
                    """)
        )
            .andExpect(status().isForbidden())
            .andExpect(jsonPath("$.message").value("Invalid CSRF token."));

        verifyNoInteractions(hrPayrollService);
    }

    @Test
    void regenerateRunsReturnsOpenRunRegenerationSummary() throws Exception {
        var currentUser = new AuthSessionUser(1L, 1L, "Usuario Demo", "admin");
        given(sessionAuthService.currentUser(any())).willReturn(Optional.of(currentUser));
        given(hrPayrollService.regenerateOpenRuns(eq(currentUser))).willReturn(Map.of(
            "items", List.of(Map.of(
                "id", 12,
                "status", "draft",
                "pay_period", "weekly",
                "users_count", 4
            )),
            "cancelled_count", 2,
            "regenerated_count", 1,
            "skipped_locked_count", 3
        ));

        mockMvc.perform(post("/api/v1/hr/payroll/runs/regenerate"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.cancelled_count").value(2))
            .andExpect(jsonPath("$.regenerated_count").value(1))
            .andExpect(jsonPath("$.skipped_locked_count").value(3))
            .andExpect(jsonPath("$.items[0].status").value("draft"));
    }

    @Test
    void runDetailReturnsForbiddenWhenPayrollRunIsOutsideOperationalScope() throws Exception {
        var currentUser = new AuthSessionUser(1L, 1L, "Usuario Demo", "admin");
        given(sessionAuthService.currentUser(any())).willReturn(Optional.of(currentUser));
        given(hrPayrollService.getRunDetail(currentUser, 9L))
            .willThrow(new HrAccessDeniedException("Forbidden"));

        mockMvc.perform(get("/api/v1/hr/payroll/runs/9"))
            .andExpect(status().isForbidden())
            .andExpect(jsonPath("$.message").value("Forbidden"));
    }

    @Test
    void runLineIncentivesRemainVisibleForAnImmutableRun() throws Exception {
        var currentUser = new AuthSessionUser(1L, 1L, "Usuario Demo", "admin");
        given(sessionAuthService.currentUser(any())).willReturn(Optional.of(currentUser));
        given(hrPayrollService.listRunLineIncentives(currentUser, 127L, 44L)).willReturn(Map.of(
            "run_status", "cancelled",
            "editable", false,
            "items", List.of(Map.of(
                "application_id", 81L,
                "name", "Bono de puntualidad",
                "applied_to_line", true,
                "connector_status", "ready"
            ))
        ));

        mockMvc.perform(get("/api/v1/hr/payroll/runs/127/lines/44/incentives"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.run_status").value("cancelled"))
            .andExpect(jsonPath("$.editable").value(false))
            .andExpect(jsonPath("$.items[0].name").value("Bono de puntualidad"));
    }

    @Test
    void applyRunLineIncentiveUsesPayrollPreparationAuthorization() throws Exception {
        var currentUser = new AuthSessionUser(2L, 1L, "Employee", "user");
        given(sessionAuthService.currentUser(any())).willReturn(Optional.of(currentUser));
        given(authorizationService.can(currentUser, HrPayrollAuthorizationService.Action.PREPARE)).willReturn(false);

        mockMvc.perform(post("/api/v1/hr/payroll/runs/127/lines/44/incentives/81"))
            .andExpect(status().isForbidden())
            .andExpect(jsonPath("$.message").value("Forbidden"));

        verifyNoInteractions(hrPayrollService);
    }
}
