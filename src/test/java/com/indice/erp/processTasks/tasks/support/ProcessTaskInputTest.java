package com.indice.erp.processTasks.tasks.support;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

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
