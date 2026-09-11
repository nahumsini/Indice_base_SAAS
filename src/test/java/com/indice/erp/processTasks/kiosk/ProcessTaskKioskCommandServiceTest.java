package com.indice.erp.processTasks.kiosk;

import com.indice.erp.processTasks.tasks.ProcessTaskAssignmentScopeService;
import com.indice.erp.processTasks.tasks.ProcessTaskAssignmentScopeService.AssignmentScope;
import com.indice.erp.processTasks.tasks.ProcessTaskAssignmentScopeService.ScopeLevel;
import com.indice.erp.processTasks.tasks.ProcessTasksService;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.ArgumentCaptor;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;
import static org.mockito.Mockito.never;

@ExtendWith(MockitoExtension.class)
class ProcessTaskKioskCommandServiceTest {

    @Mock
    private ProcessTasksService processTasksService;
    @Mock
    private ProcessTaskAssignmentScopeService assignmentScopeService;
    @Mock
    private ProcessTaskKioskIdentityService identities;
    @Mock
    private ProcessTaskKioskQueryService queries;
    @Mock
    private ProcessTaskKioskModuleAuditService audit;

    private ProcessTaskKioskCommandService service;
    private ProcessTaskPublicKioskContext context;

    @BeforeEach
    void setUp() {
        service = new ProcessTaskKioskCommandService(
            processTasksService, assignmentScopeService, identities, queries, audit);
        context = context();
    }

    @Test
    void collaboratorCompletionMarksOnlyTheContributionReady() {
        var before = Map.<String, Object>of("id", 41L, "status", "in_progress");
        var visible = Map.<String, Object>of(
            "id", 41L,
            "status", "in_progress",
            "current_assignment_role", "collaborator",
            "current_contribution_status", "ready",
            "completion_action", "CONTRIBUTION_READY",
            "can_complete", false);
        given(queries.completableTask(context.kiosk(), context.employee(), 41L)).willReturn(before);
        given(processTasksService.getTask(7L, 41L)).willReturn(teamTask("collaborator", "working"));
        given(queries.visibleTask(context.kiosk(), context.employee(), 41L)).willReturn(visible);
        given(queries.listTasks(context.kiosk(), context.employee())).willReturn(List.of(visible));

        var result = service.complete(context, 41L, Map.of("completion_notes", "My part is done"));

        assertThat(result)
            .containsEntry("action_outcome", "CONTRIBUTION_READY")
            .containsEntry("current_contribution_status", "ready")
            .containsEntry("task", visible)
            .containsEntry("items", List.of(visible));
        then(processTasksService).should().updateCurrentUserContribution(
            7L, 9L, 41L, Map.of("status", "ready", "note", "My part is done"));
        then(processTasksService).should(never()).completeTask(
            org.mockito.ArgumentMatchers.anyLong(),
            org.mockito.ArgumentMatchers.anyLong(),
            org.mockito.ArgumentMatchers.anyLong(),
            anyMap());
        then(audit).should().record(
            context, 41L, "TASK_CONTRIBUTION_READY", Map.of("has_completion_notes", true));
    }

    @Test
    void collaboratorCannotSubmitAnAlreadyReadyContributionAgain() {
        given(queries.completableTask(context.kiosk(), context.employee(), 41L))
            .willReturn(Map.of("id", 41L, "status", "in_progress"));
        given(processTasksService.getTask(7L, 41L)).willReturn(teamTask("collaborator", "ready"));

        assertThatThrownBy(() -> service.complete(context, 41L, Map.of()))
            .isInstanceOf(IllegalStateException.class)
            .hasMessageContaining("already ready");

        then(processTasksService).should(never()).updateCurrentUserContribution(
            org.mockito.ArgumentMatchers.anyLong(),
            org.mockito.ArgumentMatchers.anyLong(),
            org.mockito.ArgumentMatchers.anyLong(),
            anyMap());
        then(processTasksService).should(never()).completeTask(
            org.mockito.ArgumentMatchers.anyLong(),
            org.mockito.ArgumentMatchers.anyLong(),
            org.mockito.ArgumentMatchers.anyLong(),
            anyMap());
        then(audit).shouldHaveNoInteractions();
    }

