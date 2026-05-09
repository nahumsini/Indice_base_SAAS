package com.indice.erp.configcenter;

import static org.mockito.BDDMockito.given;
import static org.springframework.http.MediaType.APPLICATION_JSON;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.Map;
import java.util.NoSuchElementException;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(InvitationApiController.class)
class InvitationApiControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private ConfigCenterService configCenterService;

    @Test
    void getInvitationReturnsPublicInvitationDetails() throws Exception {
        given(configCenterService.getInvitation("abc123"))
            .willReturn(Map.of(
                "email", "invite@example.com",
                "full_name", "Pending Invite",
                "role", "user",
                "company_id", 7L,
                "company_name", "Indice Demo",
                "status", "pending",
                "expires_at", "2026-05-13T12:00:00"
            ));

        mockMvc.perform(get("/api/v1/invitations/abc123"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.email").value("invite@example.com"))
            .andExpect(jsonPath("$.company_name").value("Indice Demo"))
            .andExpect(jsonPath("$.status").value("pending"));
    }

    @Test
    void getInvitationReturnsNotFoundForUnknownToken() throws Exception {
        given(configCenterService.getInvitation("missing"))
            .willThrow(new NoSuchElementException("Invitation not found."));

        mockMvc.perform(get("/api/v1/invitations/missing"))
            .andExpect(status().isNotFound())
            .andExpect(jsonPath("$.message").value("Invitation not found."));
    }

    @Test
    void acceptInvitationReturnsCreatedUserAccess() throws Exception {
        given(configCenterService.acceptInvitation(org.mockito.ArgumentMatchers.eq("abc123"), org.mockito.ArgumentMatchers.anyMap()))
            .willReturn(Map.of(
                "accepted", true,
                "user_id", 42L,
                "email", "invite@example.com",
                "full_name", "Pending Invite",
                "company_id", 7L,
                "company_name", "Indice Demo",
                "role", "user",
                "status", "active"
            ));

        mockMvc.perform(post("/api/v1/invitations/abc123/accept")
                .contentType(APPLICATION_JSON)
                .content("""
                    {
                      "password": "secure-pass",
                      "confirm_password": "secure-pass"
                    }
                    """))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.accepted").value(true))
            .andExpect(jsonPath("$.user_id").value(42))
            .andExpect(jsonPath("$.status").value("active"));
    }

    @Test
    void acceptInvitationReturnsBadRequestForInvalidPayload() throws Exception {
        given(configCenterService.acceptInvitation(org.mockito.ArgumentMatchers.eq("abc123"), org.mockito.ArgumentMatchers.anyMap()))
            .willThrow(new IllegalArgumentException("Password and confirmation must match."));

        mockMvc.perform(post("/api/v1/invitations/abc123/accept")
                .contentType(APPLICATION_JSON)
                .content("""
                    {
                      "password": "secure-pass",
                      "confirm_password": "different-pass"
                    }
                    """))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.message").value("Password and confirmation must match."));
    }
}
