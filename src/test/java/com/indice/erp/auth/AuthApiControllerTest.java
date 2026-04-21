package com.indice.erp.auth;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.springframework.http.MediaType.APPLICATION_JSON;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(AuthApiController.class)
class AuthApiControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private SessionAuthService sessionAuthService;

    @Test
    void meReturnsUnauthorizedWhenSessionIsMissing() throws Exception {
        given(sessionAuthService.currentSession(any())).willReturn(Optional.empty());

        mockMvc.perform(get("/api/v1/auth/me"))
            .andExpect(status().isUnauthorized())
            .andExpect(jsonPath("$.message").value("User is not authenticated"));
    }

    @Test
    void loginReturnsSessionPayloadWhenCredentialsAreValid() throws Exception {
        var session = new AuthSessionResponse(
            new AuthSessionResponse.UserInfo(1L, "Usuario Demo", "admin"),
            new AuthSessionResponse.CompanyInfo(1L)
        );

        given(sessionAuthService.loginJson(eq("demo@example.com"), eq("demo123"), any()))
            .willReturn(new LoginAttemptResult(true, ""));
        given(sessionAuthService.currentSession(any())).willReturn(Optional.of(session));

        mockMvc.perform(post("/api/v1/auth/login")
                .contentType(APPLICATION_JSON)
                .content("""
                    {
                      "email": "demo@example.com",
                      "password": "demo123"
                    }
                    """))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.user.id").value(1))
            .andExpect(jsonPath("$.user.name").value("Usuario Demo"))
            .andExpect(jsonPath("$.user.role").value("admin"))
            .andExpect(jsonPath("$.company.id").value(1));
    }
}
