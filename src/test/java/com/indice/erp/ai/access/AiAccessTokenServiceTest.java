package com.indice.erp.ai.access;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
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
    void issuesOneTimeHashedTenantBoundReadOnlyTokenByDefault() {
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
            AiAccessTokenService.RECEIVABLES_READ
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
        assertTrue(service.supportedScopes().contains(AiAccessTokenService.TASKS_CREATE));
        assertFalse(issued.scopes().contains(AiAccessTokenService.TASKS_CREATE));
    }

    @Test
    void rejectsSyntheticOrManagedTenantIdentity() {
        var managedIdentity = new AuthSessionUser(3L, 23L, null, "Support", "superadmin");

        assertThrows(IllegalArgumentException.class, () -> service.issue(managedIdentity, "Unsafe", 30));
        verify(repository, never()).insert(any(), anyString(), anyString(), anyString(), anyString(), any(), any());
    }

    @Test
    void issuesOnlyTheExplicitPermissionsSelectedByTheOwner() {
        when(repository.countActive(3L, 23L, NOW)).thenReturn(0);
        when(repository.insert(any(), anyString(), anyString(), anyString(), anyString(), any(), any()))
            .thenReturn(92L);
        var selectedScopes = Set.of(
            AiAccessTokenService.INVENTORY_READ,
            AiAccessTokenService.EXPENSES_READ
        );

        var issued = service.issue(OWNER, "Lectura segura", 30, selectedScopes);

        assertEquals(selectedScopes, issued.scopes());
        verify(repository).insert(
            eq(OWNER), eq("generic_mcp"), eq("Lectura segura"), eq(issued.tokenPrefix()),
            anyString(), eq(issued.expiresAt()), eq(selectedScopes)
        );
    }

    @Test
    void rejectsEmptyOrUnknownPermissionSelections() {
        assertThrows(IllegalArgumentException.class, () -> service.issue(OWNER, "Sin permisos", 30, Set.of()));
        assertThrows(IllegalArgumentException.class, () -> service.issue(OWNER, "Permiso falso", 30, Set.of("database.admin")));
        assertThrows(IllegalArgumentException.class, () -> service.issue(OWNER, "Identidad fuera de OAuth", 30, Set.of("email")));
        verify(repository, never()).insert(any(), anyString(), anyString(), anyString(), anyString(), any(), any());
    }

    @Test
    void issuesIdentityScopesOnlyThroughOAuth() {
        when(repository.countActive(3L, 23L, NOW)).thenReturn(0);
        when(repository.insert(any(), anyString(), anyString(), anyString(), anyString(), any(), any()))
            .thenReturn(93L);
        var scopes = Set.of(
            AiAccessTokenService.OPENID,
            AiAccessTokenService.EMAIL,
            AiAccessTokenService.SALES_READ
        );

        var issued = service.issueOAuth(OWNER, "ChatGPT", 30, scopes);

        assertEquals(scopes, issued.scopes());
        assertTrue(service.supportedOAuthScopes().containsAll(scopes));
        assertFalse(service.supportedScopes().contains(AiAccessTokenService.EMAIL));
    }

    @Test
    void rejectsIncompleteOAuthIdentityPermissions() {
        assertThrows(IllegalArgumentException.class, () -> service.issueOAuth(
            OWNER, "Identidad incompleta", 30, Set.of(AiAccessTokenService.EMAIL)
        ));
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

    @Test
    void readOnlyAuthenticationDoesNotChangeConnectionActivity() {
        var stored = new AiAccessTokenRepository.StoredToken(
            91L,
            OWNER,
            Set.of(AiAccessTokenService.OPENID, AiAccessTokenService.EMAIL)
        );
        when(repository.findActiveByHash(anyString(), eq(NOW))).thenReturn(Optional.of(stored));

        assertTrue(service.authenticateReadOnly("Bearer idx_ai_abcdefghijklmnopqrstuvwxyz1234567890").isPresent());
        verify(repository, never()).markUsed(anyLong(), any());
    }

    @Test
    void rotatesAnExistingConnectionWithoutCreatingAnotherActiveSlot() {
        var scopes = Set.of(AiAccessTokenService.SALES_READ);
        when(repository.rotate(eq(91L), eq(OWNER), anyString(), anyString(), any(), eq(scopes)))
            .thenReturn(1);

        var rotated = service.rotate(OWNER, 91L, 30, scopes);

        assertEquals(91L, rotated.id());
        assertEquals(scopes, rotated.scopes());
        assertTrue(rotated.accessToken().startsWith("idx_ai_"));
        verify(repository, never()).countActive(anyLong(), anyLong(), any());
        verify(repository, never()).insert(any(), anyString(), anyString(), anyString(), anyString(), any(), any());
    }
}
