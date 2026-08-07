package com.indice.erp.dashboard.businessprofile;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.willThrow;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.springframework.http.MediaType.APPLICATION_JSON;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.auth.SessionAuthService;
import com.indice.erp.auth.SessionCsrfService;
import com.indice.erp.configcenter.ConfigCenterAccessService;
import com.indice.erp.configcenter.ConfigCenterAccessService.ConfigCenterTab;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
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
    private SessionCsrfService sessionCsrfService;

    @MockBean
    private ConfigCenterAccessService accessService;

    @MockBean
    private BusinessProfileService businessProfileService;

    @BeforeEach
    void allowBusinessProfileAccessByDefault() {
        given(accessService.canAccess(any(AuthSessionUser.class), any(ConfigCenterTab.class))).willReturn(true);
    }

    @Test
    void getBusinessProfileReturnsUnauthorizedWhenSessionIsMissing() throws Exception {
        given(sessionAuthService.currentUser(any())).willReturn(Optional.empty());

        mockMvc.perform(get("/api/v1/dashboard/business-profile"))
            .andExpect(status().isUnauthorized())
            .andExpect(jsonPath("$.message").value("Unauthorized"));
    }

    @Test
    void getBusinessProfileReturnsForbiddenWhenBusinessProfileTabIsDenied() throws Exception {
        var currentUser = new AuthSessionUser(1L, 7L, "Usuario Demo", "admin");
        given(sessionAuthService.currentUser(any())).willReturn(Optional.of(currentUser));
        given(accessService.canAccess(currentUser, ConfigCenterTab.BUSINESS_PROFILE)).willReturn(false);

        mockMvc.perform(get("/api/v1/dashboard/business-profile"))
            .andExpect(status().isForbidden())
            .andExpect(jsonPath("$.message").value("Forbidden"));
    }

    @Test
    void getBusinessProfileRequiresCsrfBeforeLoadingProfile() throws Exception {
        var currentUser = new AuthSessionUser(1L, 7L, "Usuario Demo", "admin");
        given(sessionAuthService.currentUser(any())).willReturn(Optional.of(currentUser));
        willThrow(new IllegalArgumentException("Invalid CSRF token."))
            .given(sessionCsrfService)
            .requireCsrf(any(), any());

        mockMvc.perform(get("/api/v1/dashboard/business-profile"))
            .andExpect(status().isForbidden())
            .andExpect(jsonPath("$.message").value("Invalid CSRF token."));

        verifyNoInteractions(businessProfileService);
    }

    @Test
    void getBusinessProfileReturnsProfileForValidCsrf() throws Exception {
        var currentUser = new AuthSessionUser(1L, 7L, "Usuario Demo", "admin");
        var response = new LinkedHashMap<String, Object>();
        response.put("profile", Map.of(
            "id", 3L,
            "company_id", 7L,
            "status", "draft"
        ));
        response.put("sections", Map.of());

        given(sessionAuthService.currentUser(any())).willReturn(Optional.of(currentUser));
        given(businessProfileService.getBusinessProfile(7L)).willReturn(response);

        mockMvc.perform(get("/api/v1/dashboard/business-profile")
                .header("X-CSRF-Token", "csrf-token"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.profile.company_id").value(7));

        verify(sessionCsrfService).requireCsrf(any(), eq("csrf-token"));
        verify(businessProfileService).getBusinessProfile(7L);
    }

    @Test
    void saveBusinessProfileReturnsForbiddenWhenBusinessProfileTabIsDenied() throws Exception {
        var currentUser = new AuthSessionUser(1L, 7L, "Usuario Demo", "admin");
        given(sessionAuthService.currentUser(any())).willReturn(Optional.of(currentUser));
        given(accessService.canAccess(currentUser, ConfigCenterTab.BUSINESS_PROFILE)).willReturn(false);

        mockMvc.perform(put("/api/v1/dashboard/business-profile")
                .header("X-CSRF-Token", "csrf-token")
                .contentType(APPLICATION_JSON)
                .content("""
                    {
                      "sections": {}
                    }
                    """))
            .andExpect(status().isForbidden())
            .andExpect(jsonPath("$.message").value("Forbidden"));

        verifyNoInteractions(businessProfileService);
    }

    @Test
    void saveBusinessProfileRequiresCsrfBeforeSaving() throws Exception {
        var currentUser = new AuthSessionUser(1L, 7L, "Usuario Demo", "admin");
        given(sessionAuthService.currentUser(any())).willReturn(Optional.of(currentUser));
        willThrow(new IllegalArgumentException("Invalid CSRF token."))
            .given(sessionCsrfService)
            .requireCsrf(any(), any());

        mockMvc.perform(put("/api/v1/dashboard/business-profile")
                .contentType(APPLICATION_JSON)
                .content("""
                    {
                      "sections": {
                        "people": {
                          "status": "completed"
                        }
                      }
                    }
                    """))
            .andExpect(status().isForbidden())
            .andExpect(jsonPath("$.message").value("Invalid CSRF token."));

        verifyNoInteractions(businessProfileService);
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
        given(businessProfileService.saveBusinessProfile(eq(7L), eq(1L), anyMap()))
            .willReturn(response);

        mockMvc.perform(put("/api/v1/dashboard/business-profile")
                .header("X-CSRF-Token", "csrf-token")
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

        verify(sessionCsrfService).requireCsrf(any(), eq("csrf-token"));
        verify(businessProfileService).saveBusinessProfile(eq(7L), eq(1L), anyMap());
    }
}
