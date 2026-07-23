package com.indice.erp.billing.subscription;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.willThrow;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.auth.SessionAuthService;
import com.indice.erp.auth.SessionCsrfService;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(BillingSubscriptionApiController.class)
class BillingSubscriptionApiControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private SessionAuthService sessionAuthService;

    @MockBean
    private SessionCsrfService csrfService;

    @MockBean
    private BillingSubscriptionManagementService subscriptionService;

    @Test
    void cancelRejectsMissingCsrfToken() throws Exception {
        given(sessionAuthService.currentUser(any())).willReturn(Optional.of(owner()));
        willThrow(new IllegalArgumentException("Invalid CSRF token."))
            .given(csrfService).requireCsrf(any(), eq(null));

        mockMvc.perform(post("/api/v1/billing/subscription/cancel"))
            .andExpect(status().isForbidden())
            .andExpect(jsonPath("$.message").value("Invalid CSRF token."));

        verifyNoInteractions(subscriptionService);
    }

    @Test
    void resumeRejectsMissingCsrfToken() throws Exception {
        given(sessionAuthService.currentUser(any())).willReturn(Optional.of(owner()));
        willThrow(new IllegalArgumentException("Invalid CSRF token."))
            .given(csrfService).requireCsrf(any(), eq(null));

        mockMvc.perform(post("/api/v1/billing/subscription/resume"))
            .andExpect(status().isForbidden())
            .andExpect(jsonPath("$.message").value("Invalid CSRF token."));

        verifyNoInteractions(subscriptionService);
    }

    @Test
    void portalRejectsMissingCsrfToken() throws Exception {
        given(sessionAuthService.currentUser(any())).willReturn(Optional.of(owner()));
        willThrow(new IllegalArgumentException("Invalid CSRF token."))
            .given(csrfService).requireCsrf(any(), eq(null));

        mockMvc.perform(post("/api/v1/billing/subscription/portal"))
            .andExpect(status().isForbidden())
            .andExpect(jsonPath("$.message").value("Invalid CSRF token."));

        verifyNoInteractions(subscriptionService);
    }

    @Test
    void cancelWithValidCsrfRunsBillingAction() throws Exception {
        given(sessionAuthService.currentUser(any())).willReturn(Optional.of(owner()));
        given(subscriptionService.cancel(7L)).willReturn(response());

        mockMvc.perform(post("/api/v1/billing/subscription/cancel")
                .header("X-CSRF-Token", "csrf-token"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.status").value("trialing"));

        verify(csrfService).requireCsrf(any(), eq("csrf-token"));
        verify(subscriptionService).cancel(7L);
    }

    @Test
    void resumeWithValidCsrfRunsBillingAction() throws Exception {
        given(sessionAuthService.currentUser(any())).willReturn(Optional.of(owner()));
        given(subscriptionService.resume(7L)).willReturn(response());

        mockMvc.perform(post("/api/v1/billing/subscription/resume")
                .header("X-CSRF-Token", "csrf-token"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.status").value("trialing"));

        verify(csrfService).requireCsrf(any(), eq("csrf-token"));
        verify(subscriptionService).resume(7L);
    }

    @Test
    void portalWithValidCsrfRunsBillingAction() throws Exception {
        given(sessionAuthService.currentUser(any())).willReturn(Optional.of(owner()));
        given(subscriptionService.portal(7L)).willReturn(new BillingPortalResponse("https://billing.stripe.com/session"));

        mockMvc.perform(post("/api/v1/billing/subscription/portal")
                .header("X-CSRF-Token", "csrf-token"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.url").value("https://billing.stripe.com/session"));

        verify(csrfService).requireCsrf(any(), eq("csrf-token"));
        verify(subscriptionService).portal(7L);
    }

    private AuthSessionUser owner() {
        return new AuthSessionUser(1L, 7L, 11L, "Ada Owner", "owner");
    }

    private BillingSubscriptionResponse response() {
        return new BillingSubscriptionResponse("trialing", "all-modules", 7, 5, 0, 5, 1, 4, 19_900,
            "usd", "", "", "", "", true, "", "", "", "", "", "", "stripe", true, "", true,
            List.of("crm"), 1, 1, 0, 4, true);
    }
}
