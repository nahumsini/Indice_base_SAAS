package com.indice.erp.ai.access;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.indice.erp.auth.AuthSessionUser;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Optional;
import java.util.Set;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class AiAccessTokenServiceTest {

    private static final Instant NOW = Instant.parse("2026-08-31T12:00:00Z");
    private static final AuthSessionUser OWNER = new AuthSessionUser(3L, 23L, 41L, "Owner", "admin");

    @Mock
    private AiAccessTokenRepository repository;

    private AiAccessTokenService service;

    @BeforeEach
    void setUp() {
        service = new AiAccessTokenService(repository, Clock.fixed(NOW, ZoneOffset.UTC));
    }

    @Test
    void issuesOneTimeHashedTenantBoundToken() {
        when(repository.countActive(3L, 23L, NOW)).thenReturn(0);
        when(repository.insert(any(), anyString(), anyString(), anyString(), anyString(), any(), any()))
            .thenReturn(91L);

        var issued = service.issue(OWNER, "ChatGPT ventas", 7);

        assertEquals(91L, issued.id());
        var expectedScopes = Set.of(
            AiAccessTokenService.SALES_TODAY_READ,
            AiAccessTokenService.BUSINESS_SNAPSHOT_READ,
            AiAccessTokenService.HR_PEOPLE_READ,
            AiAccessTokenService.HR_ATTENDANCE_READ,
            AiAccessTokenService.TASKS_READ,
            AiAccessTokenService.SALES_READ,
            AiAccessTokenService.POS_READ,
            AiAccessTokenService.INVENTORY_READ,
            AiAccessTokenService.EXPENSES_READ,
            AiAccessTokenService.PETTY_CASH_READ,
            AiAccessTokenService.RECEIVABLES_READ,
            AiAccessTokenService.TASKS_CREATE,
            AiAccessTokenService.EXPENSES_CREATE,
            AiAccessTokenService.PETTY_CASH_EXPENSE_CREATE,
            AiAccessTokenService.PETTY_CASH_DEPOSIT_CREATE
        );
        assertEquals(expectedScopes, issued.scopes());
        assertEquals(NOW.plusSeconds(7L * 24 * 60 * 60), issued.expiresAt());
        assertTrue(issued.accessToken().startsWith("idx_ai_"));

        var hash = ArgumentCaptor.forClass(String.class);
        verify(repository).insert(
            eq(OWNER),
            eq("generic_mcp"),
            eq("ChatGPT ventas"),
            eq(issued.tokenPrefix()),
            hash.capture(),
            eq(issued.expiresAt()),
            eq(expectedScopes)
        );
        assertEquals(64, hash.getValue().length());
        assertFalse(hash.getValue().contains(issued.accessToken()));
    }

    @Test
    void rejectsSyntheticOrManagedTenantIdentity() {
        var managedIdentity = new AuthSessionUser(3L, 23L, null, "Support", "superadmin");

        assertThrows(IllegalArgumentException.class, () -> service.issue(managedIdentity, "Unsafe", 30));
        verify(repository, never()).insert(any(), anyString(), anyString(), anyString(), anyString(), any(), any());
    }

    @Test
    void authenticatesOnlyBearerTokenWithRequiredScope() {
        var stored = new AiAccessTokenRepository.StoredToken(
            91L,
            OWNER,
            Set.of(AiAccessTokenService.SALES_TODAY_READ)
        );
        when(repository.findActiveByHash(anyString(), eq(NOW))).thenReturn(Optional.of(stored));

        var result = service.authenticate(
            "Bearer idx_ai_abcdefghijklmnopqrstuvwxyz1234567890",
            AiAccessTokenService.SALES_TODAY_READ
        );

        assertTrue(result.isPresent());
        verify(repository).markUsed(91L, NOW);
        assertTrue(service.authenticate("Basic abc", AiAccessTokenService.SALES_TODAY_READ).isEmpty());
    }

    @Test
    void verifiesAnActiveTokenWithoutCouplingVerificationToOneToolScope() {
        var stored = new AiAccessTokenRepository.StoredToken(
            91L,
            OWNER,
            Set.of(AiAccessTokenService.BUSINESS_SNAPSHOT_READ)
        );
        when(repository.findActiveByHash(anyString(), eq(NOW))).thenReturn(Optional.of(stored));

        assertTrue(service.authenticate("Bearer idx_ai_abcdefghijklmnopqrstuvwxyz1234567890").isPresent());
        verify(repository).markUsed(91L, NOW);
    }
}
