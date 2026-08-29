package com.indice.erp.internaldevelopment;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.indice.erp.internaldevelopment.InternalDevelopmentContracts.Entry;
import com.indice.erp.internaldevelopment.InternalDevelopmentContracts.EntryRequest;
import com.indice.erp.internaldevelopment.InternalDevelopmentContracts.Member;
import com.indice.erp.internaldevelopment.InternalDevelopmentContracts.Participant;
import com.indice.erp.platformadmin.PlatformAuditService;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class InternalDevelopmentServiceTest {

    @Mock private InternalDevelopmentAccessService access;
    @Mock private InternalDevelopmentRepository repository;
    @Mock private PlatformAuditService audit;
    private InternalDevelopmentService service;

    @BeforeEach
    void setUp() {
        service = new InternalDevelopmentService(
            access,
            repository,
            audit,
            new ObjectMapper().findAndRegisterModules(),
            Clock.fixed(Instant.parse("2026-08-28T20:00:00Z"), ZoneOffset.UTC)
        );
    }

    @Test
    void weeklyReportRequiresABoundedPeriod() {
        given(repository.listRootMembers()).willReturn(List.of(new Member(99L, "Root", "root@indice.app")));

        var request = request("WEEKLY_REPORT", null, null);

        assertThrows(IllegalArgumentException.class, () -> service.create(99L, request));
        verify(access).requireRoot(99L);
    }

    @Test
    void creationAlwaysIncludesTheResponsibleRootInParticipantsAndPreservesHistory() {
        given(repository.listRootMembers()).willReturn(List.of(
            new Member(99L, "Root", "root@indice.app"),
            new Member(100L, "Partner", "partner@indice.app")
        ));
        given(repository.insert(anyLong(), any(), anyString())).willReturn(7L);
        given(repository.find(7L)).willReturn(entry());
        given(repository.history(7L)).willReturn(List.of());

        service.create(99L, request("CONTRIBUTION", null, null));

        var captor = ArgumentCaptor.forClass(InternalDevelopmentRepository.ValidatedEntry.class);
        verify(repository).insert(anyLong(), captor.capture(), anyString());
        assertEquals(List.of(100L, 99L), captor.getValue().participantUserIds());
        verify(repository).replaceParticipants(7L, List.of(100L, 99L));
        verify(repository).appendHistory(eq(7L), eq(1), eq("CREATED"), eq(99L), anyString());
    }

    private EntryRequest request(String type, LocalDate periodStart, LocalDate periodEnd) {
        return new EntryRequest(
            type, "DEVELOPMENT", "RECORDED", "Entrega semanal", "Se completó el alcance.",
            null, null, null, Instant.parse("2026-08-28T20:00:00Z"), periodStart, periodEnd,
            null, null, 99L, null, List.of(100L), null
        );
    }

    private Entry entry() {
        var now = Instant.parse("2026-08-28T20:00:00Z");
        return new Entry(
            7L, "RDI-2026-000007", "CONTRIBUTION", "DEVELOPMENT", "RECORDED",
            "Entrega semanal", "Se completó el alcance.", null, null, null, now,
            null, null, null, null, 99L, "Root", "root@indice.app", null, null,
            99L, "Root", 99L, "Root", 1, now, now,
            List.of(new Participant(99L, "Root", "root@indice.app"))
        );
    }
}
