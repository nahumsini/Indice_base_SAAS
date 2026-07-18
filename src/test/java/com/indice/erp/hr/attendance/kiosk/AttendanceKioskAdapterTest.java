package com.indice.erp.hr.attendance.kiosk;

import com.indice.erp.hr.attendance.HrAttendanceService;
import com.indice.erp.kiosk.engine.KioskAccessLevel;
import com.indice.erp.kiosk.engine.KioskActionRequest;
import com.indice.erp.kiosk.engine.KioskDefinitionStatus;
import com.indice.erp.kiosk.engine.KioskExecutionContext;
import com.indice.erp.kiosk.engine.KioskResolvedDefinition;
import com.indice.erp.kiosk.engine.KioskSessionPrincipal;
import com.indice.erp.kiosk.engine.KioskSessionService;
import java.time.Instant;
import java.util.Map;
import java.util.Set;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;

@ExtendWith(MockitoExtension.class)
class AttendanceKioskAdapterTest {

    @Mock private HrAttendanceService attendance;
    @Mock private AttendanceKioskEngineIdentityService identities;
    @Mock private AttendanceKioskModuleAuditService moduleAudit;
    @Mock private KioskSessionService sessions;

    private AttendanceKioskAdapter adapter;

    @BeforeEach
    void setUp() {
        adapter = new AttendanceKioskAdapter(attendance, identities, moduleAudit, sessions);
    }

    @Test
    void publishesControlledSensitiveRhCapabilities() {
        assertThat(adapter.ownerModule()).isEqualTo("HUMAN_RESOURCES");
        assertThat(adapter.capabilities())
            .hasSize(6)
            .allSatisfy(capability -> {
                assertThat(capability.version()).isEqualTo(1);
                assertThat(capability.accessLevel()).isEqualTo(KioskAccessLevel.CONTROLLED);
                assertThat(capability.sensitive()).isTrue();
            });
    }

    @Test
    void mirrorsThePersonalPinAfterRhValidatesIdentity() {
        var response = Map.<String, Object>of(
            "user", Map.of("id", 81L),
            "identification_token", "signed-token",
            "expires_at", Instant.now().plusSeconds(120).toString());
        var request = KioskActionRequest.of(
            AttendanceKioskCapabilities.IDENTITY_VERIFY,
            Map.of("credential_payload", "12345"));
        given(attendance.publicKioskIdentify("attendance-token", request.payload())).willReturn(response);

        assertThat(adapter.execute(publicContext(), request)).isSameAs(response);

        then(identities).should().synchronizePersonalPin(7L, 81L);
    }

    @Test
    void delegatesPunchAndWritesTheRhModuleAudit() {
        var context = employeeContext();
        var request = KioskActionRequest.of(
            AttendanceKioskCapabilities.PUNCH_CREATE,
            Map.of("identification_token", "signed-token", "event_type", "check_in"));
        var response = Map.<String, Object>of(
            "event_id", 901L,
            "event_kind", "check_in",
            "identity_evidence", "face_verified");
        given(attendance.publicKioskPunch("attendance-token", request.payload())).willReturn(response);

        assertThat(adapter.execute(context, request)).isSameAs(response);
        then(moduleAudit).should().success(
            context, "ATTENDANCE_PUNCH_RECORDED", "ATTENDANCE_EVENT", 901L,
            Map.of("event_kind", "check_in", "identity_evidence", "face_verified"));
    }

    @Test
    void successfulSpecializedFaceVerificationElevatesTheCanonicalSession() {
        var context = employeeContext();
        var request = KioskActionRequest.forResource(
            AttendanceKioskCapabilities.FACE_VERIFICATION_COMPLETE,
            44L,
            Map.of("identification_token", "signed-token"));
        given(attendance.completePublicKioskFaceVerificationSession(
            "attendance-token", 44L, request.payload()))
            .willReturn(Map.of("matched", true, "liveness_passed", true));

        adapter.execute(context, request);

        then(sessions).should().recordVerifiedFactor(context.session(), "FACE");
        then(moduleAudit).should().success(
            context, "ATTENDANCE_FACE_VERIFIED", "FACE_VERIFICATION_SESSION", 44L,
            Map.of("liveness_passed", true));
    }

    @Test
    void rejectsAttendanceActionsWithoutAnEmployeeSession() {
        var request = KioskActionRequest.of(
            AttendanceKioskCapabilities.PUNCH_CREATE, Map.of("event_type", "check_in"));

        assertThatThrownBy(() -> adapter.authorize(publicContext(), request).requireAllowed())
            .isInstanceOf(SecurityException.class)
            .hasMessageContaining("authentication is required");
    }

    private KioskExecutionContext publicContext() {
        return KioskExecutionContext.publicLink(
            AttendanceKioskCapabilities.OWNER_MODULE, "attendance-token").resolved(definition(), null);
    }

    private KioskExecutionContext employeeContext() {
        var session = new KioskSessionPrincipal(
            "session-hr", 17L, 7L, "EMPLOYEE", 81L,
            AttendanceKioskCapabilities.descriptors().stream()
                .map(capability -> capability.versionedKey()).collect(java.util.stream.Collectors.toSet()),
            Instant.now().plusSeconds(600));
        return KioskExecutionContext.publicLink(
            AttendanceKioskCapabilities.OWNER_MODULE, "attendance-token").resolved(definition(), session);
    }

    private KioskResolvedDefinition definition() {
        return new KioskResolvedDefinition(
            17L, 7L, AttendanceKioskCapabilities.OWNER_MODULE, "business_unit", 31L,
            "RH-01", "Acceso principal", KioskDefinitionStatus.ACTIVE,
            2L, 3L, 4L, KioskAccessLevel.CONTROLLED, null, "tokenhint", true, 1, 1);
    }
}
