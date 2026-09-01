package com.indice.erp.hr.attendance.kiosk;

import com.indice.erp.hr.attendance.HrAttendanceService;
import com.indice.erp.kiosk.engine.KioskAccessLevel;
import com.indice.erp.kiosk.engine.KioskActionRequest;
import com.indice.erp.kiosk.engine.KioskDefinitionStatus;
import com.indice.erp.kiosk.engine.KioskRegistryService;
import com.indice.erp.kiosk.engine.KioskResolvedDefinition;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.BDDMockito.given;

@ExtendWith(MockitoExtension.class)
class AttendanceEmployeeKioskServiceTest {

    @Mock private HrAttendanceService attendance;
    @Mock private KioskRegistryService registry;

    private AttendanceEmployeeKioskService service;

    @BeforeEach
    void setUp() {
        service = new AttendanceEmployeeKioskService(attendance, registry);
    }

    @Test
    void bootstrapsThroughARecoverableTenantScopedLegacyReferenceWithoutExposingIt() {
        var definition = definition();
        var response = Map.<String, Object>of(
            "authentication", "ENGINE_PIN_SESSION",
            "identity_evidence_required", true);
        given(registry.publicTokenRecoverable(7L, 17L)).willReturn(true);
        given(registry.recoverPublicToken(7L, "HUMAN_RESOURCES", "business_unit", 31L))
            .willReturn("private-attendance-token");
        given(attendance.employeeKioskBootstrap("private-attendance-token", 7L, 501L))
            .willReturn(response);

        assertThat(service.bootstrap(definition, 501L))
            .isSameAs(response)
            .doesNotContainValue("private-attendance-token");
    }

    @Test
    void overwritesClientIdentityAndKeepsFaceAndGpsEvidenceForPunch() {
        var definition = definition();
        var request = KioskActionRequest.of(
            AttendanceKioskCapabilities.PUNCH_CREATE,
            Map.of(
                "event_type", "check_in",
                "latitude", "19.4326000",
                "longitude", "-99.1332000",
                "face_verification_session_id", 44L,
                "identification_token", "attacker-token"));
        var response = Map.<String, Object>of(
            "event_id", 901L,
            "identity_evidence", "face_verified");
        given(registry.publicTokenRecoverable(7L, 17L)).willReturn(true);
        given(registry.recoverPublicToken(7L, "HUMAN_RESOURCES", "business_unit", 31L))
            .willReturn("private-attendance-token");
        given(attendance.employeeKioskIdentificationToken(
            "private-attendance-token", 7L, 501L)).willReturn("server-token");
        given(attendance.publicKioskPunch(
            org.mockito.ArgumentMatchers.eq("private-attendance-token"),
            argThat(payload -> "server-token".equals(payload.get("identification_token"))
                && "19.4326000".equals(payload.get("latitude"))
                && "-99.1332000".equals(payload.get("longitude"))
                && Long.valueOf(44L).equals(payload.get("face_verification_session_id")))))
            .willReturn(response);

        assertThat(service.execute(definition, 501L, request))
            .isSameAs(response)
            .doesNotContainValue("private-attendance-token")
            .doesNotContainValue("server-token");
    }

    @Test
    void rejectsEmployeePunchWhenOnlyClientMetadataClaimsAPhotoWasCaptured() {
        given(registry.publicTokenRecoverable(7L, 17L)).willReturn(true);

        assertThatThrownBy(() -> service.execute(
            definition(), 501L,
            KioskActionRequest.of(
                AttendanceKioskCapabilities.PUNCH_CREATE,
                Map.of(
                    "event_type", "check_in",
                    "latitude", "19.4326000",
                    "longitude", "-99.1332000",
                    "metadata", Map.of(
                        "photo_captured", true,
                        "photo_capture_status", "captured")))))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("verified face session or stored attendance photo");
    }

    @Test
    void rejectsIdentityVerificationBecauseTheParentPinAlreadyIdentifiedTheEmployee() {
        given(registry.publicTokenRecoverable(7L, 17L)).willReturn(true);

        assertThatThrownBy(() -> service.execute(
            definition(), 501L,
            KioskActionRequest.of(
                AttendanceKioskCapabilities.IDENTITY_VERIFY,
                Map.of("pin", "12345"))))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("already provided");

    }

    private KioskResolvedDefinition definition() {
        return new KioskResolvedDefinition(
            17L, 7L, AttendanceKioskCapabilities.OWNER_MODULE, "business_unit", 31L,
            "RH-01", "Acceso principal", KioskDefinitionStatus.ACTIVE,
            2L, 3L, 4L, KioskAccessLevel.CONTROLLED, null, "tokenhint", true, 1, 1);
    }
}