    @Test
    @SuppressWarnings("unchecked")
    void leadCompletionClosesTheTaskAndReturnsAnExplicitOutcome() {
        var before = Map.<String, Object>of("id", 41L, "status", "in_progress");
        var remaining = Map.<String, Object>of("id", 41L, "status", "completed");
        given(queries.completableTask(context.kiosk(), context.employee(), 41L)).willReturn(before);
        given(processTasksService.getTask(7L, 41L)).willReturn(teamTask("lead", "ready"));
        given(queries.listTasks(context.kiosk(), context.employee())).willReturn(List.of(remaining));

        var result = service.complete(
            context, 41L, Map.of("completion_percent", 95, "completion_notes", "Closed"));
        var completed = (Map<String, Object>) result.get("task");

        assertThat(result).containsEntry("action_outcome", "TASK_COMPLETED");
        assertThat(completed)
            .containsEntry("status", "completed")
            .containsEntry("completion_percent", 95)
            .containsEntry("completion_notes", "Closed");
        then(processTasksService).should().completeTask(
            7L, 9L, 41L, Map.of("completionNotes", "Closed", "completionPercent", 95));
        then(processTasksService).should(never()).updateCurrentUserContribution(
            org.mockito.ArgumentMatchers.anyLong(),
            org.mockito.ArgumentMatchers.anyLong(),
            org.mockito.ArgumentMatchers.anyLong(),
            anyMap());
        then(audit).should().record(
            context, 41L, "TASK_COMPLETED",
            Map.of("completion_percent", 95, "has_completion_notes", true));
    }

    @Test
    void individualAssignmentCompletesTheTaskEvenIfItsStoredRoleIsCollaborator() {
        var before = Map.<String, Object>of("id", 41L, "status", "in_progress");
        given(queries.completableTask(context.kiosk(), context.employee(), 41L)).willReturn(before);
        given(processTasksService.getTask(7L, 41L)).willReturn(Map.of(
            "id", 41L,
            "assignmentMode", "individual",
            "assignees", List.of(Map.of(
                "userCompanyId", 19L,
                "role", "collaborator",
                "contributionStatus", "ready"))));
        given(queries.listTasks(context.kiosk(), context.employee())).willReturn(List.of());

        var result = service.complete(context, 41L, Map.of());

        assertThat(result).containsEntry("action_outcome", "TASK_COMPLETED");
        then(processTasksService).should().completeTask(
            7L, 9L, 41L, Map.of("completionNotes", "", "completionPercent", 100));
        then(processTasksService).should(never()).updateCurrentUserContribution(
            org.mockito.ArgumentMatchers.anyLong(),
            org.mockito.ArgumentMatchers.anyLong(),
            org.mockito.ArgumentMatchers.anyLong(),
            anyMap());
    }

    @Test
    @SuppressWarnings({"rawtypes", "unchecked"})
    void nativeEmployeeCreateFixesSelfAssignmentAndAuthoritativeMembershipScope() {
        var nativeContext = nativeContext();
        var visible = Map.<String, Object>of(
            "id", 42L,
            "title", "Inspect equipment",
            "status", "pending");
        given(assignmentScopeService.actorScope(7L, 9L))
            .willReturn(new AssignmentScope(ScopeLevel.BUSINESS, 19L, 9L, 6L, 8L));
        given(processTasksService.createTask(eq(7L), eq(9L), anyMap()))
            .willReturn(Map.of("id", 42L));
        given(queries.visibleTask(nativeContext.kiosk(), nativeContext.employee(), 42L))
            .willReturn(visible);
        given(queries.listTasks(nativeContext.kiosk(), nativeContext.employee()))
            .willReturn(List.of(visible));

        var untrustedPayload = new LinkedHashMap<String, Object>();
        untrustedPayload.put("title", "  Inspect equipment  ");
        untrustedPayload.put("description", "  Safety round  ");
        untrustedPayload.put("priority", "HIGH");
        untrustedPayload.put("due_date", "2030-03-12");
        untrustedPayload.put("assignedUserCompanyId", 999L);
        untrustedPayload.put("assignedName", "Another employee");
        untrustedPayload.put("unitId", 999L);
        untrustedPayload.put("businessId", 999L);
        untrustedPayload.put("processId", 999L);
        untrustedPayload.put("projectId", 999L);
        untrustedPayload.put("notes", "Untrusted notes");
        untrustedPayload.put("attachment_ids", List.of(999L));

        var result = service.createForSelf(nativeContext, untrustedPayload);

        assertThat(result)
            .containsEntry("task", visible)
            .containsEntry("items", List.of(visible));
        var payloadCaptor = ArgumentCaptor.forClass(Map.class);
        then(processTasksService).should().createTask(eq(7L), eq(9L), payloadCaptor.capture());
        var persistedPayload = (Map<String, Object>) payloadCaptor.getValue();
        assertThat(persistedPayload)
            .containsEntry("title", "Inspect equipment")
            .containsEntry("description", "Safety round")
            .containsEntry("priority", "high")
            .containsEntry("dueDate", "2030-03-12")
            .containsEntry("assignedUserCompanyId", 19L)
            .containsEntry("assignedName", "Taylor")
            .containsEntry("unitId", 6L)
            .containsEntry("businessId", 8L)
            .containsEntry("status", "pending")
            .containsEntry("notes", null)
            .containsEntry("processId", null)
            .containsEntry("projectId", null)
            .doesNotContainKeys("attachment_ids");
    }

