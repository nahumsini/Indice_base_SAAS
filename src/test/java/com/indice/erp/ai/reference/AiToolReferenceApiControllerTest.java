package com.indice.erp.ai.reference;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.indice.erp.ai.access.AiAccessTokenRepository;
import com.indice.erp.ai.access.AiAccessTokenService;
import com.indice.erp.ai.access.AiToolUsageAuditService;
import com.indice.erp.ai.reference.AiReferenceResolverContracts.PageRequest;
import com.indice.erp.ai.reference.AiReferenceResolverContracts.PaymentAccountReference;
import com.indice.erp.ai.reference.AiReferenceResolverContracts.ReferencePage;
import com.indice.erp.auth.AuthSessionUser;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;

@ExtendWith(MockitoExtension.class)
class AiToolReferenceApiControllerTest {

    private static final String AUTHORIZATION = "Bearer idx_ai_delegated-token-value-1234567890";
    private static final AuthSessionUser USER = new AuthSessionUser(3L, 23L, 41L, "Reader", "admin");
    private static final AiAccessTokenRepository.StoredToken TOKEN = new AiAccessTokenRepository.StoredToken(
        91L, USER, Set.of(AiAccessTokenService.FINANCE_REFERENCES_READ)
    );

    @Mock private AiAccessTokenService tokenService;
    @Mock private AiReferenceResolverService resolverService;
    @Mock private AiToolUsageAuditService auditService;
    @Mock private AiOperationalReferenceService operationalService;

    private AiToolReferenceApiController controller;

    @BeforeEach
    void setUp() {
        controller = new AiToolReferenceApiController(tokenService, resolverService, auditService, operationalService, org.mockito.Mockito.mock(AiTaskAssigneeReferenceService.class));
    }

    @Test
    void rejectsMissingOrInsufficientOAuthScopeBeforeResolution() {
        when(tokenService.authenticate(null, AiAccessTokenService.BUSINESS_CONTEXT_READ))
            .thenReturn(Optional.empty());

        var response = controller.getMyBusinessContext(null);

        assertEquals(HttpStatus.UNAUTHORIZED, response.getStatusCode());
        assertTrue(response.getHeaders().getFirst(HttpHeaders.WWW_AUTHENTICATE).contains("invalid_token"));
        verifyNoInteractions(resolverService, auditService);
    }

    @Test
    void paymentAccountEndpointUsesItsDedicatedReadScopeAndTokenIdentity() {
        var request = new PageRequest("bank", 10, null);
        ReferencePage<PaymentAccountReference> page = new ReferencePage<>(
            Instant.parse("2026-09-12T04:00:00Z"), "BUSINESS_OFFICE", List.of(), 0, 0, false, null
        );
        when(tokenService.authenticate(AUTHORIZATION, AiAccessTokenService.FINANCE_REFERENCES_READ))
            .thenReturn(Optional.of(TOKEN));
        when(resolverService.listPaymentAccounts(USER, request)).thenReturn(page);

        var response = controller.listPaymentAccounts(AUTHORIZATION, request);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(page, response.getBody());
        verify(resolverService).listPaymentAccounts(USER, request);
        verify(auditService).recordRead(TOKEN, "list_payment_accounts", "SUCCESS", 200);
    }

    @Test
    void currentPermissionRevocationReturnsStableForbiddenError() {
        when(tokenService.authenticate(AUTHORIZATION, AiAccessTokenService.FINANCE_REFERENCES_READ))
            .thenReturn(Optional.of(TOKEN));
        when(resolverService.listPaymentAccounts(USER, null))
            .thenThrow(new SecurityException("Current Indice permissions do not allow this reference tool."));

        var response = controller.listPaymentAccounts(AUTHORIZATION, null);

        assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());
        assertTrue(String.valueOf(response.getBody()).contains("ai_tool_permission_required"));
        verify(auditService).recordRead(TOKEN, "list_payment_accounts", "FAILURE", 403);
    }

    @Test
    void operationalEndpointsRequireTheirNewScopesAndNeverUseClientAuthority() {
        var tools = List.of("search_customers", "search_providers", "list_warehouses", "search_budget_lines", "search_accounting_accounts");
        var scopes = List.of(AiAccessTokenService.CUSTOMERS_READ, AiAccessTokenService.PROVIDERS_READ,
            AiAccessTokenService.WAREHOUSES_READ, AiAccessTokenService.BUDGET_LINES_READ, AiAccessTokenService.ACCOUNTING_ACCOUNTS_READ);
        List<java.util.function.Supplier<org.springframework.http.ResponseEntity<?>>> endpoints = List.of(
            () -> controller.customers(AUTHORIZATION, null), () -> controller.providers(AUTHORIZATION, null),
            () -> controller.warehouses(AUTHORIZATION, null), () -> controller.budgetLines(AUTHORIZATION, null),
            () -> controller.accountingAccounts(AUTHORIZATION, null));
        for (int i = 0; i < scopes.size(); i++) {
            when(tokenService.authenticate(AUTHORIZATION, scopes.get(i))).thenReturn(Optional.empty());
            assertEquals(HttpStatus.UNAUTHORIZED, endpoints.get(i).get().getStatusCode());
        }
        verifyNoInteractions(operationalService);
        for (int i = 0; i < scopes.size(); i++) {
            when(tokenService.authenticate(AUTHORIZATION, scopes.get(i))).thenReturn(Optional.of(TOKEN));
            var response = endpoints.get(i).get();
            assertEquals(HttpStatus.OK, response.getStatusCode());
            assertEquals("no-store", response.getHeaders().getCacheControl());
            verify(auditService).recordRead(TOKEN, tools.get(i), "SUCCESS", 200);
        }
        verify(operationalService).customers(USER, null);
        verify(operationalService).providers(USER, null);
        verify(operationalService).warehouses(USER, null);
        verify(operationalService).budgetLines(USER, null);
        verify(operationalService).accountingAccounts(USER, null);
    }

    @Test
    void internalExceptionMessageIsNeverReturnedToTheModel() {
        when(tokenService.authenticate(AUTHORIZATION, AiAccessTokenService.CUSTOMERS_READ)).thenReturn(Optional.of(TOKEN));
        when(operationalService.customers(USER, null)).thenThrow(new IllegalArgumentException("private SQL or secret"));
        var response = controller.customers(AUTHORIZATION, null);
        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        assertTrue(!String.valueOf(response.getBody()).contains("private SQL"));
    }
}
