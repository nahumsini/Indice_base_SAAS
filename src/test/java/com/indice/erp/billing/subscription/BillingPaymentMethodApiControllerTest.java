package com.indice.erp.billing.subscription;

import static org.hamcrest.Matchers.containsString;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.auth.ManagedCompanyContextForbiddenException;
import com.indice.erp.auth.ManagedCompanyContextService;
import com.indice.erp.auth.SessionAuthService;
import com.indice.erp.billing.stripe.StripePaymentMethodGateway.Status;
import java.time.Instant;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(BillingPaymentMethodApiController.class)
class BillingPaymentMethodApiControllerTest {
    private static final String PATH = "/api/v1/billing/subscription/payment-method";
    @Autowired private MockMvc mvc;
    @MockBean private SessionAuthService auth;
    @MockBean private ManagedCompanyContextService managedCompanies;
    @MockBean private BillingPaymentMethodService service;

    @BeforeEach
    void currentOwner() {
        given(auth.currentActor(any())).willReturn(Optional.of(new AuthSessionUser(19L, 7L, 12L, "Owner", "owner")));
        given(managedCompanies.resolveBillingContext(any(), any()))
            .willReturn(new ManagedCompanyContextService.BillingContext(7L, "", "DIRECT", false, false));
    }

    @Test
    void missingSessionFailsBeforeAnyBillingReads() throws Exception {
        given(auth.currentActor(any())).willReturn(Optional.empty());
        mvc.perform(get(PATH)).andExpect(status().isUnauthorized())
            .andExpect(header().string("Cache-Control", containsString("no-store")))
            .andExpect(jsonPath("$.code").value("AUTHENTICATION_REQUIRED"));
        verifyNoInteractions(managedCompanies, service);
    }

    @Test
    void publicDemoCannotReadPaymentMetadataEvenWithAnOwnerFixture() throws Exception {
        given(auth.isPublicDemoSession(any())).willReturn(true);
        mvc.perform(get(PATH)).andExpect(status().isForbidden())
            .andExpect(jsonPath("$.code").value("BILLING_OWNER_REQUIRED"));
        verifyNoInteractions(managedCompanies, service);
    }

    @Test
    void authorizedGetNeedsNoCsrfAndIgnoresCallerSuppliedIdentities() throws Exception {
        given(service.current(7, 19)).willReturn(new BillingPaymentMethodResponse(Status.SAVED, "visa", "4242",
            Instant.parse("2026-09-08T12:00:00Z")));
        mvc.perform(get(PATH).queryParam("company_id", "999").queryParam("customer_id", "cus_another"))
            .andExpect(status().isOk()).andExpect(header().string("Cache-Control", containsString("no-store")))
            .andExpect(jsonPath("$.status").value("SAVED"))
            .andExpect(jsonPath("$.brand").value("visa"))
            .andExpect(jsonPath("$.last4").value("4242"))
            .andExpect(jsonPath("$.checked_at").value("2026-09-08T12:00:00Z"))
            .andExpect(jsonPath("$.customer_id").doesNotExist())
            .andExpect(jsonPath("$.expiration").doesNotExist());
        verify(service).current(7, 19);
    }

    @Test
    void administratorWhoIsNotOwnerIsForbidden() throws Exception {
        given(auth.currentActor(any())).willReturn(Optional.of(new AuthSessionUser(19L, 7L, 12L, "Admin", "admin")));
        given(service.current(7, 19)).willThrow(new BillingAccountAuthorityService.BillingOwnerRequiredException("owner required"));
        mvc.perform(get(PATH)).andExpect(status().isForbidden())
            .andExpect(jsonPath("$.code").value("BILLING_OWNER_REQUIRED"));
    }

    @Test
    void rootInDelegatedCompanyCannotReadCustomerCardMetadata() throws Exception {
        given(auth.currentActor(any())).willReturn(Optional.of(new AuthSessionUser(19L, 7L, 12L, "Root", "root")));
        given(managedCompanies.resolveBillingContext(any(), any()))
            .willReturn(new ManagedCompanyContextService.BillingContext(999L, "", "PLATFORM_ROOT", true, true));
        mvc.perform(get(PATH)).andExpect(status().isForbidden());
        verifyNoInteractions(service);
    }

    @Test
    void revokedManagedContextFailsClosedWithSafeCode() throws Exception {
        given(managedCompanies.resolveBillingContext(any(), any()))
            .willThrow(new ManagedCompanyContextForbiddenException("private context detail"));
        mvc.perform(get(PATH)).andExpect(status().isForbidden())
            .andExpect(jsonPath("$.code").value("BILLING_OWNER_REQUIRED"))
            .andExpect(jsonPath("$.message").doesNotExist());
        verifyNoInteractions(service);
    }

    @Test
    void unavailableCheckRemainsDistinctFromAbsentCard() throws Exception {
        given(service.current(7, 19)).willReturn(new BillingPaymentMethodResponse(Status.UNAVAILABLE, null, null, null));
        mvc.perform(get(PATH)).andExpect(status().isOk())
            .andExpect(jsonPath("$.status").value("UNAVAILABLE"))
            .andExpect(jsonPath("$.last4").isEmpty())
            .andExpect(jsonPath("$.checked_at").isEmpty());
    }

    @Test
    void noWriteOperationIsExposed() throws Exception {
        mvc.perform(post(PATH)).andExpect(status().isMethodNotAllowed());
        verifyNoInteractions(service);
    }
}
