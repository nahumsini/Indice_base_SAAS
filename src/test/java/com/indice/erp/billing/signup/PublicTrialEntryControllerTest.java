package com.indice.erp.billing.signup;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import com.indice.erp.auth.SessionCsrfService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

class PublicTrialEntryControllerTest {
    private PublicTrialEntryService service;
    private PublicTrialEntryRateLimit rate;
    private SessionCsrfService csrf;
    private MockMvc mvc;

    @BeforeEach void setup() {
        service = mock(PublicTrialEntryService.class); rate = mock(PublicTrialEntryRateLimit.class);
        csrf = new SessionCsrfService();
        mvc = MockMvcBuilders.standaloneSetup(new PublicTrialEntryController(csrf, service, rate))
            .setControllerAdvice(new BillingSignupExceptionHandler()).build();
    }

    @Test void bothMutationsRequireSessionCsrfBeforeAnyBusinessOrRateWrite() throws Exception {
        for (var endpoint : java.util.List.of("interest", "account", "email-verification/start", "email-verification/resend", "email-verification/verify")) {
            mvc.perform(post("/api/v1/billing/signup/trial-entry/" + endpoint).contentType("application/json").content("{}"))
                .andExpect(status().isForbidden());
        }
        verifyNoInteractions(service, rate);
    }

    @Test void rateDenialFailsClosedAndDoesNotTrustForwardedFor() throws Exception {
        var session = new MockHttpSession(); var token = csrf.ensureCsrf(session);
        when(rate.consume("127.0.0.1")).thenReturn(false);
        mvc.perform(post("/api/v1/billing/signup/trial-entry/account").session(session).header("X-CSRF-Token", token)
            .header("X-Forwarded-For", "invented-address").contentType("application/json").content("{}"))
            .andExpect(status().isTooManyRequests()).andExpect(jsonPath("$.code").value("TRIAL_ENTRY_RATE_LIMITED"));
        verifyNoInteractions(service);
    }
}
