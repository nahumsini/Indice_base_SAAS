package com.indice.erp.processTasks.tasks.support;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.time.LocalDate;
import java.util.Map;
import java.util.Set;
import org.junit.jupiter.api.Test;

class ProcessTaskInputTest {

    private static final Set<String> STATUSES = Set.of("pending", "in_progress", "completed", "cancelled", "paused");
    private static final Set<String> PRIORITIES = Set.of("low", "medium", "high");

    @Test
    void parseTaskCommandAcceptsAssignedUserCompanyId() {
        var command = ProcessTaskInput.parseTaskCommand(
            Map.of(
                "title", "Review site plan",
                "status", "pending",
                "assignedUserCompanyId", 42
            ),
            STATUSES,
            PRIORITIES
        );

        assertEquals(42L, command.assignedUserCompanyId());
        assertEquals("medium", command.priority());
    }

    @Test
    void parseTaskCommandAcceptsAgendaEnrichmentFields() {
        var command = ProcessTaskInput.parseTaskCommand(
            Map.of(
                "title", "Audit onboarding task",
                "status", "in-progress",
                "startDate", "2026-05-11",
                "dueDate", "2026-05-12",
                "notes", "Needs HR confirmation",
                "completion", 72,
                "weighting", 4,
                "audited", true,
                "auditNotes", "Reviewed by operations"
            ),
            STATUSES,
            PRIORITIES
        );

        assertEquals("in_progress", command.status());
        assertEquals(LocalDate.parse("2026-05-11"), command.startDate());
        assertEquals(LocalDate.parse("2026-05-12"), command.dueDate());
        assertEquals("Needs HR confirmation", command.notes());
        assertEquals(72, command.completionPercent());
        assertEquals(4, command.weighting());
        assertEquals(true, command.audited());
        assertEquals("Reviewed by operations", command.auditNotes());
    }

    @Test
    void parseTaskCommandMapsAuditedStatusToCompletedWithAuditFlag() {
        var command = ProcessTaskInput.parseTaskCommand(
            Map.of(
                "title", "Approve final evidence",
                "status", "audited"
            ),
            STATUSES,
            PRIORITIES
        );

        assertEquals("completed", command.status());
        assertEquals(true, command.audited());
    }

    @Test
    void parseTaskCommandRejectsInvalidCompletionPercent() {
        var error = assertThrows(
            IllegalArgumentException.class,
            () -> ProcessTaskInput.parseTaskCommand(
                Map.of(
                    "title", "Review site plan",
                    "status", "pending",
                    "completionPercent", 120
                ),
                STATUSES,
                PRIORITIES
            )
        );

        assertEquals("completionPercent must be between 0 and 100.", error.getMessage());
    }

    @Test
    void parseTaskCommandRejectsLegacyAssignedUserId() {
        var error = assertThrows(
            IllegalArgumentException.class,
            () -> ProcessTaskInput.parseTaskCommand(
                Map.of(
                    "title", "Review site plan",
                    "status", "pending",
                    "assignedUserId", 7
                ),
                STATUSES,
                PRIORITIES
            )
        );

        assertEquals("assignedUserId is no longer supported. Use assignedUserCompanyId.", error.getMessage());
    }
}
