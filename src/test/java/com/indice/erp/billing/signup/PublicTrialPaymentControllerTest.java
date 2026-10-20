package com.indice.erp.billing.signup;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import com.indice.erp.auth.*;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

class PublicTrialPaymentControllerTest {
    private SessionAuthService auth;
    private SessionCsrfService csrf;
    private ManagedCompanyContextService contexts;
    private PublicTrialPaymentService payments;
    private MockMvc mvc;
    private final AuthSessionUser actor = new AuthSessionUser(2L, 7L, 12L, "Test Owner", "admin");
    private static final String PATH = "/api/v1/billing/subscription/trial-payment";

    @BeforeEach void setup() {
        auth = mock(SessionAuthService.class); csrf = new SessionCsrfService();
        contexts = mock(ManagedCompanyContextService.class); payments = mock(PublicTrialPaymentService.class);
        mvc = MockMvcBuilders.standaloneSetup(new PublicTrialPaymentController(auth, csrf, contexts, payments)).build();
        when(auth.currentActor(any())).thenReturn(Optional.of(actor));
        when(contexts.resolveBillingContext(any(), any())).thenReturn(new ManagedCompanyContextService.BillingContext(7L, "Company", "DIRECT", false, false));
    }
    @Test void authenticationAndCsrfFailBeforeAnyFinancialExecution() throws Exception {
        when(auth.currentActor(any())).thenReturn(Optional.empty());
        mvc.perform(get(PATH)).andExpect(status().isUnauthorized());
        mvc.perform(post(PATH).contentType("application/json").content("{}")) .andExpect(status().isUnauthorized());
        when(auth.currentActor(any())).thenReturn(Optional.of(actor));
        mvc.perform(post(PATH).contentType("application/json").content("{}")) .andExpect(status().isForbidden());
        verifyNoInteractions(contexts, payments);
    }
    @Test void distributorAndPlatformDelegationCannotAuthorizePayment() throws Exception {
        for (var mode : List.of("DISTRIBUTOR_PORTFOLIO", "PLATFORM_ROOT")) {
            when(contexts.resolveBillingContext(any(), any())).thenReturn(new ManagedCompanyContextService.BillingContext(99L, "Managed", mode, true, true));
            var session = new MockHttpSession(); var token = csrf.ensureCsrf(session);
            mvc.perform(get(PATH).session(session)).andExpect(status().isForbidden());
            mvc.perform(post(PATH).session(session).header("X-CSRF-Token", token).contentType("application/json").content("{}"))
                .andExpect(status().isForbidden()).andExpect(jsonPath("$.code").value("OWNER_PAYMENT_CONTEXT_REQUIRED"));
        }
        verifyNoInteractions(payments);
    }
    @Test void companyAndActorAlwaysComeFromAuthenticatedContextNotClientBody() throws Exception {
        var session = new MockHttpSession(); var token = csrf.ensureCsrf(session);
        when(payments.workspace(7L, 2L, "YEAR")).thenReturn(new PublicTrialPaymentContracts.Workspace(false, false, false, null, null, null, null, List.of()));
        mvc.perform(get(PATH).param("interval", "YEAR").param("companyId", "99")).andExpect(status().isOk());
        verify(payments).workspace(7L, 2L, "YEAR");
        mvc.perform(post(PATH).session(session).header("X-CSRF-Token", token).header("Idempotency-Key", "a".repeat(64))
            .contentType("application/json").content("{\"companyId\":99,\"actorUserId\":100,\"acceptedAutomaticPayment\":true}"))
            .andExpect(status().isOk());
        verify(payments).activate(eq(7L), eq(2L), eq("a".repeat(64)), any());
    }
    @Test void providerFailureIsRedactedAndNotReportedAsSuccess() throws Exception {
        var session = new MockHttpSession(); var token = csrf.ensureCsrf(session);
        when(payments.activate(anyLong(), anyLong(), any(), any())).thenThrow(new com.indice.erp.billing.stripe.StripeGatewayException("private provider response", new RuntimeException("private")));
        mvc.perform(post(PATH).session(session).header("X-CSRF-Token", token).contentType("application/json").content("{}"))
            .andExpect(status().isServiceUnavailable()).andExpect(content().json("{\"code\":\"REGIONAL_PAYMENT_UNAVAILABLE\"}"));
    }
}
