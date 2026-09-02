package com.indice.erp.ai.oauth;

import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.indice.erp.ai.access.AiAccessTokenService;
import com.indice.erp.auth.SessionAuthService;
import java.util.Set;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.HttpHeaders;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(AiOAuthMetadataController.class)
class AiOAuthMetadataControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private AiOAuthProperties properties;

    @MockBean
    private AiAccessTokenService accessTokenService;

    @MockBean
    private SessionAuthService sessionAuthService;

    @BeforeEach
    void setUp() {
        given(properties.getIssuerUrl()).willReturn("https://app.indiceapp.com");
        given(properties.getResourceUrl()).willReturn("https://app.indiceapp.com/api/v1/ai/mcp");
        given(properties.authorizationEndpoint()).willReturn("https://app.indiceapp.com/oauth/authorize");
        given(properties.tokenEndpoint()).willReturn("https://app.indiceapp.com/api/v1/ai/oauth/token");
        given(properties.registrationEndpoint()).willReturn("https://app.indiceapp.com/api/v1/ai/oauth/register");
        given(properties.userInfoEndpoint()).willReturn("https://app.indiceapp.com/api/v1/ai/oauth/userinfo");
        given(accessTokenService.supportedOAuthScopes()).willReturn(Set.of("openid", "email", "sales.today:read"));
    }

    @Test
    void chatGptCanReadAuthorizationMetadata() throws Exception {
        mockMvc.perform(get("/.well-known/oauth-authorization-server")
                .header(HttpHeaders.ORIGIN, "https://chatgpt.com"))
            .andExpect(status().isOk())
            .andExpect(header().string(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN, "https://chatgpt.com"))
            .andExpect(jsonPath("$.userinfo_endpoint")
                .value("https://app.indiceapp.com/api/v1/ai/oauth/userinfo"))
            .andExpect(jsonPath("$.scopes_supported").isArray())
            .andExpect(jsonPath("$.scopes_supported[?(@ == 'openid')]").exists())
            .andExpect(jsonPath("$.scopes_supported[?(@ == 'email')]").exists());
    }

    @Test
    void chatGptCanDiscoverVerifiedIdentityMetadataThroughOidc() throws Exception {
        mockMvc.perform(get("/.well-known/openid-configuration")
                .header(HttpHeaders.ORIGIN, "https://chatgpt.com"))
            .andExpect(status().isOk())
            .andExpect(header().string(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN, "https://chatgpt.com"))
            .andExpect(jsonPath("$.issuer").value("https://app.indiceapp.com"))
            .andExpect(jsonPath("$.userinfo_endpoint")
                .value("https://app.indiceapp.com/api/v1/ai/oauth/userinfo"))
            .andExpect(jsonPath("$.scopes_supported[?(@ == 'openid')]").exists())
            .andExpect(jsonPath("$.scopes_supported[?(@ == 'email')]").exists())
            .andExpect(jsonPath("$.claims_supported[?(@ == 'email_verified')]").exists());
    }

    @Test
    void unrelatedOriginsCannotReadAuthorizationMetadataCrossOrigin() throws Exception {
        mockMvc.perform(get("/.well-known/oauth-authorization-server")
                .header(HttpHeaders.ORIGIN, "https://example.com"))
            .andExpect(status().isForbidden());
    }
}
