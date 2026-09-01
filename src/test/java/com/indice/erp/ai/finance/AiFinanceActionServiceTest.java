package com.indice.erp.ai.finance;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.indice.erp.ai.access.AiAccessTokenRepository;
import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.finance.FinanceAccessService;
import com.indice.erp.finance.shared.FinanceContext;
import com.indice.erp.finance.shared.FinanceScope;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Map;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class AiFinanceActionServiceTest {

    private static final Instant NOW = Instant.parse("2026-08-31T18:00:00Z");
    private static final AuthSessionUser USER = new AuthSessionUser(3L, 23L, 41L, "Owner", "admin");
    private static final AiAccessTokenRepository.StoredToken TOKEN =
        new AiAccessTokenRepository.StoredToken(91L, USER, SetSupport.all());

    @Mock private AiFinanceActionRepository repository;
    @Mock private AiFinanceActionExecutionService executionService;
    @Mock private FinanceAccessService financeAccessService;

    private AiFinanceActionService service;

    @BeforeEach
    void setUp() {
        service = new AiFinanceActionService(
            repository,
            executionService,
            financeAccessService,
            new ObjectMapper().findAndRegisterModules(),
            Clock.fixed(NOW, ZoneOffset.UTC)
        );
    }

    @Test
    void previewsOnlyANonSettledExpenseDraftWithExactAmounts() {
        when(financeAccessService.resolveContext(USER)).thenReturn(Optional.of(new FinanceContext(
            3L, 23L, "Owner", "admin", true, FinanceScope.corporateOffice()
        )));
        when(repository.insertConfirmation(any(), anyString(), anyString(), anyString(), any(), any()))
            .thenReturn(501L);
        @SuppressWarnings("unchecked")
        var normalized = (ArgumentCaptor<Map<String, Object>>) (ArgumentCaptor<?>) ArgumentCaptor.forClass(Map.class);

        var response = service.preview(TOKEN, AiFinanceActionService.CREATE_EXPENSE_DRAFT, Map.of(
            "concept", "Internet oficina",
            "totalAmount", new BigDecimal("116.00"),
            "taxAmount", new BigDecimal("16.00"),
            "currencyCode", "mxn",
            "expenseDate", "2026-08-31"
        ));

        assertTrue(response.requiresConfirmation());
        assertTrue(response.confirmationToken().startsWith("idx_confirm_"));
        assertEquals("DRAFT_ONLY", response.preview().get("mode"));
        assertEquals(new BigDecimal("100.00"), response.preview().get("subtotalAmount"));
        assertEquals("MXN", response.preview().get("currencyCode"));
        verify(repository).insertConfirmation(
            eq(TOKEN), eq(AiFinanceActionService.CREATE_EXPENSE_DRAFT), anyString(), anyString(),
            normalized.capture(), eq(NOW.plusSeconds(300))
        );
        assertEquals("DRAFT_ONLY", normalized.getValue().get("mode"));
    }

    @Test
    void replaysCompletedActionWithoutExecutingAgain() {
        var confirmation = new AiFinanceActionRepository.Confirmation(
            501L, 91L, 23L, 3L, 41L, AiFinanceActionService.CREATE_EXPENSE_DRAFT,
            "fingerprint", Map.of("concept", "Internet"), NOW.plusSeconds(300), null
        );
        when(repository.findConfirmation(anyString())).thenReturn(Optional.of(confirmation));
        when(repository.findExecution(eq(23L), eq(3L), eq(AiFinanceActionService.CREATE_EXPENSE_DRAFT), anyString()))
            .thenReturn(Optional.of(new AiFinanceActionRepository.Execution(
                601L, 501L, "fingerprint", "550e8400-e29b-41d4-a716-446655440000",
                "COMPLETED", Map.of("id", 71, "status", "DRAFT")
            )));

        var response = service.commit(TOKEN, AiFinanceActionService.CREATE_EXPENSE_DRAFT,
            new AiFinanceActionContracts.CommitRequest(
                "idx_confirm_abcdefghijklmnopqrstuvwxyz1234567890FINANCE",
                "550e8400-e29b-41d4-a716-446655440000"
            ));

        assertTrue(response.replayed());
        assertEquals(71, response.result().get("id"));
        verify(repository).insertAudit(any(), eq(AiFinanceActionService.CREATE_EXPENSE_DRAFT), eq(501L),
            eq("COMMIT"), eq("REPLAY"), anyString(), anyString(), any(), any(), eq(null), eq(null));
    }

    private static final class SetSupport {
        private SetSupport() { }
        static java.util.Set<String> all() { return java.util.Set.of("expenses.create"); }
    }
}
