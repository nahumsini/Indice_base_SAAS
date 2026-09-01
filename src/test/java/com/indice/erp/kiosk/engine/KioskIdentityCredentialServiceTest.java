package com.indice.erp.kiosk.engine;

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
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.never;
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
    void nonMemberCredentialRotationDoesNotTouchMultiKioskSessions() {
        service.rotatePersonalPin(7L, "PROVIDER", 80L, "test-hash");

        verify(jdbcTemplate, never()).update(
            contains("UPDATE multi_kiosk_sessions"), any(Object[].class));
    }
}
