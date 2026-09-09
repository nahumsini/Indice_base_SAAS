package com.indice.erp.billing.collection;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.auth.SessionAuthService;
import com.indice.erp.auth.SessionCsrfService;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

class PaymentCollectionControllersTest {
    private SessionAuthService auth;
    private SessionCsrfService csrf;
    private PaymentCollectionService service;
    private MockMvc mvc;
    private final MockHttpSession session = new MockHttpSession();
    @BeforeEach
    void setup() {
        auth = mock(SessionAuthService.class); csrf = mock(SessionCsrfService.class); service = mock(PaymentCollectionService.class);
        mvc = MockMvcBuilders.standaloneSetup(new PlatformPaymentCollectionController(auth, csrf, service),
                new PaymentCollectionRecoveryController(auth, csrf, service))
            .setControllerAdvice(new PaymentCollectionExceptionHandler()).build();
    }
    @Test
    void unauthenticatedAdminAndRecoveryAreRejectedBeforeServiceAccess() throws Exception {
        mvc.perform(get("/api/v1/platform-admin/companies/7/payment-request").session(session)).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/v1/billing/payment-request").session(session)).andExpect(status().isUnauthorized());
        verifyNoInteractions(service);
    }
    @Test
    void csrfIsRequiredBeforePaymentOrExtensionMutation() throws Exception {
        when(auth.currentUser(session)).thenReturn(Optional.of(new AuthSessionUser(3L, 7L, "Owner", "owner")));
        when(auth.currentActor(session)).thenReturn(Optional.of(new AuthSessionUser(5L, 9L, "Root", "superadmin")));
        doThrow(new IllegalArgumentException("Invalid CSRF token.")).when(csrf).requireCsrf(session, null);
        mvc.perform(post("/api/v1/billing/payment-request/pay").session(session).contentType(MediaType.APPLICATION_JSON)
            .content("{\"expected_request_id\":\"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa\",\"expected_version\":1}"))
            .andExpect(status().isBadRequest());
        mvc.perform(post("/api/v1/platform-admin/companies/7/payment-request/extend").session(session).contentType(MediaType.APPLICATION_JSON)
            .content("{\"reason\":\"Extension\",\"expected_request_id\":\"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa\",\"expected_version\":1}"))
            .andExpect(status().isBadRequest());
        verifyNoInteractions(service);
    }
    @Test
    void paymentUsesAuthenticatedCompanyAndReviewedRequest() throws Exception {
        when(auth.currentUser(session)).thenReturn(Optional.of(new AuthSessionUser(3L, 7L, "Owner", "owner")));
        when(service.pay(eq(7L), eq(3L), eq("request-key"), any())).thenReturn(
            new PaymentCollectionPaymentService.PaymentLink("https://invoice.stripe.com/i/test", null));
        mvc.perform(post("/api/v1/billing/payment-request/pay?company_id=99").session(session)
            .header("X-CSRF-Token", "csrf").header("Idempotency-Key", "request-key").contentType(MediaType.APPLICATION_JSON)
            .content("{\"expected_request_id\":\"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa\",\"expected_version\":2}"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.url").value("https://invoice.stripe.com/i/test"));
        verify(service).pay(7L, 3L, "request-key", new PaymentCollectionContracts.Pay("a".repeat(32), 2));
        verify(csrf).requireCsrf(session, "csrf");
    }
    @Test
    void recoveryExposesOwnershipSeparatelyFromPaymentAvailability() throws Exception {
        when(auth.currentUser(session)).thenReturn(Optional.of(new AuthSessionUser(3L, 7L, "Owner", "owner")));
        when(service.recovery(7L, 3L)).thenReturn(new PaymentCollectionContracts.Recovery(null, false, false, "Owner", "owner@example.test", true));
        mvc.perform(get("/api/v1/billing/payment-request").session(session))
            .andExpect(status().isOk()).andExpect(jsonPath("$.is_owner").value(true))
            .andExpect(jsonPath("$.can_pay").value(false)).andExpect(jsonPath("$.collection_blocked").value(false));
    }
    @Test
    void ownerAndConcurrencyErrorsUseStableStatusAndCodes() throws Exception {
        when(auth.currentUser(session)).thenReturn(Optional.of(new AuthSessionUser(3L, 7L, "Employee", "employee")));
        doThrow(new SecurityException("Owner required")).when(service).refresh(7L, 3L);
        mvc.perform(post("/api/v1/billing/payment-request/refresh").session(session).header("X-CSRF-Token", "csrf"))
            .andExpect(status().isForbidden()).andExpect(jsonPath("$.code").value("PAYMENT_REQUEST_FORBIDDEN"));
        when(auth.currentActor(session)).thenReturn(Optional.of(new AuthSessionUser(5L, 9L, "Root", "superadmin")));
        doThrow(new PaymentCollectionException("REQUEST_CHANGED", "Review the request.")).when(service).extend(eq(7L), eq(5L), any(), any());
        mvc.perform(post("/api/v1/platform-admin/companies/7/payment-request/extend").session(session)
            .header("X-CSRF-Token", "csrf").header("Idempotency-Key", "extend-key").contentType(MediaType.APPLICATION_JSON)
            .content("{\"reason\":\"Extension\",\"expected_request_id\":\"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa\",\"expected_version\":1}"))
            .andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("REQUEST_CHANGED"));
    }
}
