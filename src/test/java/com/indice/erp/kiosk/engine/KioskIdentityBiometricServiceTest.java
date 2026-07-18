package com.indice.erp.kiosk.engine;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.indice.erp.face.FaceVerificationClient;
import com.indice.erp.face.FaceIdentityTemplateVault;
import com.indice.erp.face.FaceVerificationProperties;
import com.indice.erp.storage.ObjectStorageProperties;
import com.indice.erp.storage.ObjectStorageService;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.BDDMockito.given;

@ExtendWith(MockitoExtension.class)
class KioskIdentityBiometricServiceTest {

    @Mock
    private JdbcTemplate jdbcTemplate;

    @Mock
    private ObjectStorageService objectStorage;

    @Mock
    private FaceVerificationClient faceClient;

    @Mock
    private FaceIdentityTemplateVault templateVault;

    private FaceVerificationProperties faceProperties;
    private KioskIdentityBiometricService service;

    @BeforeEach
    void setUp() {
        faceProperties = new FaceVerificationProperties();
        var storageProperties = new ObjectStorageProperties();
        storageProperties.getMinio().setBucketBiometric("biometric");
        service = new KioskIdentityBiometricService(
            jdbcTemplate, new ObjectMapper(), objectStorage, storageProperties,
            faceProperties, faceClient, templateVault);
    }

    @Test
    @SuppressWarnings({"rawtypes", "unchecked"})
    void reportsBiometricsUnavailableWithoutInventingAnEnrollment() {
        given(jdbcTemplate.query(anyString(), any(RowMapper.class), any(Object[].class)))
            .willReturn(List.of());

        assertThat(service.status(context()))
            .containsEntry("available", false)
            .containsEntry("enrolled", false)
            .containsEntry("consentVersion", "kiosk-biometric-v1");
    }

    @Test
    void refusesAutoEnrollmentWithoutExplicitConsentAndAuditsTheRejection() {
        enableBiometrics();

        assertThatThrownBy(() -> service.beginEnrollment(context(), Map.of("consent", false)))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessage("Explicit biometric consent is required.");

        assertThat(wasUpdateCalled("BIOMETRIC_CONSENT_REJECTED")).isTrue();
        assertThat(wasUpdateCalled("INSERT INTO kiosk_biometric_enrollments")).isFalse();
    }

    @Test
    void createsIdentityBoundEnrollmentOnlyAfterConsent() {
        enableBiometrics();

        var result = service.beginEnrollment(context(), Map.of("consent", true));

        assertThat(result)
            .containsEntry("status", "PENDING")
            .containsKey("enrollmentId")
            .containsEntry("requiredSteps", List.of("neutral", "left", "right"));
        assertThat(wasUpdateCalled("INSERT INTO kiosk_biometric_enrollments")).isTrue();
        assertThat(wasUpdateCalled("BIOMETRIC_CONSENT_RECORDED")).isTrue();
    }

    @Test
    @SuppressWarnings({"rawtypes", "unchecked"})
    void withdrawingConsentDeletesTheTemplateAndLeavesOnlyAuditEvidence() {
        given(jdbcTemplate.query(anyString(), any(RowMapper.class), any(Object[].class)))
            .willReturn(List.of());

        assertThat(service.withdrawConsent(context()))
            .containsEntry("success", true)
            .containsEntry("enrolled", false);

        assertThat(wasUpdateCalled("template_reference = NULL")).isTrue();
        assertThat(wasUpdateCalled("BIOMETRIC_CONSENT_WITHDRAWN")).isTrue();
    }

    @Test
    @SuppressWarnings({"rawtypes", "unchecked"})
    void removesExpiredRawCapturesAndMaterializesExpiredFlows() {
        given(objectStorage.isEnabled()).willReturn(true);
        given(jdbcTemplate.query(anyString(), any(RowMapper.class)))
            .willReturn(List.of());
        given(jdbcTemplate.update(contains(
            "DELETE FROM kiosk_biometric_captures WHERE expires_at"))).willReturn(3);

        assertThat(service.cleanupExpiredBiometricData()).isEqualTo(3);
        assertThat(wasUpdateCalled("kiosk_biometric_enrollments")).isTrue();
        assertThat(wasUpdateCalled("kiosk_biometric_verifications")).isTrue();
        assertThat(wasUpdateCalled("kiosk_biometric_events")).isTrue();
    }

    private void enableBiometrics() {
        faceProperties.setEnabled(true);
        given(faceClient.isEnabled()).willReturn(true);
        given(objectStorage.isEnabled()).willReturn(true);
    }

    private KioskExecutionContext context() {
        var definition = new KioskResolvedDefinition(
            17L, 7L, "EXPENSES", "accounts_payable", 31L, "PAYABLES", "Payables",
            KioskDefinitionStatus.ACTIVE, 2L, 3L, null, KioskAccessLevel.CONTROLLED,
            null, "tokenhint", true, 1, 1);
        var session = new KioskSessionPrincipal(
            "session-provider", 17L, 7L, "PROVIDER", 91L,
            Set.of("payables.face.enrollment.begin@1"), Instant.now().plusSeconds(600));
        return KioskExecutionContext.publicLink("EXPENSES", "payable-token")
            .resolved(definition, session);
    }

    private boolean wasUpdateCalled(String sqlFragment) {
        return org.mockito.Mockito.mockingDetails(jdbcTemplate).getInvocations().stream()
            .filter(invocation -> "update".equals(invocation.getMethod().getName()))
            .flatMap(invocation -> java.util.Arrays.stream(invocation.getArguments()))
            .map(argument -> String.valueOf((Object) argument))
            .anyMatch(value -> value.contains(sqlFragment));
    }
}
