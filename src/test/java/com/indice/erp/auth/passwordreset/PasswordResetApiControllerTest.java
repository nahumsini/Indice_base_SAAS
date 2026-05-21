package com.indice.erp.auth.passwordreset;

import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.springframework.http.MediaType.APPLICATION_JSON;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.indice.erp.config.AppWebProperties;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(PasswordResetApiController.class)
class PasswordResetApiControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private PasswordResetService passwordResetService;

    @MockBean
    private AppWebProperties appWebProperties;

    @Test
    void requestResetReturnsGenericMessage() throws Exception {
        given(appWebProperties.resolvePasswordResetBaseUrl()).willReturn("https://app.indice.test");
        given(passwordResetService.requestReset(eq("ada@example.com"), eq("https://app.indice.test"), anyString(), eq("JUnit")))
            .willReturn(new PasswordResetService.PasswordResetRequestResult(PasswordResetService.GENERIC_RESET_REQUEST_MESSAGE));

        mockMvc.perform(post("/api/v1/auth/password-reset/request")
                .header("User-Agent", "JUnit")
                .contentType(APPLICATION_JSON)
                .content("""
                    {
                      "email": "ada@example.com"
                    }
                    """))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.message").value(PasswordResetService.GENERIC_RESET_REQUEST_MESSAGE));
    }

    @Test
    void requestResetCanUseAllowedRefererWhenPublicUrlIsNotConfigured() throws Exception {
        given(appWebProperties.resolvePasswordResetBaseUrl()).willReturn("");
        given(appWebProperties.getAllowedOrigins()).willReturn(List.of("https://app.indice.test"));
        given(passwordResetService.requestReset(eq("ada@example.com"), eq("https://app.indice.test"), anyString(), eq("JUnit")))
            .willReturn(new PasswordResetService.PasswordResetRequestResult(PasswordResetService.GENERIC_RESET_REQUEST_MESSAGE));

        mockMvc.perform(post("/api/v1/auth/password-reset/request")
                .header("Referer", "https://app.indice.test/login")
                .header("User-Agent", "JUnit")
                .contentType(APPLICATION_JSON)
                .content("""
                    {
                      "email": "ada@example.com"
                    }
                    """))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.message").value(PasswordResetService.GENERIC_RESET_REQUEST_MESSAGE));
    }

    @Test
    void validateResetTokenReturnsNotFoundForInvalidToken() throws Exception {
        given(passwordResetService.isTokenValid("bad-token")).willReturn(false);

        mockMvc.perform(get("/api/v1/auth/password-reset/bad-token"))
            .andExpect(status().isNotFound())
            .andExpect(jsonPath("$.message").value(PasswordResetService.INVALID_RESET_LINK_MESSAGE));
    }

    @Test
    void completeResetReturnsSuccess() throws Exception {
        mockMvc.perform(post("/api/v1/auth/password-reset/raw-token/complete")
                .contentType(APPLICATION_JSON)
                .content("""
                    {
                      "password": "newSecret123",
                      "confirm_password": "newSecret123"
                    }
                    """))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.message").value("Password has been reset."));
    }
}
