package com.indice.erp.billing.stripe;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.willThrow;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.springframework.http.MediaType.APPLICATION_JSON;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.indice.erp.auth.SessionCsrfService;
import com.indice.erp.billing.signup.BillingSignupIntent;
import com.indice.erp.billing.signup.BillingSignupIntentRepository;
import com.indice.erp.billing.signup.BillingSignupService;
import jakarta.servlet.http.HttpSession;
import java.time.Instant;
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
    private SessionCsrfService sessionCsrfService;

    @MockBean
    private BillingSignupService signupService;

    @MockBean
    private BillingSignupIntentRepository signupIntents;

    @MockBean
    private BillingSignupCheckoutReconciliationService reconciliationService;

    @Test
    void createCheckoutRejectsMissingCsrfToken() throws Exception {
        willThrow(new IllegalArgumentException("Invalid CSRF token."))
            .given(sessionCsrfService).requireCsrf(any(HttpSession.class), eq(null));

        mockMvc.perform(post("/api/v1/auth/signup/checkout")
                .contentType(APPLICATION_JSON)
                .content(validPayload()))
            .andExpect(status().isForbidden())
            .andExpect(jsonPath("$.message").value("Invalid CSRF token."));

        verifyNoInteractions(signupService);
    }

    @Test
    void createCheckoutReturnsStripeCheckoutUrl() throws Exception {
        given(sessionCsrfService.ensureCsrf(any(HttpSession.class))).willReturn("csrf-token");
        given(signupService.createCheckout(any(), any()))
            .willReturn(new BillingSignupService.SignupCheckoutResponse(
                "signup_ref",
                "CHECKOUT_CREATED",
                "cs_test_123",
                "https://checkout.stripe.com/c/test",
                Instant.parse("2026-07-21T12:00:00Z"),
                false,
                false
            ));

        mockMvc.perform(post("/api/v1/auth/signup/checkout")
                .header("X-CSRF-Token", "csrf-token")
                .contentType(APPLICATION_JSON)
                .content(validPayload()))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.checkoutUrl").value("https://checkout.stripe.com/c/test"))
            .andExpect(jsonPath("$.checkoutSessionId").value("cs_test_123"))
            .andExpect(jsonPath("$.csrfToken").value("csrf-token"));
    }

    @Test
    void checkoutStatusReturnsCurrentStateWithoutCsrf() throws Exception {
        var intent = new BillingSignupIntent(
            17L,
            "signup_ref",
            "idempotency",
            "fingerprint",
            "CHECKOUT_COMPLETED",
            "cus_test_123",
            "cs_test_123",
            "sub_test_123",
            "https://checkout.stripe.com/c/test",
            Instant.parse("2026-07-21T12:00:00Z"),
            "PROVISIONED",
            7L,
            3L,
            11L
        );
        given(signupIntents.findByCheckoutSessionId("cs_test_123"))
            .willReturn(intent);
        given(reconciliationService.reconcileIfCompleted(intent)).willReturn(intent);

        mockMvc.perform(get("/api/v1/auth/signup/checkout-status").param("session_id", "cs_test_123"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.status").value("completed"))
            .andExpect(jsonPath("$.companyId").value(7))
            .andExpect(jsonPath("$.canLogin").value(true))
            .andExpect(jsonPath("$.canRestart").value(false));
        verifyNoInteractions(sessionCsrfService);
    }

    @Test
    void checkoutStatusRejectsBlankSessionId() throws Exception {
        mockMvc.perform(get("/api/v1/auth/signup/checkout-status"))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.message").value("Checkout session id is required."));
        verifyNoInteractions(sessionCsrfService);
        verifyNoInteractions(signupIntents);
    }

    private String validPayload() {
        return """
            {
              "fullName": "Ada Owner",
              "email": "ada@example.com",
              "password": "securePass123",
              "companyName": "Ada Studio",
              "industry": "retail",
              "companySize": "1-5",
              "country": "MX",
              "phone": "+15555550123",
              "planId": "all-modules",
              "moduleCount": 7,
              "extraCollaborators": 0,
              "selectedModuleSlugs": ["human_resources", "expenses", "petty_cash", "pos", "crm", "processes", "kpis"]
            }
            """;
    }
}
