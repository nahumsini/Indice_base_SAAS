package com.indice.erp.billing.stripe;

import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.BDDMockito.given;
import static org.springframework.http.MediaType.APPLICATION_JSON;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.indice.erp.auth.SessionAuthService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(StripeWebhookController.class)
class StripeWebhookControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private StripeWebhookIngressService ingress;

    @MockBean
    private SessionAuthService sessionAuthService;

    @Test
    void webhookDoesNotRequireCsrf() throws Exception {
        given(ingress.receive("{}", "t=1,v1=test"))
            .willReturn(new StripeWebhookIngressService.IngressResponse("evt_test", false, true));

        mockMvc.perform(post("/api/v1/billing/stripe/webhook")
                .header("Stripe-Signature", "t=1,v1=test")
                .contentType(APPLICATION_JSON)
                .content("{}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.eventId").value("evt_test"))
            .andExpect(jsonPath("$.durablyStored").value(true));
    }

    @Test
    void invalidWebhookSignatureReturnsBadRequest() throws Exception {
        doThrow(new StripeWebhookSignatureException("Stripe webhook signature is invalid.", null))
            .when(ingress).receive(eq("{}"), eq("bad"));

        mockMvc.perform(post("/api/v1/billing/stripe/webhook")
                .header("Stripe-Signature", "bad")
                .contentType(APPLICATION_JSON)
                .content("{}"))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.message").value("Stripe webhook signature is invalid."));
    }
}
