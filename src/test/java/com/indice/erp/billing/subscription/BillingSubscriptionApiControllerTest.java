package com.indice.erp.billing.subscription;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.willThrow;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.auth.SessionAuthService;
import com.indice.erp.auth.SessionCsrfService;
import java.util.List;
import java.util.Optional;
import java.time.Instant;
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

    @MockBean
    private BillingProductSelectionService selectionService;

    @MockBean
    private BillingActivationService activationService;

    @MockBean
    private BillingInvoiceHistoryService invoiceHistoryService;

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

    @Test
    void selectionReturnsCommercialCatalogForCurrentCompany() throws Exception {
        given(sessionAuthService.currentUser(any())).willReturn(Optional.of(owner()));
        given(selectionService.current(7L)).willReturn(selection());

        mockMvc.perform(get("/api/v1/billing/subscription/selection"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.selected_product_codes[0]").value("basic_hr"))
            .andExpect(jsonPath("$.available_products[0].display_name").value("Recursos Humanos"));

        verify(selectionService).current(7L);
    }

    @Test
    void invoicesReturnStripeDocumentsForCurrentCompany() throws Exception {
        given(sessionAuthService.currentUser(any())).willReturn(Optional.of(owner()));
        given(invoiceHistoryService.current(7L)).willReturn(new BillingInvoiceHistoryResponse(List.of(
            new BillingInvoiceResponse(
                "in_123", "paid", "usd", 19_900L, 19_900L,
                "https://invoice.stripe.com/i/acct_test/in_123",
                "https://pay.stripe.com/invoice/acct_test/in_123/pdf",
                Instant.parse("2026-08-01T00:00:00Z"),
                Instant.parse("2026-09-01T00:00:00Z"),
                Instant.parse("2026-08-01T00:00:01Z")
            )
        )));

        mockMvc.perform(get("/api/v1/billing/subscription/invoices"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.invoices[0].invoice_id").value("in_123"))
            .andExpect(jsonPath("$.invoices[0].status").value("paid"))
            .andExpect(jsonPath("$.invoices[0].invoice_pdf_url").value("https://pay.stripe.com/invoice/acct_test/in_123/pdf"));

        verify(invoiceHistoryService).current(7L);
    }

    @Test
    void activationWithValidCsrfCreatesExistingCompanyCheckout() throws Exception {
        given(sessionAuthService.currentUser(any())).willReturn(Optional.of(owner()));
        given(activationService.createCheckout(eq(7L), eq(1L), eq("activation-123"), any()))
            .willReturn(new BillingActivationResponse(
                "CHECKOUT_CREATED",
                "https://checkout.stripe.com/session",
                Instant.parse("2026-08-13T00:00:00Z"),
                12,
                false
            ));

        mockMvc.perform(post("/api/v1/billing/subscription/activate")
                .header("X-CSRF-Token", "csrf-token")
                .header("Idempotency-Key", "activation-123")
                .contentType("application/json")
                .content("""
                    {"product_codes":["basic_hr"],"billing_interval":"MONTH","extra_seats":0}
                    """))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.checkout_url").value("https://checkout.stripe.com/session"))
            .andExpect(jsonPath("$.remaining_trial_days").value(12));

        verify(csrfService).requireCsrf(any(), eq("csrf-token"));
        verify(activationService).createCheckout(eq(7L), eq(1L), eq("activation-123"), any());
    }

    private AuthSessionUser owner() {
        return new AuthSessionUser(1L, 7L, 11L, "Ada Owner", "owner");
    }

    private BillingSubscriptionResponse response() {
        return new BillingSubscriptionResponse("trialing", "all-modules", 7, 5, 0, 5, 1, 4, 19_900,
            19_900, 1_200, "MONTH", "usd", "", "", "", "", true, "", "", "", "", "", "", "stripe", true, "", true,
            List.of("crm"), 1, 1, 0, 4, true);
    }

    private BillingSelectionResponse selection() {
        return new BillingSelectionResponse(
            "COURTESY", "DEMO", "2026.07-premium-v1", "basic_1", "MONTH", "USD",
            5, 0, 1, 4, 6_900L, 1_200L, 6_900L, "2026-08-24T00:00:00Z",
            "AT_TRIAL_END", false, true, true,
            List.of("basic_hr"),
            List.of(new BillingSelectionResponse.Product(1L, "basic_hr", "Recursos Humanos", List.of("human_resources")))
        );
    }
}
