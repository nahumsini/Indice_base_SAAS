package com.indice.erp.auth.passwordreset;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

@ExtendWith(MockitoExtension.class)
class PasswordResetServiceTest {

    private static final Instant NOW = Instant.parse("2026-05-20T15:00:00Z");

    @Mock
    private PasswordResetRepository repository;

    @Mock
    private PasswordResetEmailService emailService;

    @Mock
    private BCryptPasswordEncoder passwordEncoder;

    private PasswordResetService service;

    @BeforeEach
    void setUp() {
        service = new PasswordResetService(
            repository,
            emailService,
            passwordEncoder,
            Clock.fixed(NOW, ZoneOffset.UTC)
        );
    }

    @Test
    void requestResetReturnsGenericResponseForUnknownEmailWithoutSendingEmail() {
        when(repository.countRequestsByEmailHashSince(anyString(), any())).thenReturn(0);
        when(repository.countRequestsByIpHashSince(anyString(), any())).thenReturn(0);
        when(repository.findUserByEmail("missing@example.com")).thenReturn(Optional.empty());

        var result = service.requestReset(
            "Missing@Example.com",
            "https://app.indice.test",
            "203.0.113.10",
            "JUnit"
        );

        assertEquals(PasswordResetService.GENERIC_RESET_REQUEST_MESSAGE, result.message());
        verify(repository).recordRequest(anyString(), anyString(), anyString(), eq(true), eq(false), eq("email_not_found"));
        verify(emailService, never()).sendPasswordReset(anyString(), anyString(), anyString());
    }

    @Test
    void requestResetBlocksAfterFiveEmailRequestsInWindow() {
        when(repository.countRequestsByEmailHashSince(anyString(), any())).thenReturn(5);

        var result = service.requestReset(
            "ada@example.com",
            "https://app.indice.test",
            "203.0.113.10",
            "JUnit"
        );

        assertEquals(PasswordResetService.GENERIC_RESET_REQUEST_MESSAGE, result.message());
        verify(repository).recordRequest(anyString(), anyString(), anyString(), eq(false), eq(false), eq("email_rate_limited"));
        verify(repository, never()).findUserByEmail(anyString());
        verify(emailService, never()).sendPasswordReset(anyString(), anyString(), anyString());
    }

    @Test
    void requestResetCreatesSingleUseTokenAndSendsResetLinkForExistingUser() {
        var user = new PasswordResetUser(7L, "ada@example.com", "Ada Demo");
        when(repository.countRequestsByEmailHashSince(anyString(), any())).thenReturn(0);
        when(repository.countRequestsByIpHashSince(anyString(), any())).thenReturn(0);
        when(repository.findUserByEmail("ada@example.com")).thenReturn(Optional.of(user));
        when(emailService.sendPasswordReset(eq("ada@example.com"), eq("Ada Demo"), anyString()))
            .thenReturn(EmailDeliveryResult.sentSuccessfully());

        var result = service.requestReset(
            "ada@example.com",
            "https://app.indice.test/",
            "203.0.113.10",
            "JUnit"
        );

        var linkCaptor = ArgumentCaptor.forClass(String.class);
        verify(repository).invalidateActiveTokensForUser(eq(7L), eq(NOW));
        verify(repository).insertToken(eq(7L), anyString(), eq(NOW.plusSeconds(600)), anyString(), anyString());
        verify(emailService).sendPasswordReset(eq("ada@example.com"), eq("Ada Demo"), linkCaptor.capture());
        verify(repository).recordRequest(anyString(), anyString(), anyString(), eq(true), eq(true), eq(null));
        assertEquals(PasswordResetService.GENERIC_RESET_REQUEST_MESSAGE, result.message());
        org.junit.jupiter.api.Assertions.assertTrue(linkCaptor.getValue().startsWith("https://app.indice.test/reset-password/"));
    }

    @Test
    void completeResetRejectsExpiredToken() {
        when(repository.findTokenByHashForUpdate(anyString()))
            .thenReturn(Optional.of(new PasswordResetTokenRecord(
                11L,
                7L,
                "active",
                NOW.minusSeconds(1),
                null,
                null
            )));

        var error = assertThrows(
            IllegalArgumentException.class,
            () -> service.completeReset("raw-token", "newSecret123", "newSecret123")
        );

        assertEquals(PasswordResetService.INVALID_RESET_LINK_MESSAGE, error.getMessage());
        verify(repository, never()).updateUserPassword(eq(7L), anyString());
    }

    @Test
    void completeResetRejectsUsedToken() {
        when(repository.findTokenByHashForUpdate(anyString()))
            .thenReturn(Optional.of(new PasswordResetTokenRecord(
                11L,
                7L,
                "used",
                NOW.plusSeconds(600),
                NOW.minusSeconds(60),
                null
            )));

        var error = assertThrows(
            IllegalArgumentException.class,
            () -> service.completeReset("raw-token", "newSecret123", "newSecret123")
        );

        assertEquals(PasswordResetService.INVALID_RESET_LINK_MESSAGE, error.getMessage());
        verify(repository, never()).updateUserPassword(eq(7L), anyString());
    }

    @Test
    void completeResetUpdatesPasswordAndConsumesToken() {
        when(repository.findTokenByHashForUpdate(anyString()))
            .thenReturn(Optional.of(new PasswordResetTokenRecord(
                11L,
                7L,
                "active",
                NOW.plusSeconds(600),
                null,
                null
            )));
        when(passwordEncoder.encode("newSecret123")).thenReturn("encoded-password");
        when(repository.updateUserPassword(7L, "encoded-password")).thenReturn(1);

        service.completeReset("raw-token", "newSecret123", "newSecret123");

        verify(repository).updateUserPassword(7L, "encoded-password");
        verify(repository).markTokenUsed(11L, NOW);
        verify(repository).invalidateOtherActiveTokens(7L, 11L, NOW);
    }

    @Test
    void completeResetRejectsPasswordMismatchBeforeTokenLookup() {
        var error = assertThrows(
            IllegalArgumentException.class,
            () -> service.completeReset("raw-token", "newSecret123", "differentSecret")
        );

        assertEquals("Password and confirmation must match.", error.getMessage());
        verify(repository, never()).findTokenByHashForUpdate(anyString());
    }
}
