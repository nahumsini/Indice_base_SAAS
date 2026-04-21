package com.indice.erp.dashboard.businessprofile;

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

@WebMvcTest(BusinessProfileApiController.class)
class BusinessProfileApiControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private SessionAuthService sessionAuthService;

    @MockBean
    private BusinessProfileService businessProfileService;

    @Test
    void getBusinessProfileReturnsUnauthorizedWhenSessionIsMissing() throws Exception {
        given(sessionAuthService.currentUser(any())).willReturn(Optional.empty());

        mockMvc.perform(get("/api/v1/dashboard/business-profile"))
            .andExpect(status().isUnauthorized())
            .andExpect(jsonPath("$.message").value("Unauthorized"));
    }

    @Test
    void saveBusinessProfileReturnsSavedSectionsForAuthenticatedSession() throws Exception {
        var currentUser = new AuthSessionUser(1L, 7L, "Usuario Demo", "admin");
        var sections = new LinkedHashMap<String, Object>();
        sections.put("people", Map.of(
            "id", 11L,
            "section_key", "people",
            "status", "completed",
            "completed_at", "2026-04-02 11:30:00",
            "data", Map.of(
                "ui_key", "personas",
                "saved_at", "2026-04-02 11:30:00",
                "answered_count", 10,
                "question_count", 10,
                "answers", Map.of("p1", 2, "p2", 4)
            )
        ));

        var response = new LinkedHashMap<String, Object>();
        var profile = new LinkedHashMap<String, Object>();
        profile.put("id", 3L);
        profile.put("company_id", 7L);
        profile.put("version", 1);
        profile.put("status", "in_progress");
        profile.put("started_at", "2026-04-02 11:00:00");
        profile.put("completed_at", null);
        response.put("profile", profile);
        response.put("sections", sections);

        given(sessionAuthService.currentUser(any())).willReturn(Optional.of(currentUser));
        given(businessProfileService.saveBusinessProfile(org.mockito.ArgumentMatchers.eq(7L), org.mockito.ArgumentMatchers.eq(1L), anyMap()))
            .willReturn(response);

        mockMvc.perform(put("/api/v1/dashboard/business-profile")
                .contentType(APPLICATION_JSON)
                .content("""
                    {
                      "sections": {
                        "people": {
                          "status": "completed",
                          "data": {
                            "ui_key": "personas",
                            "answers": {
                              "p1": 2,
                              "p2": 4
                            }
                          }
                        }
                      }
                    }
                    """))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.profile.status").value("in_progress"))
            .andExpect(jsonPath("$.sections.people.section_key").value("people"))
            .andExpect(jsonPath("$.sections.people.data.answers.p2").value(4));
    }
}
