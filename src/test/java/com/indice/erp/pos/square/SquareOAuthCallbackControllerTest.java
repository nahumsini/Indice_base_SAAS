package com.indice.erp.pos.square;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

class SquareOAuthCallbackControllerTest {
    @Test void getOnlyRedirectsCodeAndStateWithPrivacyHeaders() throws Exception {
        var mvc = MockMvcBuilders.standaloneSetup(new SquareOAuthCallbackController()).build();
        mvc.perform(get("/api/v1/pos/square/oauth/callback").param("code", "synthetic+code&")
            .param("state", "a".repeat(64)))
            .andExpect(status().isSeeOther())
            .andExpect(header().string("Location", "/point-of-sale/cajas?square_oauth_code=synthetic%2Bcode%26&square_oauth_state=" + "a".repeat(64)))
            .andExpect(header().string("Cache-Control", "no-store"))
            .andExpect(header().string("Referrer-Policy", "no-referrer"));
    }
    @Test void providerErrorsAndInvalidResponsesNeverReflectRawInput() throws Exception {
        var mvc = MockMvcBuilders.standaloneSetup(new SquareOAuthCallbackController()).build();
        mvc.perform(get("/api/v1/pos/square/oauth/callback").param("error", "synthetic-sensitive-error"))
            .andExpect(status().isSeeOther())
            .andExpect(header().string("Location", "/point-of-sale/cajas?square_oauth_error=access_denied"));
        mvc.perform(get("/api/v1/pos/square/oauth/callback").param("code", "c".repeat(192)).param("state", "a".repeat(64)))
            .andExpect(status().isSeeOther())
            .andExpect(header().string("Location", "/point-of-sale/cajas?square_oauth_error=invalid_response"));
    }
}