    @Test
    void nativeEmployeeCreateRejectsContentOutsideTheQuickCaptureContract() {
        assertThatThrownBy(() -> service.createForSelf(
            nativeContext(),
            Map.of("title", "x".repeat(221))))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("220");
        assertThatThrownBy(() -> service.createForSelf(
            nativeContext(),
            Map.of("title", "Inspect", "priority", "urgent")))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("priority");
        assertThatThrownBy(() -> service.createForSelf(
            nativeContext(),
            Map.of("title", "Inspect", "due_date", "tomorrow")))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("ISO date");

        then(processTasksService).shouldHaveNoInteractions();
        then(assignmentScopeService).shouldHaveNoInteractions();
        then(queries).shouldHaveNoInteractions();
        then(audit).shouldHaveNoInteractions();
    }

    @Test
    void agendaUpdateUsesOnlyTheKioskPlacementContractAndReturnsAuthoritativeItems() {
        var before = Map.<String, Object>of(
            "id", 41L,
            "agenda_date", "2026-09-10");
        var updated = Map.<String, Object>of(
            "id", 41L,
            "agenda_date", "2026-09-11",
            "agenda_start_time", "09:30",
            "agenda_end_time", "10:30");
        given(queries.completableTask(context.kiosk(), context.employee(), 41L)).willReturn(before);
        given(queries.visibleTask(context.kiosk(), context.employee(), 41L)).willReturn(updated);
        given(queries.listTasks(context.kiosk(), context.employee())).willReturn(List.of(updated));

        var result = service.updateAgenda(context, 41L, Map.of(
            "agenda_date", "2026-09-11",
            "agenda_start_time", "09:30",
            "agenda_end_time", "10:30",
            "agenda_time_zone", "America/Mexico_City",
            "assignedUserCompanyId", 999L));

        assertThat(result)
            .containsEntry("task", updated)
            .containsEntry("items", List.of(updated));
        then(processTasksService).should().updateAgendaPlacement(7L, 9L, 41L, Map.of(
            "agendaDate", "2026-09-11",
            "agendaStartTime", "09:30",
            "agendaEndTime", "10:30",
            "agendaTimeZone", "America/Mexico_City"));
        then(audit).should().record(context, 41L, "TASK_AGENDA_UPDATED", Map.of(
            "previous_agenda_date", "2026-09-10",
            "agenda_date", "2026-09-11",
            "agenda_start_time", "09:30",
            "agenda_end_time", "10:30"));
    }

    private Map<String, Object> teamTask(String role, String contributionStatus) {
        return Map.of(
            "id", 41L,
            "assignmentMode", "team",
            "assignees", List.of(Map.of(
                "userCompanyId", 19L,
                "role", role,
                "contributionStatus", contributionStatus)));
    }

    private ProcessTaskPublicKioskContext context() {
        var kiosk = new ProcessTaskKioskRow(
            17L, 7L, 2L, "North", 3L, "Retail", "TASKS", "Tasks",
            "active", "active", null, "token", "hint", false, "{}", null, null);
        var employee = new ProcessTaskKioskEmployee(
            19L, 9L, "EMP-19", "Taylor", "Operator", "Operations", "active");
        return new ProcessTaskPublicKioskContext(kiosk, employee);
    }

    private ProcessTaskPublicKioskContext nativeContext() {
        var kiosk = new ProcessTaskKioskRow(
            17L, 7L, null, "", null, "", "INDICE-EMPLOYEE-TOOL-MY-TASKS-V1", "My tasks",
            "active", "ACTIVE", null, "", "", false,
            "{\"tool_key\":\"employee.my-tasks@1\"}", null, null);
        var employee = new ProcessTaskKioskEmployee(
            19L, 9L, "EMP-19", "Taylor", "Operator", "Operations", "active");
        return new ProcessTaskPublicKioskContext(kiosk, employee);
    }
}
