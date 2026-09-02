package com.indice.erp.processTasks.kiosk;

import com.indice.erp.processTasks.tasks.ProcessTaskAssignmentScopeService;
import java.sql.ResultSet;
import java.util.List;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;
import static org.mockito.Mockito.clearInvocations;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;

@ExtendWith(MockitoExtension.class)
class ProcessTaskKioskQueryServiceTest {

    @Mock
    private JdbcTemplate jdbcTemplate;
    @Mock
    private ProcessTaskAssignmentScopeService assignmentScopeService;
    @Mock
    private ResultSet taskResultSet;

    private ProcessTaskKioskQueryService service;

    @BeforeEach
    void setUp() {
        service = new ProcessTaskKioskQueryService(jdbcTemplate, assignmentScopeService);
    }

    @Test
    @SuppressWarnings({"rawtypes", "unchecked"})
    void readyCollaboratorIsProjectedAsContributionAndCannotSubmitAgain() throws Exception {
        givenTaskRow(taskResultSet, 41L, "in_progress", "collaborator", "ready", 2);
        given(jdbcTemplate.query(anyString(), any(RowMapper.class), any(Object[].class)))
            .willAnswer(invocation -> {
                var mapper = (RowMapper) invocation.getArgument(1);
                return List.of(mapper.mapRow(taskResultSet, 0));
            });

        var rows = service.listTasks(kiosk(), employee());

        assertThat(rows).singleElement().satisfies(row -> assertThat(row)
            .containsEntry("current_assignment_role", "collaborator")
            .containsEntry("current_contribution_status", "ready")
            .containsEntry("assignment_mode", "team")
            .containsEntry("team_size", 2)
            .containsEntry("completion_action", "CONTRIBUTION_READY")
            .containsEntry("is_assigned_to_current_user", true)
            .containsEntry("can_complete", false));
        then(jdbcTemplate).should().query(
            contains("LEFT JOIN process_task_assignees current_assignment"),
            any(RowMapper.class),
            eq(19L), eq(7L), eq(7L), eq(9L), eq(19L));
    }

    @Test
    @SuppressWarnings({"rawtypes", "unchecked"})
    void readyLeadRetainsTheTaskCompletionAction() throws Exception {
        givenTaskRow(taskResultSet, 41L, "in_progress", "lead", "ready", 2);
        given(jdbcTemplate.query(anyString(), any(RowMapper.class), any(Object[].class)))
            .willAnswer(invocation -> {
                var mapper = (RowMapper) invocation.getArgument(1);
                return List.of(mapper.mapRow(taskResultSet, 0));
            });

        var rows = service.listTasks(kiosk(), employee());

        assertThat(rows).singleElement().satisfies(row -> assertThat(row)
            .containsEntry("current_assignment_role", "lead")
            .containsEntry("current_contribution_status", "ready")
            .containsEntry("assignment_mode", "team")
            .containsEntry("completion_action", "TASK_COMPLETE")
            .containsEntry("can_complete", true));
    }

    @Test
    @SuppressWarnings({"rawtypes", "unchecked"})
    void individualAssigneeNeverReceivesTheContributionAction() throws Exception {
        givenTaskRow(taskResultSet, 41L, "in_progress", "collaborator", "ready", 1);
        given(jdbcTemplate.query(anyString(), any(RowMapper.class), any(Object[].class)))
            .willAnswer(invocation -> {
                var mapper = (RowMapper) invocation.getArgument(1);
                return List.of(mapper.mapRow(taskResultSet, 0));
            });

        var rows = service.listTasks(kiosk(), employee());

        assertThat(rows).singleElement().satisfies(row -> assertThat(row)
            .containsEntry("assignment_mode", "individual")
            .containsEntry("team_size", 1)
            .containsEntry("completion_action", "TASK_COMPLETE")
            .containsEntry("can_complete", true));
    }

    @Test
    @SuppressWarnings({"rawtypes", "unchecked"})
    void listTasksUsesOneJdbcQueryRegardlessOfTaskCount() throws Exception {
        var oneTask = givenTaskRow(
            mock(ResultSet.class), 41L, "in_progress", "collaborator", "pending", 3);
        var severalTasks = List.of(
            oneTask,
            givenTaskRow(mock(ResultSet.class), 42L, "pending", "lead", "pending", 3),
            givenTaskRow(mock(ResultSet.class), 43L, "completed", "collaborator", "ready", 2),
            givenTaskRow(mock(ResultSet.class), 44L, "paused", "collaborator", "pending", 1)
        );
        var rows = new AtomicReference<List<ResultSet>>(List.of(oneTask));
        given(jdbcTemplate.query(anyString(), any(RowMapper.class), any(Object[].class)))
            .willAnswer(invocation -> {
                var mapper = (RowMapper) invocation.getArgument(1);
                var mapped = new java.util.ArrayList<>();
                for (var index = 0; index < rows.get().size(); index++) {
                    mapped.add(mapper.mapRow(rows.get().get(index), index));
                }
                return mapped;
            });

        assertThat(service.listTasks(kiosk(), employee())).hasSize(1);
        then(jdbcTemplate).should(times(1)).query(
            anyString(), any(RowMapper.class), any(Object[].class));

        clearInvocations(jdbcTemplate);
        rows.set(severalTasks);

        assertThat(service.listTasks(kiosk(), employee())).hasSize(4);
        then(jdbcTemplate).should(times(1)).query(
            anyString(), any(RowMapper.class), any(Object[].class));
    }

    private ResultSet givenTaskRow(
            ResultSet resultSet,
            long taskId,
            String status,
            String assignmentRole,
            String contributionStatus,
            int teamSize) throws Exception {
        given(resultSet.getLong("id")).willReturn(taskId);
        given(resultSet.getObject(anyString(), eq(Long.class))).willAnswer(invocation ->
            "current_assignment_id".equals(invocation.getArgument(0, String.class))
                ? taskId + 1_000L : null);
        given(resultSet.getString(anyString())).willAnswer(invocation -> switch (
                invocation.getArgument(0, String.class)) {
            case "status" -> status;
            case "current_assignment_role" -> assignmentRole;
            case "current_contribution_status" -> contributionStatus;
            default -> null;
        });
        given(resultSet.getInt("current_team_size")).willReturn(teamSize);
        return resultSet;
    }

    private ProcessTaskKioskRow kiosk() {
        return new ProcessTaskKioskRow(
            17L, 7L, null, null, null, null, "TASKS", "Tasks",
            "active", "active", null, "token", "hint", false, "{}", null, null);
    }

    private ProcessTaskKioskEmployee employee() {
        return new ProcessTaskKioskEmployee(
            19L, 9L, "EMP-19", "Taylor", "Operator", "Operations", "active");
    }
}
