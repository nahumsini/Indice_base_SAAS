package com.indice.erp.kiosk.engine;

import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.JdbcTemplate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.spy;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class KioskIdentityCredentialServiceTest {

    @Mock private JdbcTemplate jdbcTemplate;
    private KioskIdentityCredentialService service;

    @BeforeEach
    void setUp() {
        service = new KioskIdentityCredentialService(jdbcTemplate);
    }

    @Test
    void employeePinRotationRevokesOnlyThatCompanyMembershipMultiKioskSessions() {
        service.rotatePersonalPin(7L, "EMPLOYEE", 91L, "test-hash");

        var arguments = ArgumentCaptor.forClass(Object[].class);
        verify(jdbcTemplate).update(
            contains("WHERE company_id = ? AND user_company_id = ?"), arguments.capture());
        assertThat(arguments.getValue()).containsExactly(7L, 91L);
    }

    @Test
    void userPinRotationRevokesOnlyThatCompanyUserMultiKioskSessions() {
        service.rotatePersonalPin(7L, "USER", 81L, "test-hash");

        var arguments = ArgumentCaptor.forClass(Object[].class);
        verify(jdbcTemplate).update(
            contains("WHERE company_id = ? AND user_id = ?"), arguments.capture());
        assertThat(arguments.getValue()).containsExactly(7L, 81L);
    }

    @Test
    void activeEmployeePinRevocationAlsoRevokesParentSessions() {
        given(jdbcTemplate.update(
            contains("UPDATE kiosk_identity_credentials"), any(Object[].class)))
            .willReturn(1);

        service.revokeIfUnreferenced(7L, "EMPLOYEE", 91L, false);

        verify(jdbcTemplate).update(
            contains("WHERE company_id = ? AND user_company_id = ?"), any(Object[].class));
    }

    @Test
    void providerCredentialRotationRevokesProviderCenterParentSessions() {
        service.rotatePersonalPin(7L, "PROVIDER", 80L, "test-hash");

        var arguments = ArgumentCaptor.forClass(Object[].class);
        verify(jdbcTemplate).update(
            contains("identity_type = 'PROVIDER' AND identity_id = ?"), arguments.capture());
        assertThat(arguments.getValue()).containsExactly(7L, 80L);
    }

    @Test
    void providerCenterRotationMarksTheCredentialAsExplicitlyIssuedByTheCenter() {
        service.rotateProviderCenterPin(7L, 80L, "test-hash");

        var arguments = ArgumentCaptor.forClass(Object[].class);
        verify(jdbcTemplate).update(
            contains("INSERT INTO kiosk_identity_credentials"), arguments.capture());
        assertThat(arguments.getValue())
            .contains(KioskIdentityCredentialService.PROVIDER_CENTER_ORIGIN);
    }

    @Test
    void providerCenterRevocationDoesNotRevokeLegacyOriginCredentials() {
        given(jdbcTemplate.update(
            contains("credential_origin = ?"), any(Object[].class)))
            .willReturn(0);

        service.revokeProviderCenterPin(7L, 80L);

        verify(jdbcTemplate, never()).update(
            contains("UPDATE kiosk_sessions"), any(Object[].class));
    }

    @Test
    void providerCredentialRemainsActiveWhileAnotherModuleAccessExists() {
        given(jdbcTemplate.queryForObject(
            contains("operational_access"), eq(Integer.class), any(Object[].class)))
            .willReturn(1);

        service.revokeIfUnreferenced(7L, "PROVIDER", 80L, false);

        verify(jdbcTemplate, never()).update(
            contains("UPDATE kiosk_identity_credentials"), any(Object[].class));
    }

    @Test
    void moduleCleanupNeverRevokesAnActiveProviderCenterCredential() {
        var centralService = spy(service);
        doReturn(Optional.of("central-hash"))
            .when(centralService).activeProviderCenterPinHash(7L, 80L);

        centralService.revokeIfUnreferenced(7L, "PROVIDER", 80L, false);

        verify(jdbcTemplate, never()).update(
            contains("UPDATE kiosk_identity_credentials"), any(Object[].class));
    }

    @Test
    void providerCredentialAndSessionsAreRevokedAfterLastModuleAccess() {
        given(jdbcTemplate.queryForObject(
            contains("operational_access"), eq(Integer.class), any(Object[].class)))
            .willReturn(0);
        given(jdbcTemplate.update(
            contains("UPDATE kiosk_identity_credentials"), any(Object[].class)))
            .willReturn(1);

        service.revokeIfUnreferenced(7L, "PROVIDER", 80L, true);

        verify(jdbcTemplate).update(
            contains("identity_type = 'PROVIDER' AND identity_id = ?"), any(Object[].class));
    }
}
