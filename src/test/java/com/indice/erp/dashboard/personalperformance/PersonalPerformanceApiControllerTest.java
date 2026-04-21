package com.indice.erp.dashboard.personalperformance;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.BDDMockito.given;
import static org.springframework.http.MediaType.APPLICATION_JSON;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.auth.SessionAuthService;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(PersonalPerformanceApiController.class)
class PersonalPerformanceApiControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private SessionAuthService sessionAuthService;

    @MockBean
    private PersonalPerformanceService personalPerformanceService;

    @Test
    void getPersonalPerformanceReturnsUnauthorizedWhenSessionIsMissing() throws Exception {
        given(sessionAuthService.currentUser(any())).willReturn(Optional.empty());

        mockMvc.perform(get("/api/v1/dashboard/personal-performance/me"))
            .andExpect(status().isUnauthorized())
            .andExpect(jsonPath("$.message").value("Unauthorized"));
    }

    @Test
    void savePersonalPerformanceReturnsSavedSectionsForAuthenticatedSession() throws Exception {
        var currentUser = new AuthSessionUser(4L, 7L, "Usuario Demo", "admin");
        var sections = new LinkedHashMap<String, Object>();
        sections.put("sleep_recovery", Map.of(
            "id", 11L,
            "section_key", "sleep_recovery",
            "status", "completed",
            "completed_at", "2026-04-08 11:30:00",
            "data", Map.of(
                "ui_key", "sleep_recovery",
                "saved_at", "2026-04-08 11:30:00",
                "answered_count", 10,
                "question_count", 10,
                "answers", Map.of("sr1", 2, "sr2", 4)
            )
        ));

        var response = new LinkedHashMap<String, Object>();
        var profile = new LinkedHashMap<String, Object>();
        profile.put("id", 3L);
        profile.put("user_id", 4L);
        profile.put("company_id", 7L);
        profile.put("version", 1);
        profile.put("status", "in_progress");
        profile.put("started_at", "2026-04-08 11:00:00");
        profile.put("completed_at", null);
        response.put("profile", profile);
        response.put("sections", sections);

        given(sessionAuthService.currentUser(any())).willReturn(Optional.of(currentUser));
        given(personalPerformanceService.savePersonalPerformance(
            org.mockito.ArgumentMatchers.eq(4L),
            org.mockito.ArgumentMatchers.eq(7L),
            anyMap()
        )).willReturn(response);

        mockMvc.perform(put("/api/v1/dashboard/personal-performance/me")
                .contentType(APPLICATION_JSON)
                .content("""
                    {
                      "sections": {
                        "sleep_recovery": {
                          "status": "completed",
                          "data": {
                            "ui_key": "sleep_recovery",
                            "answers": {
                              "sr1": 2,
                              "sr2": 4
                            }
                          }
                        }
                      }
                    }
                    """))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.profile.user_id").value(4))
            .andExpect(jsonPath("$.sections.sleep_recovery.section_key").value("sleep_recovery"))
            .andExpect(jsonPath("$.sections.sleep_recovery.data.answers.sr2").value(4));
    }
}
