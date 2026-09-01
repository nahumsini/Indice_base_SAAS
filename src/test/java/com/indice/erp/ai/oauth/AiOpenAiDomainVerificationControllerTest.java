package com.indice.erp.ai.oauth;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.indice.erp.auth.SessionAuthService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.HttpHeaders;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(AiOpenAiDomainVerificationController.class)
@TestPropertySource(properties = "app.ai.publication.domain-challenge-token=indice-openai-domain-proof")
class AiOpenAiDomainVerificationControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private SessionAuthService sessionAuthService;

    @Test
    void returnsOnlyConfiguredVerificationToken() throws Exception {
        mockMvc.perform(get("/.well-known/openai-apps-challenge"))
            .andExpect(status().isOk())
            .andExpect(header().string(HttpHeaders.CACHE_CONTROL, "no-store"))
            .andExpect(content().contentTypeCompatibleWith("text/plain"))
            .andExpect(content().string("indice-openai-domain-proof"));
    }
}
