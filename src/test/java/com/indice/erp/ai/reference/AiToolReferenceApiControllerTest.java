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

    private AiToolReferenceApiController controller;

    @BeforeEach
    void setUp() {
        controller = new AiToolReferenceApiController(tokenService, resolverService, auditService);
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
}
