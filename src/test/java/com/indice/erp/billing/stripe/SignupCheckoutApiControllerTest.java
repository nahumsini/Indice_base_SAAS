package com.indice.erp.billing.stripe;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.indice.erp.auth.SessionAuthService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(SignupCheckoutApiController.class)
class SignupCheckoutApiControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private SessionAuthService sessionAuthService;

    @Test
    void legacyAuthSignupCheckoutIsGone() throws Exception {
        mockMvc.perform(post("/api/v1/auth/signup/checkout"))
            .andExpect(status().isGone())
            .andExpect(jsonPath("$.signupPath").value("/signup"))
            .andExpect(jsonPath("$.apiPath").value("/api/v1/billing/signup/checkout"));
    }

    @Test
    void legacyAuthSignupStatusIsGone() throws Exception {
        mockMvc.perform(get("/api/v1/auth/signup/checkout-status").param("session_id", "cs_test_123"))
            .andExpect(status().isGone())
            .andExpect(jsonPath("$.signupPath").value("/signup"))
            .andExpect(jsonPath("$.apiPath").value("/api/v1/billing/signup/checkout"));
    }
}
