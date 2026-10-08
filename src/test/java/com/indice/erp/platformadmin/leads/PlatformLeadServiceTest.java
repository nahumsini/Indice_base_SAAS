package com.indice.erp.platformadmin.leads;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.indice.erp.platformadmin.PlatformAdminAccessService;
import com.indice.erp.platformadmin.leads.PlatformLeadContracts.Submission;
import com.indice.erp.platformadmin.leads.PlatformLeadContracts.Summary;
import com.indice.erp.platformadmin.leads.PlatformLeadContracts.Update;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.HexFormat;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.junit.jupiter.api.Test;

class PlatformLeadServiceTest {
    private static final String SECRET = "test-only-lead-ingest-secret-at-least-32-characters";
    private static final String ID = "b2c0ae6e-4736-4fdb-9357-a8def16b4617";
    private static final Instant NOW = Instant.parse("2026-10-04T12:00:00Z");
    private final PlatformLeadRepository repository = mock(PlatformLeadRepository.class);
    private final PlatformAdminAccessService access = mock(PlatformAdminAccessService.class);
    private final ObjectMapper mapper = new ObjectMapper();
    private final PlatformLeadService service = new PlatformLeadService(
        repository, access, mapper, Clock.fixed(NOW, ZoneOffset.UTC), SECRET);

    @Test
    void signedSubmissionCreatesOnePlatformLead() throws Exception {
        var body = body(true);
        when(repository.findIdBySubmission(ID)).thenReturn(null);
        when(repository.insert(eq(ID), any(), any(), eq(NOW))).thenReturn(42L);

        assertEquals(42L, service.ingest(ID, String.valueOf(NOW.getEpochSecond()), signature(body), body));

        verify(repository).event(42L, null, "SUBMITTED", null, "NEW", null);
    }

    @Test
    void invalidSignatureNeverReachesPersistence() throws Exception {
        var body = body(true);
        assertThrows(SecurityException.class,
            () -> service.ingest(ID, String.valueOf(NOW.getEpochSecond()), "bad", body));
        org.mockito.Mockito.verifyNoInteractions(repository);
    }

    @Test
    void contactPermissionIsRequiredEvenForSignedSubmissions() throws Exception {
        var body = body(false);
        assertThrows(IllegalArgumentException.class,
            () -> service.ingest(ID, String.valueOf(NOW.getEpochSecond()), signature(body), body));
        org.mockito.Mockito.verifyNoInteractions(repository);
    }

    @Test
    void unknownPlanInterestIsRejectedBeforePersistence() throws Exception {
        var body = new String(body(true), StandardCharsets.UTF_8)
            .replace("CONTROLA", "UNKNOWN").getBytes(StandardCharsets.UTF_8);
        assertThrows(IllegalArgumentException.class,
            () -> service.ingest(ID, String.valueOf(NOW.getEpochSecond()), signature(body), body));
        org.mockito.Mockito.verifyNoInteractions(repository);
    }

    @Test
    void trialCannotStartBeforeDiagnosis() {
        when(repository.find(42L)).thenReturn(summary("NEW", null));
        assertThrows(IllegalArgumentException.class, () -> service.update(7L, 42L,
            new Update("TRIAL_ACTIVE", null, null, false, "", 0)));
        verify(access).require(7L, "MANAGE_LEADS");
    }

    @Test
    void completedDiagnosisAllowsFifteenDayTrial() {
        var current = summary("DIAGNOSIS_COMPLETED", NOW.minusSeconds(3600));
        var updated = new Summary(current.id(), current.fullName(), current.companyName(), current.email(),
            current.phone(), current.country(), current.challenge(), current.landingPath(), current.sourceChannel(),
            current.utmSource(), current.utmMedium(), current.utmCampaign(), current.planInterest(),
            "TRIAL_ACTIVE", null, null,
            NOW.plusSeconds(3 * 86400L), current.diagnosisCompletedAt(), NOW,
            NOW.plusSeconds(15 * 86400L), current.createdAt(), NOW, 1);
        when(repository.find(42L)).thenReturn(current, updated);
        when(repository.update(eq(42L), eq(0), eq("TRIAL_ACTIVE"), any(), any(), any(), any(), any()))
            .thenReturn(true);
        when(repository.events(42L)).thenReturn(java.util.List.of());

        var result = service.update(7L, 42L, new Update("TRIAL_ACTIVE", null, null, false, "Trial agreed", 0));

        assertEquals("TRIAL_ACTIVE", result.lead().status());
        verify(repository).update(42L, 0, "TRIAL_ACTIVE", null, NOW.plusSeconds(3 * 86400L),
            current.diagnosisCompletedAt(), NOW, NOW.plusSeconds(15 * 86400L));
    }

    @Test
    void selfServiceActivationCannotOverwriteAClosedCommercialLead() {
        for (var status : java.util.List.of("WON", "LOST")) {
            when(repository.find(42L)).thenReturn(summary(status, null));
            assertThrows(IllegalStateException.class, () -> service.recordSelfServiceTrial(
                42L, "ana@example.com", NOW, NOW.plusSeconds(15 * 86400L)));
        }
        org.mockito.Mockito.verify(repository, org.mockito.Mockito.never())
            .update(any(Long.class), any(Integer.class), any(), any(), any(), any(), any(), any());
    }

    private byte[] body(boolean consent) throws Exception {
        return mapper.writeValueAsBytes(new Submission("Ana", "Empresa Uno", "ana@example.com", "", "México",
            "Seguimiento de tareas", "/diagnostico.php", "WEBSITE", "", "", "", "CONTROLA", consent));
    }

    private String signature(byte[] body) throws Exception {
        var mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(SECRET.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
        mac.update((NOW.getEpochSecond() + "\n" + ID + "\n").getBytes(StandardCharsets.UTF_8));
        return HexFormat.of().formatHex(mac.doFinal(body));
    }

    private Summary summary(String status, Instant diagnosisAt) {
        return new Summary(42L, "Ana", "Empresa Uno", "ana@example.com", null, "México",
            "Seguimiento de tareas", "/diagnostico.php", "WEBSITE", null, null, null,
            "CONTROLA", status, null, null, null, diagnosisAt, null, null, NOW, NOW, 0);
    }
}
