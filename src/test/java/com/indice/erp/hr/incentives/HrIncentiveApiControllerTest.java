package com.indice.erp.hr.incentives;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.willThrow;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.springframework.http.MediaType.APPLICATION_JSON;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.auth.SessionAuthService;
import com.indice.erp.auth.SessionCsrfService;
import com.indice.erp.hr.HrAccessService;
import com.indice.erp.hr.HrAccessService.HrTab;
import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(HrIncentiveApiController.class)
class HrIncentiveApiControllerTest {

    private static final AuthSessionUser CURRENT_USER = new AuthSessionUser(4L, 7L, "HR Manager", "admin");

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private SessionAuthService sessionAuthService;

    @MockBean
    private SessionCsrfService sessionCsrfService;

    @MockBean
    private HrAccessService hrAccessService;

    @MockBean
    private HrIncentiveService hrIncentiveService;

    @BeforeEach
    void allowIncentivesAccessByDefault() {
        given(sessionAuthService.currentUser(any())).willReturn(Optional.of(CURRENT_USER));
        given(hrAccessService.canAccessManagementTab(CURRENT_USER, HrTab.INCENTIVES)).willReturn(true);
    }

    @Test
    void listReturnsUnauthorizedWhenSessionIsMissing() throws Exception {
        given(sessionAuthService.currentUser(any())).willReturn(Optional.empty());

        mockMvc.perform(get("/api/v1/hr/incentives"))
            .andExpect(status().isUnauthorized())
            .andExpect(jsonPath("$.message").value("Unauthorized"));

        verifyNoInteractions(hrIncentiveService);
    }

    @Test
    void listReturnsForbiddenWhenIncentivesTabIsDenied() throws Exception {
        given(hrAccessService.canAccessManagementTab(CURRENT_USER, HrTab.INCENTIVES)).willReturn(false);

        mockMvc.perform(get("/api/v1/hr/incentives"))
            .andExpect(status().isForbidden())
            .andExpect(jsonPath("$.message").value("Forbidden"));

        verifyNoInteractions(hrIncentiveService);
    }

    @Test
    void listReturnsPersistedIncentiveRowsAndSummary() throws Exception {
        given(hrIncentiveService.listIncentives(eq(CURRENT_USER), any())).willReturn(Map.of(
            "rows", List.of(Map.of(
                "id", 81L,
                "name", "Attendance bonus",
                "status", "active"
            )),
            "summary", Map.of(
                "manual_count", 1,
                "automated_count", 0
            )
        ));

        mockMvc.perform(get("/api/v1/hr/incentives").param("status", "active"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.count").value(1))
            .andExpect(jsonPath("$.items[0].name").value("Attendance bonus"))
            .andExpect(jsonPath("$.summary.manual_count").value(1));
    }

    @Test
    void createRequiresCsrfBeforePersistingIncentive() throws Exception {
        willThrow(new IllegalArgumentException("Invalid CSRF token."))
            .given(sessionCsrfService)
            .requireCsrf(any(), any());

        mockMvc.perform(post("/api/v1/hr/incentives")
                .contentType(APPLICATION_JSON)
                .content("""
                    {
                      "name": "Attendance bonus",
                      "amount": 75.00,
                      "currency_code": "CAD"
                    }
                    """))
            .andExpect(status().isForbidden())
            .andExpect(jsonPath("$.message").value("Invalid CSRF token."));

        verifyNoInteractions(hrIncentiveService);
    }

    @Test
    void createReturnsCreatedPersistedIncentive() throws Exception {
        given(hrIncentiveService.createIncentive(eq(CURRENT_USER), anyMap())).willReturn(Map.of(
            "id", 81L,
            "incentive_code", "INC-000081",
            "name", "Attendance bonus",
            "amount", new BigDecimal("75.00")
        ));

        mockMvc.perform(post("/api/v1/hr/incentives")
                .header("X-CSRF-Token", "csrf-token")
                .contentType(APPLICATION_JSON)
                .content("""
                    {
                      "name": "Attendance bonus",
                      "amount": 75.00,
                      "currency_code": "CAD"
                    }
                    """))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.id").value(81))
            .andExpect(jsonPath("$.incentive_code").value("INC-000081"))
            .andExpect(jsonPath("$.name").value("Attendance bonus"));

        verify(sessionCsrfService).requireCsrf(any(), eq("csrf-token"));
    }

    @Test
    void deleteRequiresCsrfBeforeCancellingIncentive() throws Exception {
        willThrow(new IllegalArgumentException("Invalid CSRF token."))
            .given(sessionCsrfService)
            .requireCsrf(any(), any());

        mockMvc.perform(delete("/api/v1/hr/incentives/81"))
            .andExpect(status().isForbidden())
            .andExpect(jsonPath("$.message").value("Invalid CSRF token."));

        verifyNoInteractions(hrIncentiveService);
    }

    @Test
    void deleteReturnsNotFoundWhenIncentiveDoesNotExist() throws Exception {
        willThrow(new NoSuchElementException("Incentive not found."))
            .given(hrIncentiveService)
            .cancelIncentive(CURRENT_USER, 81L);

        mockMvc.perform(delete("/api/v1/hr/incentives/81")
                .header("X-CSRF-Token", "csrf-token"))
            .andExpect(status().isNotFound())
            .andExpect(jsonPath("$.message").value("Incentive not found."));
    }
}
