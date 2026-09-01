package com.indice.erp.ai.oauth;

import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.indice.erp.ai.access.AiAccessTokenRepository;
import com.indice.erp.ai.access.AiAccessTokenService;
import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.auth.SessionAuthService;
import java.util.Optional;
import java.util.Set;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.HttpHeaders;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(AiOAuthUserInfoController.class)
class AiOAuthUserInfoControllerTest {

    private static final String AUTHORIZATION = "Bearer idx_ai_abcdefghijklmnopqrstuvwxyz1234567890";
    private static final AuthSessionUser USER = new AuthSessionUser(10L, 20L, 30L, "Owner", "superadmin");

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private AiAccessTokenService tokenService;

    @MockBean
    private AiOAuthUserInfoRepository repository;

    @MockBean
    private AiOAuthProperties properties;

    @MockBean
    private SessionAuthService sessionAuthService;

    @Test
    void returnsVerifiedEmailForAnAuthorizedIdentityToken() throws Exception {
        given(properties.getIssuerUrl()).willReturn("https://app.indiceapp.com");
        given(tokenService.authenticateReadOnly(AUTHORIZATION)).willReturn(Optional.of(
            new AiAccessTokenRepository.StoredToken(
                91L,
                USER,
                Set.of(AiAccessTokenService.OPENID, AiAccessTokenService.EMAIL)
            )
        ));
        given(repository.find(USER)).willReturn(Optional.of(
            new AiOAuthUserInfoRepository.UserInfo("owner@example.com", true)
        ));

        mockMvc.perform(get("/api/v1/ai/oauth/userinfo").header(HttpHeaders.AUTHORIZATION, AUTHORIZATION))
            .andExpect(status().isOk())
            .andExpect(header().string(HttpHeaders.CACHE_CONTROL,
                org.hamcrest.Matchers.containsString("no-store")))
            .andExpect(jsonPath("$.sub").value(org.hamcrest.Matchers.startsWith("idx_")))
            .andExpect(jsonPath("$.email").value("owner@example.com"))
            .andExpect(jsonPath("$.email_verified").value(true));
    }

    @Test
    void rejectsATokenWithoutIdentityScopes() throws Exception {
        given(tokenService.authenticateReadOnly(AUTHORIZATION)).willReturn(Optional.of(
            new AiAccessTokenRepository.StoredToken(91L, USER, Set.of(AiAccessTokenService.SALES_READ))
        ));

        mockMvc.perform(get("/api/v1/ai/oauth/userinfo").header(HttpHeaders.AUTHORIZATION, AUTHORIZATION))
            .andExpect(status().isForbidden())
            .andExpect(header().string(HttpHeaders.WWW_AUTHENTICATE,
                org.hamcrest.Matchers.containsString("insufficient_scope")));
    }

    @Test
    void rejectsMissingOrInvalidBearerTokens() throws Exception {
        mockMvc.perform(get("/api/v1/ai/oauth/userinfo"))
            .andExpect(status().isUnauthorized())
            .andExpect(header().string(HttpHeaders.WWW_AUTHENTICATE,
                org.hamcrest.Matchers.containsString("invalid_token")));
    }
}
